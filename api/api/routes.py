"""
API routes for ECU Binary Compare
"""

import sys
import os
from flask import Blueprint, request, jsonify
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.comparison import compare_binary_files, compute_md5, format_hex_bytes
from core.a2l_parser import parse_a2l_content, create_sample_a2l
from core.generator import generate_sample_binary, generate_modified_binary


api_bp = Blueprint('api', __name__)


# =============================================================================
# WinOLS Export Models
# =============================================================================

def create_ols_map(map_def: dict, data_a: bytes, data_b: bytes, differences: list) -> dict:
    """
    Create WinOLS-compatible OlsMap structure from map definition

    WinOLS expects JSON with specific field names:
    - Name: Map identifier
    - Type: eZweidim (2D), eDreidim (3D), eCurve (1D)
    - DataOrg: eLoHi (little-endian)
    - etc.
    """
    name = map_def.get('name', '')
    map_type = map_def.get('type', 'VALUE')
    address = map_def.get('address', 0)
    size = map_def.get('size', 1)
    dimensions = map_def.get('dim') or map_def.get('dimensions') or []

    # Determine WinOLS type
    if map_type == 'VALUE':
        ols_type = 'eCurve'
    elif map_type == 'MAP':
        ols_type = 'eDreidim'
    elif map_type == 'CURVE':
        ols_type = 'eZweidim'
    else:
        ols_type = 'eZweidim'

    # Get rows/columns from dimensions
    if len(dimensions) >= 2:
        rows = str(dimensions[0])
        columns = str(dimensions[1])
    elif len(dimensions) == 1:
        rows = str(dimensions[0])
        columns = '1'
    else:
        rows = '1'
        columns = '1'

    # Find difference for this map
    diff_info = {}
    for diff in differences:
        if diff.get('parameter') == name:
            bytes_a = diff.get('bytes_a', [])
            bytes_b = diff.get('bytes_b', [])
            if bytes_a and bytes_b:
                # Calculate values
                val_a = 0
                val_b = 0
                for i, b in enumerate(bytes_a[:4]):
                    val_a |= b << (i * 8)
                for i, b in enumerate(bytes_b[:4]):
                    val_b |= b << (i * 8)
                diff_info = {
                    'old_value': val_a,
                    'new_value': val_b,
                    'change': val_b - val_a
                }
            break

    # Build WinOLS format
    ols_map = {
        "Name": name,
        "FolderName": "/",
        "Type": ols_type,
        "DataOrg": "eLoHi",
        "bSigned": "1",
        "Columns": columns,
        "Rows": rows,
        "Radix": "10",
        "Comment": "0",
        "Precision": "2",
        "Fieldvalues": {
            "Name": name,
            "Unit": "0",
            "Factor": "1.0",
            "Offset": "0.0",
            "StartAddr": f"0x{address:X}"
        },
        "AxisX": {
            "Name": "X_Axis",
            "Unit": "0",
            "Factor": "1.0",
            "Offset": "0.0",
            "Radix": "10",
            "bSigned": "1",
            "Precision": "2",
            "DataSrc": "eRom",
            "DataHeader": "4",
            "DataAddr": "0",
            "DataOrg": "eLoHi"
        },
        "AxisY": {
            "Name": "Y_Axis",
            "Unit": "0",
            "Factor": "1.0",
            "Offset": "0.0",
            "Radix": "10",
            "bSigned": "1",
            "Precision": "2",
            "DataSrc": "eRom",
            "DataHeader": "4",
            "DataAddr": "0",
            "DataOrg": "eLoHi"
        }
    }

    # Add change info if available
    if diff_info:
        ols_map["_comparison"] = diff_info

    return ols_map


@api_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ECU Binary Compare API',
        'version': '1.0.0'
    })


@api_bp.route('/compare', methods=['POST'])
def compare_files():
    """
    Compare two binary files

    POST /api/compare
    Content-Type: multipart/form-data
      - file_a: Binary file (original)
      - file_b: Binary file (modified)

    Returns JSON with comparison results
    """
    if 'file_a' not in request.files or 'file_b' not in request.files:
        return jsonify({'error': 'Both file_a and file_b are required'}), 400

    file_a = request.files['file_a']
    file_b = request.files['file_b']

    data_a = file_a.read()
    data_b = file_b.read()

    # Compare files
    differences = compare_binary_files(data_a, data_b)

    # Calculate statistics
    total_bytes = max(len(data_a), len(data_b))
    bytes_changed = sum(d['length'] for d in differences)

    # Build response
    result = {
        'metadata': {
            'tool': 'ECU Binary Compare API',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat(),
            'file_a': {
                'name': file_a.filename,
                'size': len(data_a),
                'md5': compute_md5(data_a)
            },
            'file_b': {
                'name': file_b.filename,
                'size': len(data_b),
                'md5': compute_md5(data_b)
            }
        },
        'statistics': {
            'total_bytes': total_bytes,
            'bytes_changed': bytes_changed,
            'percent_changed': round((bytes_changed / total_bytes * 100), 4) if total_bytes > 0 else 0
        },
        'differences': _format_differences(differences)
    }

    return jsonify(result)


@api_bp.route('/compare-with-maps', methods=['POST'])
def compare_with_maps():
    """
    Compare binary files with optional A2L map definitions

    POST /api/compare-with-maps
    Content-Type: multipart/form-data
      - file_a: Binary file (original)
      - file_b: Binary file (modified)
      - a2l_file: Optional A2L definition file
    """
    if 'file_a' not in request.files or 'file_b' not in request.files:
        return jsonify({'error': 'Both file_a and file_b are required'}), 400

    file_a = request.files['file_a']
    file_b = request.files['file_b']

    data_a = file_a.read()
    data_b = file_b.read()

    # Parse A2L if provided
    maps = []
    if 'a2l_file' in request.files and request.files['a2l_file'].filename:
        a2l_content = request.files['a2l_file'].read().decode('utf-8', errors='ignore')
        parsed = parse_a2l_content(a2l_content)
        maps = parsed.get('maps', [])

    # Compare files
    differences = compare_binary_files(data_a, data_b)

    # Map differences to parameters
    for diff in differences:
        for map_def in maps:
            addr = map_def.get('address', 0)
            size = map_def.get('size', 1)
            if addr <= diff['offset'] < addr + size:
                diff['parameter'] = map_def['name']
                diff['parameter_type'] = map_def['type']
                diff['parameter_address'] = f"0x{addr:04X}"
                break

    # Calculate statistics
    total_bytes = max(len(data_a), len(data_b))
    bytes_changed = sum(d['length'] for d in differences)
    params_changed = len(set(d.get('parameter') for d in differences if d.get('parameter')))

    # Build response
    result = {
        'metadata': {
            'tool': 'ECU Binary Compare API',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat(),
            'file_a': {
                'name': file_a.filename,
                'size': len(data_a),
                'md5': compute_md5(data_a)
            },
            'file_b': {
                'name': file_b.filename,
                'size': len(data_b),
                'md5': compute_md5(data_b)
            }
        },
        'statistics': {
            'total_bytes': total_bytes,
            'bytes_changed': bytes_changed,
            'parameters_changed': params_changed,
            'percent_changed': round((bytes_changed / total_bytes * 100), 4) if total_bytes > 0 else 0
        },
        'maps': maps,
        'differences': _format_differences(differences)
    }

    return jsonify(result)


@api_bp.route('/demo', methods=['GET'])
def demo_comparison():
    """
    Generate demo comparison with sample ECU data

    GET /api/demo
    Returns pre-computed comparison with realistic ECU parameters
    """
    original = generate_sample_binary()
    modified = generate_modified_binary(original)

    differences = compare_binary_files(original, modified)

    # Parse sample A2L
    sample_a2l = create_sample_a2l()
    parsed = parse_a2l_content(sample_a2l)
    maps = parsed.get('maps', [])

    # Map differences to parameters
    for diff in differences:
        for map_def in maps:
            addr = map_def.get('address', 0)
            size = map_def.get('size', 1)
            if addr <= diff['offset'] < addr + size:
                diff['parameter'] = map_def['name']
                diff['parameter_type'] = map_def['type']
                break

    # Calculate statistics
    total_bytes = len(original)
    bytes_changed = sum(d['length'] for d in differences)
    params_changed = len(set(d.get('parameter') for d in differences if d.get('parameter')))

    # Build response
    result = {
        'metadata': {
            'tool': 'ECU Binary Compare API',
            'version': '1.0.0',
            'timestamp': datetime.now().isoformat(),
            'description': 'Demo comparison with simulated ECU calibration data',
            'file_a': {
                'name': 'original.bin',
                'size': len(original),
                'md5': compute_md5(original)
            },
            'file_b': {
                'name': 'modified.bin',
                'size': len(modified),
                'md5': compute_md5(modified)
            }
        },
        'statistics': {
            'total_bytes': total_bytes,
            'bytes_changed': bytes_changed,
            'parameters_changed': params_changed,
            'percent_changed': round((bytes_changed / total_bytes * 100), 4)
        },
        'maps': maps,
        'differences': _format_differences(differences)
    }

    return jsonify(result)


@api_bp.route('/parse-a2l', methods=['POST'])
def parse_a2l():
    """
    Parse an A2L file and return map definitions

    POST /api/parse-a2l
    Content-Type: multipart/form-data
      - file: A2L file to parse
    """
    if 'file' not in request.files:
        return jsonify({'error': 'A2L file is required'}), 400

    content = request.files['file'].read().decode('utf-8', errors='ignore')
    result = parse_a2l_content(content)

    return jsonify({
        'filename': request.files['file'].filename,
        'maps': result.get('maps', []),
        'total_maps': len(result.get('maps', []))
    })


@api_bp.route('/parse-winols-csv', methods=['POST'])
def parse_winols_csv():
    """
    Parse WinOLS CSV export file and return map definitions

    POST /api/parse-winols-csv
    Content-Type: multipart/form-data
      - file: WinOLS CSV file to parse
    """
    if 'file' not in request.files:
        return jsonify({'error': 'CSV file is required'}), 400

    content = request.files['file'].read().decode('utf-8', errors='ignore')
    maps = parse_winols_csv_content(content)

    return jsonify({
        'filename': request.files['file'].filename,
        'maps': maps,
        'total_maps': len(maps)
    })


@api_bp.route('/parse-kp', methods=['POST'])
def parse_kp():
    """
    Parse WinOLS KP (project) file and return map definitions and metadata

    POST /api/parse-kp
    Content-Type: multipart/form-data
      - file: WinOLS KP file to parse
    """
    if 'file' not in request.files:
        return jsonify({'error': 'KP file is required'}), 400

    data = request.files['file'].read()
    result = parse_kp_content(data)

    return jsonify({
        'filename': request.files['file'].filename,
        'maps': result.get('maps', []),
        'metadata': result.get('metadata', {}),
        'total_maps': len(result.get('maps', []))
    })


def parse_winols_csv_content(content: str) -> list:
    """
    Parse WinOLS CSV export format to extract map definitions

    CSV Format (semicolon separated):
    Name;IdName;FolderName;Type;ViewMode;RWin;DataOrg;...;Fieldvalues.StartAddr;AxisX...;AxisY...

    Example row:
    Map ""Bosch II 16"";;My maps;eZweidim;eViewText;eBars;eHiLo;0;0;0;0;0;0;8;16;10;;0;0;0;-;-;1;0;$1866E0;...
    """
    maps = []
    lines = content.strip().split('\n')

    if len(lines) < 2:
        return maps

    # Parse header to find column indices
    header = lines[0].split(';')

    # Column indices (based on WinOLS CSV format)
    col_map = {
        'Name': None, 'FolderName': None, 'Type': None, 'DataOrg': None,
        'bSigned': None, 'Columns': None, 'Rows': None, 'Radix': None,
        'Fieldvalues_StartAddr': None, 'AxisX_DataAddr': None, 'AxisY_DataAddr': None
    }

    for i, col in enumerate(header):
        col_lower = col.lower().strip()
        if 'name' == col_lower and col_map['Name'] is None:
            col_map['Name'] = i
        elif 'foldername' in col_lower:
            col_map['FolderName'] = i
        elif 'type' == col_lower:
            col_map['Type'] = i
        elif 'dataorg' == col_lower:
            col_map['DataOrg'] = i
        elif 'bsigned' == col_lower:
            col_map['bSigned'] = i
        elif 'columns' == col_lower:
            col_map['Columns'] = i
        elif 'rows' == col_lower:
            col_map['Rows'] = i
        elif 'radix' == col_lower:
            col_map['Radix'] = i
        elif 'fieldvalues.startaddr' in col_lower.replace('_', ''):
            col_map['Fieldvalues_StartAddr'] = i
        elif 'axisx.dataaddr' in col_lower.replace('_', ''):
            col_map['AxisX_DataAddr'] = i
        elif 'axisy.dataaddr' in col_lower.replace('_', ''):
            col_map['AxisY_DataAddr'] = i

    # Parse data rows
    for line in lines[1:]:
        if not line.strip():
            continue

        parts = line.split(';')

        try:
            # Extract values
            name = _get_csv_value(parts, col_map['Name'], 'Map').strip('"')
            folder = _get_csv_value(parts, col_map['FolderName'], 'My maps')
            map_type_str = _get_csv_value(parts, col_map['Type'], 'eZweidim')
            data_org = _get_csv_value(parts, col_map['DataOrg'], 'eHiLo')
            b_signed = _get_csv_value(parts, col_map['bSigned'], '0')

            # Parse type - WinOLS map types
            # eEindim = 1D (single value)
            # eZweidim = 2D (table/map)
            # eDreidim = 3D (cube)
            if 'eindim' in map_type_str.lower():
                map_type = 'VALUE'
            elif 'zweidim' in map_type_str.lower():
                map_type = 'MAP'
            elif 'dreidim' in map_type_str.lower():
                map_type = 'MAP3D'
            elif 'curve' in map_type_str.lower():
                map_type = 'CURVE'
            else:
                map_type = 'VALUE'

            # Parse dimensions
            try:
                columns = int(_get_csv_value(parts, col_map['Columns'], '1'))
                rows = int(_get_csv_value(parts, col_map['Rows'], '1'))
            except (ValueError, TypeError):
                columns = 1
                rows = 1

            # Ensure reasonable dimensions (WinOLS maps typically 1-30 columns/rows)
            columns = max(1, min(columns, 50))  # Clamp to reasonable range
            rows = max(1, min(rows, 50))

            # Parse address - WinOLS uses $ prefix or plain hex
            addr_str = _get_csv_value(parts, col_map['Fieldvalues_StartAddr'], '$0')
            address = parse_hex_address(addr_str)

            # Parse axis addresses
            x_addr_str = _get_csv_value(parts, col_map['AxisX_DataAddr'], '$0')
            y_addr_str = _get_csv_value(parts, col_map['AxisY_DataAddr'], '$0')
            x_addr = parse_hex_address(x_addr_str)
            y_addr = parse_hex_address(y_addr_str)

            # Determine data size based on type
            # eByte = 1 byte, eWord/eShort = 2 bytes, eLong = 4 bytes
            if 'byte' in data_org.lower():
                bytes_per_value = 1
            elif 'word' in data_org.lower():
                bytes_per_value = 2
            else:
                bytes_per_value = 2  # Default to 16-bit (most common in ECUs)

            # Calculate total size
            size = columns * rows * bytes_per_value

            # Create clean name from WinOLS format
            # Remove quotes and clean up
            clean_name = name.replace('""', '"').strip()
            if not clean_name or clean_name == 'Map':
                clean_name = f'Map_{address:06X}'

            map_def = {
                'name': clean_name,
                'type': map_type,
                'address': address,
                'address_hex': f'0x{address:06X}',
                'size': size,
                'bytes_per_value': bytes_per_value,
                'dimensions': [rows, columns],
                'dim': [rows, columns],
                'columns': columns,
                'rows': rows,
                'folder': folder if folder and folder != '-' else 'Root',
                'data_org': data_org,
                'x_axis_addr': x_addr,
                'y_axis_addr': y_addr,
                'x_axis_hex': f'0x{x_addr:06X}' if x_addr else None,
                'y_axis_hex': f'0x{y_addr:06X}' if y_addr else None,
                'radix': _get_csv_value(parts, col_map['Radix'], '10'),
                'signed': b_signed == '1'
            }
            maps.append(map_def)

        except Exception as e:
            continue  # Skip malformed rows

    return maps


def parse_kp_content(data: bytes) -> dict:
    """
    Parse WinOLS KP (project) file

    KP files are WinOLS-specific binary/ZIP format that contains encrypted
    internal data structures. Parsing is not reliable outside WinOLS.

    Recommendation: Use WinOLS CSV export instead for map definitions.

    This parser extracts basic metadata and file structure info only.
    """
    import zipfile
    import io

    maps = []
    metadata = {
        'total_bytes': len(data),
        'format': 'winols_kp',
        'note': 'KP files are WinOLS-specific. Use CSV export for reliable map data.',
        'suggestion': 'Export maps from WinOLS as CSV and load that instead.'
    }

    try:
        # Try to open as ZIP (KP files may be ZIP archives)
        zip_buffer = io.BytesIO(data)
        with zipfile.ZipFile(zip_buffer, 'r') as zf:
            file_list = zf.namelist()
            metadata['zip_contents'] = file_list
            metadata['files_in_archive'] = len(file_list)

            # Try to extract basic info from intern file if present
            for name in file_list:
                if 'intern' in name.lower():
                    try:
                        intern_data = zf.read(name).decode('utf-8', errors='ignore')
                        # Check if it's actually readable
                        if len(intern_data) > 100:
                            metadata['intern_readable'] = True
                            metadata['intern_size'] = len(intern_data)
                    except:
                        metadata['intern_readable'] = False

                if 'hexdump' in name.lower():
                    try:
                        hex_data = zf.read(name)
                        metadata['hexdump_size'] = len(hex_data)
                    except:
                        pass

    except zipfile.BadZipFile:
        # Not a ZIP file - KP files are often just binary
        metadata['is_binary'] = True
        metadata['note'] = 'KP file appears to be binary format, not parseable outside WinOLS.'

        # Check file signature
        if len(data) >= 4:
            sig = data[:4]
            metadata['file_signature'] = sig.hex().upper()

    return {
        'maps': maps,  # Empty - KP files not reliably parseable
        'metadata': metadata
    }


def _parse_kp_intern(content: str) -> list:
    """Parse KP intern file content"""
    maps = []

    # This is a simplified parser - WinOLS intern format is complex
    # Looking for map definitions in the XML-like structure

    lines = content.split('\n')
    for line in lines:
        line = line.strip()
        # Look for map name patterns
        if 'Name' in line or 'Map' in line or 'addr' in line.lower():
            # Extract potential map info
            # This is a placeholder - actual KP parsing requires more complex logic
            pass

    return maps


def _get_csv_value(parts: list, index: int, default: str) -> str:
    """Safely get CSV value at index"""
    if index is not None and 0 <= index < len(parts):
        return parts[index].strip()
    return default


def parse_hex_address(addr_str: str) -> int:
    """Parse hexadecimal address string like $1866E0 or 0x1866E0"""
    addr_str = addr_str.strip()
    if addr_str.startswith('$'):
        return int(addr_str[1:], 16)
    elif addr_str.startswith('0x') or addr_str.startswith('0X'):
        return int(addr_str[2:], 16)
    else:
        try:
            return int(addr_str, 16)
        except ValueError:
            return 0


def _format_differences(differences):
    """Format differences for JSON output"""
    formatted = []
    for d in differences:
        formatted.append({
            'offset': f"0x{d['offset']:04X}",
            'offset_decimal': d['offset'],
            'length': d['length'],
            'change_type': d['change_type'],
            'file_a_bytes': format_hex_bytes(d.get('bytes_a', []), d['length']),
            'file_b_bytes': format_hex_bytes(d.get('bytes_b', []), d['length']),
            'parameter': d.get('parameter'),
            'parameter_type': d.get('parameter_type')
        })
    return formatted


# =============================================================================
# WinOLS Export Endpoint
# =============================================================================

@api_bp.route('/export/winols', methods=['POST'])
def export_winols():
    """
    Export comparison as WinOLS-compatible JSON

    POST /api/export/winols
    Content-Type: application/json

    Body should contain comparison result from /compare-with-maps
    Returns JSON in WinOLS OlsMap format
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    maps = data.get('maps', [])
    differences = data.get('differences', [])
    metadata = data.get('metadata', {})

    # Create WinOLS OlsMap list
    ols_maps = []
    for map_def in maps:
        ols_map = create_ols_map(map_def, b'', b'', differences)
        ols_maps.append(ols_map)

    # Build WinOLS export structure
    winols_export = {
        "OlsProject": {
            "ProjectName": metadata.get('file_a', {}).get('name', 'ECU_Compare'),
            "ProjectDescription": f"Comparison of {metadata.get('file_a', {}).get('name', 'file A')} vs {metadata.get('file_b', {}).get('name', 'file B')}",
            "Created": datetime.now().isoformat(),
            "Tool": "ECU Binary Compare API",
            "Version": "1.0.0"
        },
        "Maps": ols_maps,
        "Statistics": data.get('statistics', {}),
        "ChangedOnly": False
    }

    return jsonify(winols_export)


@api_bp.route('/export/winols-changed', methods=['POST'])
def export_winols_changed():
    """
    Export only changed parameters as WinOLS-compatible JSON

    POST /api/export/winols-changed
    Content-Type: application/json

    Body should contain comparison result from /compare-with-maps
    Returns JSON with only maps that have changes
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    maps = data.get('maps', [])
    differences = data.get('differences', [])
    metadata = data.get('metadata', {})

    # Get set of changed parameter names
    changed_params = set(d.get('parameter') for d in differences if d.get('parameter'))

    # Create WinOLS OlsMap list - only changed maps
    ols_maps = []
    for map_def in maps:
        if map_def.get('name') in changed_params:
            ols_map = create_ols_map(map_def, b'', b'', differences)
            ols_maps.append(ols_map)

    # Build WinOLS export structure
    winols_export = {
        "OlsProject": {
            "ProjectName": f"{metadata.get('file_a', {}).get('name', 'ECU')}_Changes",
            "ProjectDescription": f"Changed parameters from comparison of {metadata.get('file_a', {}).get('name', 'file A')} vs {metadata.get('file_b', {}).get('name', 'file B')}",
            "Created": datetime.now().isoformat(),
            "Tool": "ECU Binary Compare API",
            "Version": "1.0.0"
        },
        "Maps": ols_maps,
        "Statistics": {
            "total_maps": len(maps),
            "changed_maps": len(ols_maps),
            **data.get('statistics', {})
        },
        "ChangedOnly": True
    }

    return jsonify(winols_export)
