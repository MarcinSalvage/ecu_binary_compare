// Map Pattern Recognition - Automatic detection of ECU map structures

import type { MapDefinition, BinaryFile } from '../types';

// Common map patterns found in ECU binaries
export interface MapPattern {
  name: string;
  type: MapDefinition['type'];
  detect: (data: Uint8Array, offset: number) => boolean;
  getSize: (data: Uint8Array, offset: number) => number;
}

// Common ECU map patterns
export const mapPatterns: MapPattern[] = [
  {
    name: 'Uint8 Array',
    type: 'VALUE',
    detect: () => true,
    getSize: (data, offset) => Math.min(16, data.length - offset)
  },
  {
    name: 'Uint16 Array',
    type: 'VALUE',
    detect: (data, offset) => offset + 2 <= data.length,
    getSize: (data, offset) => Math.min(32, Math.floor((data.length - offset) / 2) * 2)
  },
  {
    name: 'Uint32 Array',
    type: 'VALUE',
    detect: (data, offset) => offset + 4 <= data.length,
    getSize: (data, offset) => Math.min(64, Math.floor((data.length - offset) / 4) * 4)
  },
  {
    name: 'Float32 Array',
    type: 'VALUE',
    detect: (data, offset) => offset + 4 <= data.length && isValidFloat32(data, offset),
    getSize: (data, offset) => Math.min(64, Math.floor((data.length - offset) / 4) * 4)
  },
  {
    name: '2D Lookup Table (8x8)',
    type: 'MAP',
    detect: (data, offset) => offset + 64 <= data.length,
    getSize: () => 64
  },
  {
    name: '2D Lookup Table (16x16)',
    type: 'MAP',
    detect: (data, offset) => offset + 256 <= data.length,
    getSize: () => 256
  },
  {
    name: '3D Lookup Table',
    type: 'MAP',
    detect: (data, offset) => offset + 512 <= data.length && has3DStructure(data, offset),
    getSize: () => 512
  },
  {
    name: 'Axis Breakpoints',
    type: 'AXIS',
    detect: (data, offset) => offset + 32 <= data.length && isMonotonicSequence(data, offset, 8),
    getSize: (data, offset) => Math.min(64, Math.floor((data.length - offset) / 4) * 4)
  }
];

// Validation functions for pattern detection
function isValidFloat32(data: Uint8Array, offset: number): boolean {
  if (offset + 4 > data.length) return false;

  for (let i = 0; i < 4; i += 4) {
    const bytes = data.slice(offset + i, offset + i + 4);
    const value = readFloat32(bytes);

    // Check for reasonable float values
    if (isNaN(value) || !isFinite(value)) {
      // Allow some NaN/Inf as they might be padding
      continue;
    }

    // Values should be in reasonable range for ECU data
    if (Math.abs(value) > 1e10) return false;
  }

  return true;
}

function has3DStructure(data: Uint8Array, offset: number): boolean {
  // Check if 8 consecutive 64-byte blocks have similar byte distribution
  // This is a heuristic for 8x8x8 3D tables
  const firstBlock = analyzeBlock(data, offset);

  for (let i = 1; i < 8; i++) {
    const block = analyzeBlock(data, offset + i * 64);
    if (Math.abs(block.mean - firstBlock.mean) > 50) return false;
  }

  return true;
}

function analyzeBlock(data: Uint8Array, offset: number): { mean: number; variance: number } {
  if (offset + 64 > data.length) return { mean: 0, variance: 0 };

  let sum = 0;
  for (let i = 0; i < 64; i++) {
    sum += data[offset + i];
  }
  const mean = sum / 64;

  let variance = 0;
  for (let i = 0; i < 64; i++) {
    variance += Math.pow(data[offset + i] - mean, 2);
  }
  variance /= 64;

  return { mean, variance };
}

function isMonotonicSequence(data: Uint8Array, offset: number, count: number): boolean {
  if (offset + count * 4 > data.length) return false;

  const values: number[] = [];
  for (let i = 0; i < count; i++) {
    values.push(readUint32(data, offset + i * 4));
  }

  // Check if values are monotonically increasing or decreasing
  const increasing = values.every((v, i) => i === 0 || v >= values[i - 1]);
  const decreasing = values.every((v, i) => i === 0 || v <= values[i - 1]);

  return increasing || decreasing;
}

// Read helpers
function readFloat32(data: Uint8Array): number {
  if (data.length < 4) return NaN;
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  for (let i = 0; i < 4; i++) {
    view.setUint8(i, data[i]);
  }
  return view.getFloat32(0, false);
}

function readUint32(data: Uint8Array, offset: number): number {
  if (offset + 4 > data.length) return 0;
  return data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24);
}

// Scan binary for map patterns
export function scanForMaps(file: BinaryFile, minSize: number = 4): MapDefinition[] {
  const maps: MapDefinition[] = [];
  const minGap = 4; // Minimum gap between detected maps
  let lastEnd = 0;

  // Scan in 64-byte steps for efficiency
  const step = 64;
  for (let offset = 0; offset < file.data.length; offset += step) {
    // Skip if too close to last map
    if (offset < lastEnd) continue;

    for (const pattern of mapPatterns) {
      if (pattern.detect(file.data, offset)) {
        const size = pattern.getSize(file.data, offset);

        if (size >= minSize) {
          maps.push({
            name: `Map_0x${offset.toString(16).toUpperCase().padStart(8, '0')}`,
            type: pattern.type,
            address: offset,
            size: size,
            dimensions: inferDimensions(size, pattern.type)
          });

          lastEnd = offset + size;
          break; // Move to next offset after finding a match
        }
      }
    }
  }

  return maps.sort((a, b) => a.address - b.address);
}

function inferDimensions(size: number, type: MapDefinition['type']): number[] | undefined {
  if (type === 'VALUE' || type === 'AXIS') {
    if (size % 4 === 0) return [size / 4];
    if (size % 2 === 0) return [size / 2];
    return [size];
  }

  if (type === 'MAP') {
    // Try to find common 2D dimensions
    if (size === 64) return [8, 8];
    if (size === 128) return [8, 16];
    if (size === 256) return [16, 16];
    if (size === 512) return [16, 32];

    // Try square root
    const sqrt = Math.sqrt(size);
    if (Number.isInteger(sqrt)) return [sqrt, sqrt];

    // Common automotive dimensions
    if (size === 288) return [12, 24];
    if (size === 384) return [16, 24];
    if (size === 768) return [24, 32];
  }

  return undefined;
}

// Create sample/demo A2L content for testing
export function createSampleA2L(): string {
  return `
/begin PROJECT TEST_PROJECT "Test ECU Project"
  /begin MODULE MAIN_MODULE "Main ECU Module"
    /begin MOD_PAR
      "ECU_NAME" "TestECU"
      "CPU_TYPE" "PowerPC"
      "VERSION" "1.0.0"
    /end MOD_PAR

    /begin CHARACTERISTIC
      "Engine_Speed_Limit" VALUE 0x1234 UWORD
        NUMBER 1
        /begin ANNOTATION
          "Engine speed limit in RPM"
        /end ANNOTATION
    /end CHARACTERISTIC

    /begin CHARACTERISTIC
      "Fuel_Map" MAP 0x5000 UWORD
        MATRIX_DIM 16 16
        /begin ANNOTATION
          "Main fuel injection map"
        /end ANNOTATION
    /end CHARACTERISTIC

    /begin CHARACTERISTIC
      "Ignition_Map" MAP 0x6000 UBYTE
        MATRIX_DIM 12 12
    /end CHARACTERISTIC

    /begin CHARACTERISTIC
      "Idle_Speed" VALUE 0x1238 UWORD
        NUMBER 1
    /end CHARACTERISTIC

    /begin AXIS_PTS
      "RPM_Axis" 0x4000 UWORD 16
        CONVERSION "RPM_CONV"
    /end AXIS_PTS

    /begin AXIS_PTS
      "Load_Axis" 0x4100 UWORD 16
        CONVERSION "LOAD_CONV"
    /end AXIS_PTS

    /begin COMPU_METHOD
      "RPM_CONV" LINEAR "rpm"
        COEFFS LINEAR 1.0 0.0 0.0
    /end COMPU_METHOD

    /begin COMPU_METHOD
      "LOAD_CONV" LINEAR "%"
        COEFFS LINEAR 0.1 0.0 0.0
    /end COMPU_METHOD

    /begin COMPU_METHOD
      "PERCENT_CONV" LINEAR "%"
        COEFFS LINEAR 0.390625 0.0 0.0
    /end COMPU_METHOD

  /end MODULE
/end PROJECT
  `.trim();
}

// Generate sample binary data for testing
export function generateSampleBinary(size: number): Uint8Array {
  const data = new Uint8Array(size);

  // Add some known patterns
  // Engine Speed Limit at 0x1234
  data[0x1234] = 0x40;
  data[0x1235] = 0x1F;

  // Idle Speed at 0x1238
  data[0x1238] = 0xD0;
  data[0x1239] = 0x07;

  // RPM Axis at 0x4000 (16 values)
  for (let i = 0; i < 16; i++) {
    const rpm = 500 + i * 500;
    data[0x4000 + i * 2] = rpm & 0xFF;
    data[0x4000 + i * 2 + 1] = (rpm >> 8) & 0xFF;
  }

  // Fuel Map at 0x5000 (16x16 = 256 bytes)
  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 16; col++) {
      const fuel = Math.min(255, 100 + row * 5 + col * 2);
      data[0x5000 + row * 16 + col] = fuel;
    }
  }

  // Ignition Map at 0x6000 (12x12 = 144 bytes)
  for (let row = 0; row < 12; row++) {
    for (let col = 0; col < 12; col++) {
      const ignition = Math.min(255, 20 + row * 3 + col);
      data[0x6000 + row * 12 + col] = ignition;
    }
  }

  // Fill rest with pattern
  for (let i = 0; i < size; i++) {
    if (data[i] === 0) {
      data[i] = (i % 256);
    }
  }

  return data;
}

// Create a modified version for comparison demo
export function generateModifiedBinary(original: Uint8Array): Uint8Array {
  const modified = new Uint8Array(original);

  // Modify Engine Speed Limit (increased by 500 RPM)
  const originalRpm = modified[0x1234] | (modified[0x1235] << 8);
  const newRpm = originalRpm + 500;
  modified[0x1234] = newRpm & 0xFF;
  modified[0x1235] = (newRpm >> 8) & 0xFF;

  // Modify a few cells in the Fuel Map
  modified[0x5005] = 130; // Changed value
  modified[0x5020] = 140; // Changed value
  modified[0x5040] = 145; // Changed value

  // Modify Idle Speed
  modified[0x1238] = 0xE0;
  modified[0x1239] = 0x07;

  return modified;
}
