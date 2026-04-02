// Binary Comparison Engine
import type { BinaryFile, Difference, MapDefinition, ComparisonResult } from '../types';

export function computeMD5(data: Uint8Array): string {
  // Simple MD5 approximation using Web Crypto API
  // In production, use a proper MD5 library
  let hash = 0;
  for (let i = 0; i < Math.min(data.length, 1024); i++) {
    const char = data[i];
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  // Create a hex-like string for display purposes
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return hex.repeat(4).slice(0, 32);
}

export function compareBinaryFiles(fileA: BinaryFile, fileB: BinaryFile): Difference[] {
  const differences: Difference[] = [];
  const maxLength = Math.max(fileA.data.length, fileB.data.length);
  const minLength = Math.min(fileA.data.length, fileB.data.length);

  // Find contiguous differences
  let diffStart: number | null = null;

  for (let i = 0; i < maxLength; i++) {
    const byteA = i < fileA.data.length ? fileA.data[i] : null;
    const byteB = i < fileB.data.length ? fileB.data[i] : null;

    if (byteA !== byteB) {
      if (diffStart === null) {
        diffStart = i;
      }
    } else if (diffStart !== null) {
      // End of difference block
      differences.push({
        offset: diffStart,
        length: i - diffStart,
        fileA: fileA.data.slice(diffStart, i),
        fileB: fileB.data.slice(diffStart, i),
        changeType: determineChangeType(diffStart, i, fileA.data.length, fileB.data.length)
      });
      diffStart = null;
    }
  }

  // Handle trailing difference
  if (diffStart !== null) {
    differences.push({
      offset: diffStart,
      length: maxLength - diffStart,
      fileA: fileA.data.slice(diffStart),
      fileB: fileB.data.slice(diffStart),
      changeType: determineChangeType(diffStart, maxLength, fileA.data.length, fileB.data.length)
    });
  }

  return differences;
}

function determineChangeType(
  start: number,
  end: number,
  lengthA: number,
  lengthB: number
): 'ADDED' | 'REMOVED' | 'MODIFIED' | 'EQUAL' {
  if (start >= lengthA) return 'ADDED';
  if (end > lengthB) return 'ADDED';
  if (start >= lengthB) return 'REMOVED';
  return 'MODIFIED';
}

export function mapDifferencesToParameters(
  differences: Difference[],
  maps: MapDefinition[]
): Difference[] {
  return differences.map(diff => {
    const mappedMap = findOverlappingMap(diff.offset, diff.length, maps);
    return {
      ...diff,
      mappedTo: mappedMap
    };
  });
}

function findOverlappingMap(
  offset: number,
  length: number,
  maps: MapDefinition[]
): MapDefinition | undefined {
  for (const map of maps) {
    if (offset >= map.address && offset < map.address + map.size) {
      return map;
    }
    // Check if offset is within the map
    if (offset < map.address && offset + length > map.address) {
      return map;
    }
  }
  return undefined;
}

export function calculateStats(
  differences: Difference[],
  totalBytes: number
): ComparisonResult['stats'] {
  const bytesChanged = differences.reduce((sum, d) => sum + d.length, 0);
  const paramsChanged = new Set(
    differences.filter(d => d.mappedTo).map(d => d.mappedTo!.name)
  ).size;

  return {
    totalBytes,
    bytesChanged,
    paramsChanged,
    percentChanged: totalBytes > 0 ? (bytesChanged / totalBytes) * 100 : 0
  };
}

export function parseBinaryData(
  data: Uint8Array,
  offset: number,
  deposit: string,
  dimensions?: number[]
): number | number[] {
  const bytes = data.slice(offset, offset + calculateSize(deposit, dimensions));

  switch (deposit.toUpperCase()) {
    case 'UBYTE':
    case 'UINT8':
      return Array.from(bytes).map(b => b);
    case 'SBYTE':
    case 'INT8':
      return Array.from(bytes).map(b => (b > 127 ? b - 256 : b));
    case 'UWORD':
    case 'UINT16':
      return parseUint16Array(bytes);
    case 'SWORD':
    case 'INT16':
      return parseInt16Array(bytes);
    case 'ULONG':
    case 'UINT32':
      return parseUint32Array(bytes);
    case 'SLONG':
    case 'INT32':
      return parseInt32Array(bytes);
    case 'FLOAT32_IEEE':
      return parseFloat32Array(bytes);
    case 'FLOAT64_IEEE':
      return parseFloat64Array(bytes);
    default:
      return Array.from(bytes);
  }
}

function calculateSize(deposit: string, dimensions?: number[]): number {
  const baseSize = (() => {
    switch (deposit.toUpperCase()) {
      case 'UBYTE':
      case 'SBYTE':
      case 'UINT8':
      case 'INT8':
        return 1;
      case 'UWORD':
      case 'SWORD':
      case 'UINT16':
      case 'INT16':
        return 2;
      case 'ULONG':
      case 'SLONG':
      case 'UINT32':
      case 'INT32':
        return 4;
      case 'FLOAT32_IEEE':
        return 4;
      case 'FLOAT64_IEEE':
        return 8;
      default:
        return 1;
    }
  })();

  if (!dimensions || dimensions.length === 0) {
    return baseSize;
  }

  return dimensions.reduce((prod, dim) => prod * dim, 1) * baseSize;
}

function parseUint16Array(bytes: Uint8Array): number[] {
  const result: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      result.push(bytes[i] | (bytes[i + 1] << 8));
    }
  }
  return result;
}

function parseInt16Array(bytes: Uint8Array): number[] {
  const result: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    if (i + 1 < bytes.length) {
      let val = bytes[i] | (bytes[i + 1] << 8);
      if (val > 32767) val -= 65536;
      result.push(val);
    }
  }
  return result;
}

function parseUint32Array(bytes: Uint8Array): number[] {
  const result: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    if (i + 3 < bytes.length) {
      result.push(
        bytes[i] |
        (bytes[i + 1] << 8) |
        (bytes[i + 2] << 16) |
        (bytes[i + 3] << 24)
      );
    }
  }
  return result;
}

function parseInt32Array(bytes: Uint8Array): number[] {
  const result: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    if (i + 3 < bytes.length) {
      let val =
        bytes[i] |
        (bytes[i + 1] << 8) |
        (bytes[i + 2] << 16) |
        (bytes[i + 3] << 24);
      if (val > 2147483647) val -= 4294967296;
      result.push(val);
    }
  }
  return result;
}

function parseFloat32Array(bytes: Uint8Array): number[] {
  const result: number[] = [];
  for (let i = 0; i < bytes.length; i += 4) {
    if (i + 3 < bytes.length) {
      const buffer = new ArrayBuffer(4);
      const view = new DataView(buffer);
      bytes.slice(i, i + 4).forEach((b, idx) => view.setUint8(idx, b));
      result.push(view.getFloat32(0, false));
    }
  }
  return result;
}

function parseFloat64Array(bytes: Uint8Array): number[] {
  const result: number[] = [];
  for (let i = 0; i < bytes.length; i += 8) {
    if (i + 7 < bytes.length) {
      const buffer = new ArrayBuffer(8);
      const view = new DataView(buffer);
      bytes.slice(i, i + 8).forEach((b, idx) => view.setUint8(idx, b));
      result.push(view.getFloat64(0, false));
    }
  }
  return result;
}

export function formatHex(data: Uint8Array, offset: number, length: number = 16): string {
  const slice = data.slice(offset, offset + length);
  return Array.from(slice)
    .map(b => b.toString(16).padStart(2, '0').toUpperCase())
    .join(' ');
}

export function formatAscii(data: Uint8Array, offset: number, length: number = 16): string {
  const slice = data.slice(offset, offset + length);
  return Array.from(slice)
    .map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.')
    .join('');
}

export function formatOffset(offset: number, padded: number = 8): string {
  return '0x' + offset.toString(16).padStart(padded, '0').toUpperCase();
}
