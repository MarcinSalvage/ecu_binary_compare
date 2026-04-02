// Export functionality - JSON, CSV, HTML formats

import type { ComparisonResult, ExportOptions, Difference, MapDefinition, BinaryFile } from '../types';
import { applyConversion } from './a2l-parser';

// Main export function
export function exportDifferences(
  result: ComparisonResult,
  options: ExportOptions
): string {
  switch (options.format) {
    case 'json':
      return exportToJSON(result, options);
    case 'csv':
      return exportToCSV(result, options);
    case 'html':
      return exportToHTML(result, options);
    default:
      return exportToJSON(result, options);
  }
}

// JSON Export
interface JSONOutput {
  metadata: {
    tool: string;
    version: string;
    timestamp: string;
    fileA: { name: string; size: number; md5: string };
    fileB: { name: string; size: number; md5: string };
  };
  statistics: ComparisonResult['stats'];
  differences: Record<string, unknown>[];
  maps: Record<string, unknown>[];
}

function exportToJSON(result: ComparisonResult, options: ExportOptions): string {
  const output: JSONOutput = {
    metadata: {
      tool: 'ECU Binary Compare',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      fileA: {
        name: result.fileA.name,
        size: result.fileA.size,
        md5: result.fileA.md5
      },
      fileB: {
        name: result.fileB.name,
        size: result.fileB.size,
        md5: result.fileB.md5
      }
    },
    statistics: result.stats,
    differences: [],
    maps: []
  };

  // Filter differences based on options
  const filteredDiffs = options.includeUnchanged
    ? result.differences
    : result.differences.filter(d => d.changeType !== 'EQUAL');

  for (const diff of filteredDiffs) {
    const diffEntry: Record<string, unknown> = {
      offset: '0x' + diff.offset.toString(16).toUpperCase().padStart(8, '0'),
      offsetDecimal: diff.offset,
      length: diff.length,
      changeType: diff.changeType,
      fileA_bytes: options.includeRawData ? bytesToHex(diff.fileA) : undefined,
      fileB_bytes: options.includeRawData ? bytesToHex(diff.fileB) : undefined
    };

    if (diff.mappedTo) {
      diffEntry.parameter = diff.mappedTo.name;
      diffEntry.parameterType = diff.mappedTo.type;
      diffEntry.address = '0x' + diff.mappedTo.address.toString(16).toUpperCase();
      diffEntry.size = diff.mappedTo.size;

      // Calculate physical values if conversion available
      if (diff.fileA.length > 0) {
        const rawA = readNumericValue(diff.fileA);
        const rawB = readNumericValue(diff.fileB);

        if (rawA !== null && rawB !== null) {
          const physA = applyConversion(rawA, findCompuMethod(diff.mappedTo.compuMethod, result.maps));
          const physB = applyConversion(rawB, findCompuMethod(diff.mappedTo.compuMethod, result.maps));

          diffEntry.fileA_value = {
            raw: '0x' + rawA.toString(16).toUpperCase(),
            physical: physA.toFixed(2)
          };
          diffEntry.fileB_value = {
            raw: '0x' + rawB.toString(16).toUpperCase(),
            physical: physB.toFixed(2)
          };
          diffEntry.delta = {
            absolute: physB - physA,
            percent: physA !== 0 ? ((physB - physA) / physA) * 100 : 0
          };
        }
      }
    }

    output.differences.push(diffEntry);
  }

  // Include map data if requested
  if (options.includeMaps) {
    for (const map of result.maps) {
      const mapEntry: Record<string, unknown> = {
        name: map.name,
        type: map.type,
        address: '0x' + map.address.toString(16).toUpperCase(),
        size: map.size,
        dimensions: map.dimensions
      };

      if (options.includeRawData && result.fileA.data && result.fileB.data) {
        const aData = result.fileA.data.slice(map.address, map.address + map.size);
        const bData = result.fileB.data.slice(map.address, map.address + map.size);

        mapEntry.fileA_bytes = bytesToHex(aData);
        mapEntry.fileB_bytes = bytesToHex(bData);
      }

      output.maps.push(mapEntry);
    }
  }

  return JSON.stringify(output, null, 2);
}

// CSV Export
function exportToCSV(result: ComparisonResult, options: ExportOptions): string {
  const lines: string[] = [];

  // Header
  lines.push('Offset,Length,Change Type,Parameter,Parameter Type,Address,Size,File A Value,File B Value,Delta,Delta %');

  // Filter differences
  const filteredDiffs = options.includeUnchanged
    ? result.differences
    : result.differences.filter(d => d.changeType !== 'EQUAL');

  for (const diff of filteredDiffs) {
    const offset = '0x' + diff.offset.toString(16).toUpperCase().padStart(8, '0');
    const length = diff.length.toString();
    const changeType = diff.changeType;

    let paramName = '';
    let paramType = '';
    let addr = '';
    let size = '';
    let fileAVal = '';
    let fileBVal = '';
    let delta = '';
    let deltaPct = '';

    if (diff.mappedTo) {
      paramName = escapeCSV(diff.mappedTo.name);
      paramType = diff.mappedTo.type;
      addr = '0x' + diff.mappedTo.address.toString(16).toUpperCase();
      size = diff.mappedTo.size.toString();

      const rawA = readNumericValue(diff.fileA);
      const rawB = readNumericValue(diff.fileB);

      if (rawA !== null && rawB !== null) {
        const physA = applyConversion(rawA, findCompuMethod(diff.mappedTo.compuMethod, result.maps));
        const physB = applyConversion(rawB, findCompuMethod(diff.mappedTo.compuMethod, result.maps));

        fileAVal = physA.toFixed(4);
        fileBVal = physB.toFixed(4);
        delta = (physB - physA).toFixed(4);
        deltaPct = physA !== 0 ? (((physB - physA) / physA) * 100).toFixed(2) : '0';
      }
    }

    lines.push([
      offset, length, changeType, paramName, paramType,
      addr, size, fileAVal, fileBVal, delta, deltaPct
    ].join(','));
  }

  // Add statistics at the end
  lines.push('');
  lines.push('Statistics');
  lines.push('Total Bytes,' + result.stats.totalBytes);
  lines.push('Bytes Changed,' + result.stats.bytesChanged);
  lines.push('Parameters Changed,' + result.stats.paramsChanged);
  lines.push('Percent Changed,' + result.stats.percentChanged.toFixed(4));

  return lines.join('\n');
}

// HTML Export
function exportToHTML(result: ComparisonResult, options: ExportOptions): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ECU Binary Comparison Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0f1419;
      color: #e2e8f0;
      padding: 2rem;
      line-height: 1.6;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #3b82f6; margin-bottom: 1rem; }
    h2 { color: #94a3b8; margin: 1.5rem 0 1rem; border-bottom: 1px solid #2d3748; padding-bottom: 0.5rem; }
    .meta { background: #1a2332; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .meta-item label { display: block; color: #64748b; font-size: 0.75rem; text-transform: uppercase; }
    .meta-item span { font-size: 1rem; font-weight: 500; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #1a2332; border-radius: 8px; padding: 1rem; text-align: center; }
    .stat-value { font-size: 1.5rem; font-weight: 600; }
    .stat-label { color: #64748b; font-size: 0.75rem; text-transform: uppercase; }
    .stat-card.changed .stat-value { color: #ef4444; }
    .stat-card.percent .stat-value { color: #eab308; }
    table { width: 100%; border-collapse: collapse; background: #1a2332; border-radius: 8px; overflow: hidden; }
    th { background: #242d3d; text-align: left; padding: 0.75rem; font-weight: 500; color: #94a3b8; }
    td { padding: 0.75rem; border-bottom: 1px solid #2d3748; font-family: 'JetBrains Mono', monospace; font-size: 0.875rem; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #242d3d; }
    .type-added { color: #22c55e; }
    .type-removed { color: #ef4444; }
    .type-modified { color: #eab308; }
    .type-value { color: #a855f7; }
    .type-map { color: #3b82f6; }
    .type-axis { color: #06b6d4; }
    .footer { margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #2d3748; color: #64748b; font-size: 0.75rem; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>ECU Binary Comparison Report</h1>

    <div class="meta">
      <div class="meta-grid">
        <div class="meta-item">
          <label>File A</label>
          <span>${escapeHTML(result.fileA.name)}</span>
        </div>
        <div class="meta-item">
          <label>File A Size</label>
          <span>${formatBytes(result.fileA.size)}</span>
        </div>
        <div class="meta-item">
          <label>File B</label>
          <span>${escapeHTML(result.fileB.name)}</span>
        </div>
        <div class="meta-item">
          <label>File B Size</label>
          <span>${formatBytes(result.fileB.size)}</span>
        </div>
        <div class="meta-item">
          <label>Generated</label>
          <span>${new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${result.stats.totalBytes.toLocaleString()}</div>
        <div class="stat-label">Total Bytes</div>
      </div>
      <div class="stat-card changed">
        <div class="stat-value">${result.stats.bytesChanged.toLocaleString()}</div>
        <div class="stat-label">Bytes Changed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${result.stats.paramsChanged}</div>
        <div class="stat-label">Parameters</div>
      </div>
      <div class="stat-card percent">
        <div class="stat-value">${result.stats.percentChanged.toFixed(3)}%</div>
        <div class="stat-label">Changed</div>
      </div>
    </div>

    <h2>Differences</h2>
    <table>
      <thead>
        <tr>
          <th>Offset</th>
          <th>Length</th>
          <th>Type</th>
          <th>Parameter</th>
          <th>File A</th>
          <th>File B</th>
          <th>Delta</th>
        </tr>
      </thead>
      <tbody>
        ${generateDiffRows(result, options)}
      </tbody>
    </table>

    <div class="footer">
      Generated by ECU Binary Compare Tool
    </div>
  </div>
</body>
</html>`;

  return html;
}

// Helper functions
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join('');
}

function readNumericValue(bytes: Uint8Array): number | null {
  if (bytes.length === 0) return null;

  if (bytes.length === 1) return bytes[0];
  if (bytes.length === 2) return bytes[0] | (bytes[1] << 8);
  if (bytes.length === 4) return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);

  // For longer arrays, just return first 4 bytes
  return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
}

function findCompuMethod(name: string | undefined, maps: MapDefinition[]): undefined {
  // In a full implementation, this would look up the compu method by name
  return undefined;
}

function escapeCSV(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function generateDiffRows(result: ComparisonResult, options: ExportOptions): string {
  const filteredDiffs = options.includeUnchanged
    ? result.differences
    : result.differences.filter(d => d.changeType !== 'EQUAL');

  if (filteredDiffs.length === 0) {
    return '<tr><td colspan="7" style="text-align:center;color:#64748b;">No differences found</td></tr>';
  }

  return filteredDiffs.map(diff => {
    const offset = '0x' + diff.offset.toString(16).toUpperCase().padStart(8, '0');
    const changeClass = 'type-' + diff.changeType.toLowerCase();

    let paramName = '-';
    let paramType = '-';
    let fileAVal = '-';
    let fileBVal = '-';
    let delta = '-';

    if (diff.mappedTo) {
      paramName = escapeHTML(diff.mappedTo.name);
      paramType = `<span class="type-${diff.mappedTo.type.toLowerCase()}">${diff.mappedTo.type}</span>`;

      const rawA = readNumericValue(diff.fileA);
      const rawB = readNumericValue(diff.fileB);

      if (rawA !== null && rawB !== null) {
        fileAVal = '0x' + rawA.toString(16).toUpperCase();
        fileBVal = '0x' + rawB.toString(16).toUpperCase();
        const deltaVal = rawB - rawA;
        delta = (deltaVal >= 0 ? '+' : '') + deltaVal;
      }
    }

    return `<tr>
      <td>${offset}</td>
      <td>${diff.length}</td>
      <td class="${changeClass}">${diff.changeType}</td>
      <td>${paramName}</td>
      <td>${fileAVal}</td>
      <td>${fileBVal}</td>
      <td>${delta}</td>
    </tr>`;
  }).join('\n');
}

// Trigger file download
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getExportFilename(
  originalName: string,
  format: ExportOptions['format']
): string {
  const baseName = originalName.replace(/\.[^/.]+$/, '');
  const timestamp = new Date().toISOString().slice(0, 10);
  return `${baseName}_diff_${timestamp}.${format}`;
}
