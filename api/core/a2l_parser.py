"""
A2L/ASAP2 parser for ECU map definitions
"""

from typing import List, Dict, Optional


def parse_a2l_content(content: str) -> Dict:
    """
    Parse A2L file content and extract map definitions

    Returns dict with 'maps' list containing characteristic and axis definitions
    """
    maps = []
    lines = content.split('\n')

    i = 0
    while i < len(lines):
        line = lines[i].strip()

        if '/begin CHARACTERISTIC' in line:
            char_data = _parse_characteristic_block(lines, i)
            if char_data:
                maps.append(char_data)

        elif '/begin AXIS_PTS' in line:
            axis_data = _parse_axis_pts_block(lines, i)
            if axis_data:
                maps.append(axis_data)

        i += 1

    return {'maps': maps}


def _parse_characteristic_block(lines: List[str], start_idx: int) -> Optional[Dict]:
    """Parse a CHARACTERISTIC block from A2L"""
    i = start_idx + 1
    name, char_type, address, deposit = None, None, None, None
    dimensions = []

    while i < len(lines) and '/end CHARACTERISTIC' not in lines[i]:
        line = lines[i].strip()

        if line.startswith('"') and not name:
            # First line: "Name" Type Address Deposit
            parts = line.split()
            if len(parts) >= 4:
                name = parts[0].strip('"')
                char_type = parts[1]
                try:
                    address = int(parts[2], 16)
                except (ValueError, IndexError):
                    address = 0
                deposit = parts[3]

        elif 'NUMBER' in line and dimensions == []:
            parts = line.split()
            try:
                dimensions.append(int(parts[-1]))
            except (ValueError, IndexError):
                pass

        elif 'MATRIX_DIM' in line:
            parts = line.split()
            for p in parts:
                try:
                    val = int(p)
                    dimensions.append(val)
                except ValueError:
                    pass

        i += 1

    if name and address is not None:
        return {
            'name': name,
            'type': _map_type(char_type or 'VALUE'),
            'address': address,
            'size': _calculate_size(deposit or 'UBYTE', dimensions),
            'dimensions': dimensions if dimensions else None
        }
    return None


def _parse_axis_pts_block(lines: List[str], start_idx: int) -> Optional[Dict]:
    """Parse an AXIS_PTS block from A2L"""
    i = start_idx + 1
    name, address, max_points = None, None, 16

    while i < len(lines) and '/end AXIS_PTS' not in lines[i]:
        line = lines[i].strip()

        if line.startswith('"') and not name:
            parts = line.split()
            if len(parts) >= 5:
                name = parts[0].strip('"')
                try:
                    address = int(parts[1], 16)
                except (ValueError, IndexError):
                    address = 0
                try:
                    max_points = int(parts[4])
                except (ValueError, IndexError):
                    max_points = 16

        i += 1

    if name and address is not None:
        return {
            'name': name,
            'type': 'AXIS',
            'address': address,
            'size': max_points * 4,  # Assuming 4 bytes per point
            'dimensions': [max_points]
        }
    return None


def _map_type(a2l_type: str) -> str:
    """Map A2L characteristic type to standard type"""
    type_map = {
        'VALUE': 'VALUE',
        'MAP': 'MAP',
        'CURVE': 'CURVE',
        'AXIS': 'AXIS',
        'AXIS_PTS': 'AXIS',
        'VAL_BLK': 'VALUE'
    }
    return type_map.get(a2l_type.upper(), 'VALUE')


def _calculate_size(deposit: str, dimensions: List[int]) -> int:
    """Calculate size based on deposit type and dimensions"""
    base_size = {
        'UBYTE': 1, 'SBYTE': 1, 'UINT8': 1, 'INT8': 1,
        'UWORD': 2, 'SWORD': 2, 'UINT16': 2, 'INT16': 2,
        'ULONG': 4, 'SLONG': 4, 'UINT32': 4, 'INT32': 4,
        'FLOAT32_IEEE': 4, 'FLOAT64_IEEE': 8
    }.get(deposit.upper(), 1)

    if not dimensions:
        return base_size

    size = base_size
    for dim in dimensions:
        size *= dim
    return size


def create_sample_a2l() -> str:
    """Generate sample A2L content for demo purposes"""
    return '''
/begin PROJECT TEST_PROJECT "Test ECU Project"
  /begin MODULE MAIN_MODULE "Main ECU Module"
    /begin MOD_PAR
      ECU_NAME "SimulatedECU"
      CPU_TYPE "PPC"
    /end MOD_PAR

    /begin CHARACTERISTIC
      "Engine_Speed_Limit" VALUE 0x1234 UWORD 1
      /begin ANNOTATION
        "Maximum engine speed in RPM"
      /end ANNOTATION
    /end CHARACTERISTIC

    /begin CHARACTERISTIC
      "Fuel_Map" MAP 0x5000 UWORD
        /begin MAP古镇
          16 16
        /end MAP古镇
    /end CHARACTERISTIC

    /begin CHARACTERISTIC
      "Ignition_Map" MAP 0x6000 UBYTE 12 12
    /end CHARACTERISTIC

    /begin CHARACTERISTIC
      "Idle_Speed" VALUE 0x1238 UWORD 1
    /end CHARACTERISTIC

    /begin CHARACTERISTIC
      "Throttle_Position" VALUE 0x1240 UBYTE 1
    /end CHARACTERISTIC

    /begin AXIS_PTS
      "RPM_Axis" 0x4000 UWORD 16
    /end AXIS_PTS

    /begin AXIS_PTS
      "Load_Axis" 0x4100 UWORD 16
    /end AXIS_PTS

    /begin COMPU_METHOD
      "RPM_CONV" LINEAR "rpm"
        COEFFS LINEAR 1.0 0.0 0.0
    /end COMPU_METHOD

    /begin COMPU_METHOD
      "PERCENT_CONV" LINEAR "%"
        COEFFS LINEAR 0.390625 0.0 0.0
    /end COMPU_METHOD
  /end MODULE
/end PROJECT
'''.strip()
