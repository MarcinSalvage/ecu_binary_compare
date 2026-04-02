// ECU Binary Compare - Type Definitions

export interface BinaryFile {
  name: string;
  size: number;
  md5: string;
  data: Uint8Array;
}

export interface MapDefinition {
  name: string;
  type: 'VALUE' | 'MAP' | 'CURVE' | 'AXIS' | 'UNMAPPED';
  address: number;
  size: number;
  dimensions?: number[];
  axisRefs?: string[];
  compuMethod?: string;
  rawValue?: number | number[];
  physicalValue?: number | number[][];
}

export interface Difference {
  offset: number;
  length: number;
  fileA: Uint8Array;
  fileB: Uint8Array;
  mappedTo?: MapDefinition;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'EQUAL';
}

export interface ComparisonResult {
  fileA: BinaryFile;
  fileB: BinaryFile;
  differences: Difference[];
  maps: MapDefinition[];
  stats: {
    totalBytes: number;
    bytesChanged: number;
    paramsChanged: number;
    percentChanged: number;
  };
}

export interface A2LDefinition {
  moduleName: string;
  ecuName: string;
  cpuType: string;
  characteristic: Characteristic[];
  axisPts: AxisPts[];
  compuMethod: CompuMethod[];
  recordLayout: RecordLayout[];
}

export interface Characteristic {
  name: string;
  type: 'VALUE' | 'MAP' | 'CURVE' | 'AXIS' | 'VAL_BLK';
  address: number;
  deposit: string;
  dimensions: number[];
  maxAxisPoints?: number[];
  inputQuantity?: string[];
  conversion?: string;
  maxDiff?: number;
}

export interface AxisPts {
  name: string;
  address: number;
  inputQuantity: string;
  deposit: string;
  maxAxisPoints: number;
  conversion: string;
}

export interface CompuMethod {
  name: string;
  conversionType: 'LINEAR' | 'FORM' | 'TAB_INTP' | 'TAB_NOINTP';
  formula?: string;
  a?: number;
  b?: number;
  c?: number;
  formulaInverse?: string;
  refUnit?: string;
}

export interface RecordLayout {
  name: string;
  alignment: number;
  dataSize: number;
  fortranOrder: boolean;
}

export interface ExportOptions {
  format: 'json' | 'csv' | 'html';
  includeRawData: boolean;
  includeUnchanged: boolean;
  includeMaps: boolean;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
