// ASAP2/A2L Parser - Simplified implementation
// Supports common ASAP2 1.51 specification patterns

import type { A2LDefinition, Characteristic, AxisPts, CompuMethod, MapDefinition } from '../types';

export function parseA2LContent(content: string): A2LDefinition {
  const lines = content.split(/\r?\n/);
  const definition: A2LDefinition = {
    moduleName: '',
    ecuName: '',
    cpuType: '',
    characteristic: [],
    axisPts: [],
    compuMethod: [],
    recordLayout: []
  };

  let currentBlock: string | null = null;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines and comments
    if (!line || line.startsWith('/*') || line.startsWith('//')) {
      if (line.startsWith('/*')) {
        // Skip until end of comment
        while (i < lines.length && !lines[i].includes('*/')) i++;
      }
      i++;
      continue;
    }

    // Block detection
    if (line.startsWith('/begin ')) {
      const blockName = line.substring(7).trim().toUpperCase();
      currentBlock = blockName;

      switch (currentBlock) {
        case 'MODULE':
          definition.moduleName = parseModuleName(lines[i + 1]);
          break;
        case 'CHARACTERISTIC':
          const characteristic = parseCharacteristic(lines, i);
          if (characteristic) definition.characteristic.push(characteristic);
          break;
        case 'AXIS_PTS':
          const axisPts = parseAxisPts(lines, i);
          if (axisPts) definition.axisPts.push(axisPts);
          break;
        case 'COMPU_METHOD':
          const compuMethod = parseCompuMethod(lines, i);
          if (compuMethod) definition.compuMethod.push(compuMethod);
          break;
      }
    } else if (line.startsWith('/end ')) {
      currentBlock = null;
    }

    i++;
  }

  return definition;
}

function parseModuleName(line: string | undefined): string {
  if (!line) return '';
  const match = line.match(/"?([^"]+)"?/);
  return match ? match[1].trim() : '';
}

function parseCharacteristic(lines: string[], startIndex: number): Characteristic | null {
  const characteristic: Partial<Characteristic> = {
    dimensions: []
  };

  let i = startIndex + 1;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('/end CHARACTERISTIC')) break;

    // Parse key-value pairs
    if (line.startsWith('"')) {
      // Name line: "Name" Type Address Deposit
      const parts = line.match(/"([^"]+)"\s+(\w+)\s+(\w+)\s+(\w+)/);
      if (parts) {
        characteristic.name = parts[1];
        characteristic.type = mapCharacteristicType(parts[2]);
        characteristic.address = parseInt(parts[3], 16);
        characteristic.deposit = parts[4];
      }
    } else if (line.startsWith('NUMBER')) {
      const match = line.match(/NUMBER\s+(\d+)/);
      if (match) characteristic.dimensions = [parseInt(match[1])];
    } else if (line.startsWith('MATRIX_DIM')) {
      const match = line.match(/MATRIX_DIM\s+(\d+)\s+(\d+)/);
      if (match) characteristic.dimensions = [parseInt(match[1]), parseInt(match[2])];
    } else if (line.startsWith('AXIS_PTS_REF')) {
      // Reference to axis points
    } else if (line.startsWith('FORMULA')) {
      // Formula for computation
    }

    i++;
  }

  if (!characteristic.name) return null;
  return characteristic as Characteristic;
}

function mapCharacteristicType(type: string): Characteristic['type'] {
  switch (type.toUpperCase()) {
    case 'VALUE':
      return 'VALUE';
    case 'MAP':
      return 'MAP';
    case 'CURVE':
      return 'CURVE';
    case 'AXIS':
    case 'AXIS_PTS':
      return 'AXIS';
    case 'VAL_BLK':
      return 'VALUE'; // Treat as value
    default:
      return 'VALUE';
  }
}

function parseAxisPts(lines: string[], startIndex: number): AxisPts | null {
  const axisPts: Partial<AxisPts> = {};

  let i = startIndex + 1;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('/end AXIS_PTS')) break;

    if (line.startsWith('"')) {
      // Name line
      const parts = line.match(/"([^"]+)"\s+(\w+)\s+(\w+)\s+(\w+)\s+(\w+)/);
      if (parts) {
        axisPts.name = parts[1];
        axisPts.address = parseInt(parts[2], 16);
        axisPts.inputQuantity = parts[3];
        axisPts.deposit = parts[4];
        axisPts.maxAxisPoints = parseInt(parts[5]);
      }
    } else if (line.startsWith('CONVERSION')) {
      const match = line.match(/CONVERSION\s+"([^"]+)"/);
      if (match) axisPts.conversion = match[1];
    }

    i++;
  }

  if (!axisPts.name) return null;
  return axisPts as AxisPts;
}

function parseCompuMethod(lines: string[], startIndex: number): CompuMethod | null {
  const compuMethod: Partial<CompuMethod> = {};

  let i = startIndex + 1;
  while (i < lines.length) {
    const line = lines[i].trim();

    if (line.startsWith('/end COMPU_METHOD')) break;

    if (line.startsWith('"')) {
      // Name line
      const parts = line.match(/"([^"]+)"\s+(\w+)\s+"([^"]*)"/);
      if (parts) {
        compuMethod.name = parts[1];
        compuMethod.conversionType = mapConversionType(parts[2]);
        compuMethod.refUnit = parts[3];
      }
    } else if (line.startsWith('FORMULA')) {
      const match = line.match(/FORMULA\s+"([^"]+)"/);
      if (match) compuMethod.formula = match[1];
    } else if (line.startsWith('COEFFS')) {
      const match = line.match(/COEFFS\s+([-\d.eE+]+)\s+([-\d.eE+]+)\s+([-\d.eE+]+)/);
      if (match) {
        compuMethod.a = parseFloat(match[1]);
        compuMethod.b = parseFloat(match[2]);
        compuMethod.c = parseFloat(match[3]);
      }
    }

    i++;
  }

  if (!compuMethod.name) return null;
  return compuMethod as CompuMethod;
}

function mapConversionType(type: string): CompuMethod['conversionType'] {
  switch (type.toUpperCase()) {
    case 'LINEAR':
      return 'LINEAR';
    case 'FORM':
      return 'FORM';
    case 'TAB_INTP':
      return 'TAB_INTP';
    case 'TAB_NOINTP':
      return 'TAB_NOINTP';
    default:
      return 'LINEAR';
  }
}

// Convert A2L definitions to MapDefinition format
export function convertToMapDefinitions(def: A2LDefinition): MapDefinition[] {
  const maps: MapDefinition[] = [];

  // Add characteristics
  for (const char of def.characteristic) {
    maps.push({
      name: char.name,
      type: char.type as MapDefinition['type'],
      address: char.address,
      size: calculateMapSize(char),
      dimensions: char.dimensions,
      compuMethod: char.conversion
    });
  }

  // Add axis points
  for (const axis of def.axisPts) {
    maps.push({
      name: axis.name,
      type: 'AXIS',
      address: axis.address,
      size: axis.maxAxisPoints * 4, // Assuming 4 bytes per point
      dimensions: [axis.maxAxisPoints],
      compuMethod: axis.conversion
    });
  }

  return maps.sort((a, b) => a.address - b.address);
}

function calculateMapSize(char: Characteristic): number {
  if (char.dimensions.length === 0) {
    return getTypeSize(char.deposit);
  }

  const elementSize = getTypeSize(char.deposit);
  return char.dimensions.reduce((prod, dim) => prod * dim, 1) * elementSize;
}

function getTypeSize(deposit: string): number {
  const d = deposit.toUpperCase();
  if (d.includes('8')) return 1;
  if (d.includes('16')) return 2;
  if (d.includes('32') || d.includes('FLOAT')) return 4;
  if (d.includes('64')) return 8;
  return 1;
}

// Apply conversion to raw value
export function applyConversion(
  rawValue: number,
  method: CompuMethod | undefined
): number {
  if (!method) return rawValue;

  switch (method.conversionType) {
    case 'LINEAR':
      return (method.a || 1) * rawValue + (method.b || 0);
    case 'FORM':
      // Formula-based conversion
      if (method.formula && method.a !== undefined && method.b !== undefined) {
        // Simple linear approximation
        return method.a * rawValue + method.b;
      }
      return rawValue;
    default:
      return rawValue;
  }
}

// Parse ASAP2 XML format (alternative to A2L text format)
export function parseASAP2XML(xmlContent: string): A2LDefinition {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlContent, 'text/xml');

  const definition: A2LDefinition = {
    moduleName: '',
    ecuName: '',
    cpuType: '',
    characteristic: [],
    axisPts: [],
    compuMethod: [],
    recordLayout: []
  };

  // Parse ASAP2 elements
  const moduleEl = doc.querySelector('MODULE');
  if (moduleEl) {
    definition.moduleName = moduleEl.getAttribute('NAME') || '';

    const modPar = moduleEl.querySelector('MOD_PAR');
    if (modPar) {
      definition.ecuName = modPar.querySelector('ECU')?.textContent || '';
      definition.cpuType = modPar.querySelector('CPU')?.textContent || '';
    }

    // Parse characteristics
    const chars = moduleEl.querySelectorAll('CHARACTERISTIC');
    chars.forEach(el => {
      definition.characteristic.push({
        name: el.getAttribute('NAME') || '',
        type: (el.getAttribute('TYPE') || 'VALUE') as Characteristic['type'],
        address: parseInt(el.getAttribute('ADDRESS') || '0', 16),
        deposit: el.getAttribute('DEPOSIT') || 'UBYTE',
        dimensions: parseDimensions(el.getAttribute('DIM'))
      });
    });

    // Parse axis points
    const axes = moduleEl.querySelectorAll('AXIS_PTS');
    axes.forEach(el => {
      definition.axisPts.push({
        name: el.getAttribute('NAME') || '',
        address: parseInt(el.getAttribute('ADDRESS') || '0', 16),
        inputQuantity: el.getAttribute('INPUT_QUANTITY') || '',
        deposit: el.getAttribute('DEPOSIT') || 'UBYTE',
        maxAxisPoints: parseInt(el.getAttribute('MAX_AXIS_POINTS') || '0'),
        conversion: el.getAttribute('CONVERSION') || ''
      });
    });

    // Parse compu methods
    const methods = moduleEl.querySelectorAll('COMPU_METHOD');
    methods.forEach(el => {
      const coeffs = el.querySelectorAll('COEFFS LINEAR');
      let a = 1, b = 0, c = 0;
      coeffs.forEach(coeff => {
        a = parseFloat(coeff.getAttribute('A') || '1');
        b = parseFloat(coeff.getAttribute('B') || '0');
        c = parseFloat(coeff.getAttribute('C') || '0');
      });

      definition.compuMethod.push({
        name: el.getAttribute('NAME') || '',
        conversionType: (el.getAttribute('TYPE') || 'LINEAR') as CompuMethod['conversionType'],
        refUnit: el.querySelector('UNIT')?.textContent || '',
        a, b, c
      });
    });
  }

  return definition;
}

function parseDimensions(dimStr: string | null): number[] {
  if (!dimStr) return [];
  return dimStr.split(/[,\s]+/).map(d => parseInt(d.trim())).filter(d => !isNaN(d));
}
