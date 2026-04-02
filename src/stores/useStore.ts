// Zustand Store - Global State Management

import { create } from 'zustand';
import type {
  BinaryFile,
  MapDefinition,
  Difference,
  ComparisonResult,
  A2LDefinition,
  Toast
} from '../types';
import { computeMD5, compareBinaryFiles, mapDifferencesToParameters, calculateStats } from '../lib/binary';
import { parseA2LContent, convertToMapDefinitions, parseASAP2XML } from '../lib/a2l-parser';
import { scanForMaps, createSampleA2L, generateSampleBinary, generateModifiedBinary } from '../lib/maps';

interface AppState {
  // File state
  fileA: BinaryFile | null;
  fileB: BinaryFile | null;
  a2lDefinition: A2LDefinition | null;
  autoDetectedMaps: MapDefinition[];

  // Comparison results
  differences: Difference[];
  maps: MapDefinition[];
  comparisonResult: ComparisonResult | null;

  // UI state
  selectedOffset: number | null;
  selectedDiff: Difference | null;
  showChangedOnly: boolean;
  filterText: string;
  filterType: MapDefinition['type'] | 'ALL';

  // Panel state
  leftPanelOpen: boolean;
  rightPanelOpen: boolean;

  // Toasts
  toasts: Toast[];

  // Actions
  loadFileA: (file: File) => Promise<void>;
  loadFileB: (file: File) => Promise<void>;
  loadA2L: (file: File) => Promise<void>;
  loadDemoFiles: () => void;

  runComparison: () => void;
  selectOffset: (offset: number | null) => void;
  selectDiff: (diff: Difference | null) => void;
  toggleShowChangedOnly: () => void;
  setFilterText: (text: string) => void;
  setFilterType: (type: MapDefinition['type'] | 'ALL') => void;
  toggleLeftPanel: () => void;
  toggleRightPanel: () => void;

  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;

  reset: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  fileA: null,
  fileB: null,
  a2lDefinition: null,
  autoDetectedMaps: [],
  differences: [],
  maps: [],
  comparisonResult: null,
  selectedOffset: null,
  selectedDiff: null,
  showChangedOnly: false,
  filterText: '',
  filterType: 'ALL',
  leftPanelOpen: true,
  rightPanelOpen: true,
  toasts: [],

  // Load File A
  loadFileA: async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const binaryFile: BinaryFile = {
        name: file.name,
        size: data.length,
        md5: computeMD5(data),
        data
      };

      set({ fileA: binaryFile });

      // Auto-detect maps if no A2L loaded
      const state = get();
      if (!state.a2lDefinition) {
        const detectedMaps = scanForMaps(binaryFile);
        set({ autoDetectedMaps: detectedMaps });
      }

      get().addToast({
        type: 'success',
        message: `Loaded ${file.name} (${formatBytes(data.length)})`
      });

      // Run comparison if we have both files
      if (get().fileB) {
        get().runComparison();
      }
    } catch (error) {
      get().addToast({
        type: 'error',
        message: `Failed to load ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  },

  // Load File B
  loadFileB: async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);
      const binaryFile: BinaryFile = {
        name: file.name,
        size: data.length,
        md5: computeMD5(data),
        data
      };

      set({ fileB: binaryFile });

      get().addToast({
        type: 'success',
        message: `Loaded ${file.name} (${formatBytes(data.length)})`
      });

      // Run comparison if we have both files
      if (get().fileA) {
        get().runComparison();
      }
    } catch (error) {
      get().addToast({
        type: 'error',
        message: `Failed to load ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  },

  // Load A2L definition file
  loadA2L: async (file: File) => {
    try {
      const text = await file.text();
      let definition: A2LDefinition;

      // Try to detect format
      if (text.includes('<?xml') || text.includes('<ASAP2')) {
        definition = parseASAP2XML(text);
      } else {
        definition = parseA2LContent(text);
      }

      const maps = convertToMapDefinitions(definition);

      set({
        a2lDefinition: definition,
        maps: maps
      });

      get().addToast({
        type: 'success',
        message: `Loaded A2L: ${definition.moduleName} (${maps.length} maps)`
      });

      // Re-run comparison with new maps
      if (get().fileA && get().fileB) {
        get().runComparison();
      }
    } catch (error) {
      get().addToast({
        type: 'error',
        message: `Failed to parse A2L: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  },

  // Load demo files
  loadDemoFiles: () => {
    const original = generateSampleBinary(8192);
    const modified = generateModifiedBinary(original);

    const fileA: BinaryFile = {
      name: 'original.bin',
      size: original.length,
      md5: computeMD5(original),
      data: original
    };

    const fileB: BinaryFile = {
      name: 'modified.bin',
      size: modified.length,
      md5: computeMD5(modified),
      data: modified
    };

    // Parse sample A2L
    const a2lContent = createSampleA2L();
    const definition = parseA2LContent(a2lContent);
    const maps = convertToMapDefinitions(definition);

    set({
      fileA,
      fileB,
      a2lDefinition: definition,
      maps,
      autoDetectedMaps: []
    });

    get().addToast({
      type: 'info',
      message: 'Loaded demo files with sample ECU data'
    });

    get().runComparison();
  },

  // Run comparison
  runComparison: () => {
    const { fileA, fileB, maps, autoDetectedMaps } = get();

    if (!fileA || !fileB) return;

    // Use A2L maps if available, otherwise use auto-detected
    const activeMaps = maps.length > 0 ? maps : autoDetectedMaps;

    // Run comparison
    const differences = compareBinaryFiles(fileA, fileB);
    const mappedDiffs = mapDifferencesToParameters(differences, activeMaps);
    const stats = calculateStats(mappedDiffs, Math.max(fileA.size, fileB.size));

    const result: ComparisonResult = {
      fileA,
      fileB,
      differences: mappedDiffs,
      maps: activeMaps,
      stats
    };

    set({
      differences: mappedDiffs,
      comparisonResult: result
    });

    get().addToast({
      type: 'info',
      message: `Found ${stats.paramsChanged} changed parameters (${stats.percentChanged.toFixed(2)}% different)`
    });
  },

  // Select offset
  selectOffset: (offset) => set({ selectedOffset: offset }),

  // Select diff
  selectDiff: (diff) => set({ selectedDiff: diff }),

  // Toggle show changed only
  toggleShowChangedOnly: () => set((state) => ({ showChangedOnly: !state.showChangedOnly })),

  // Set filter text
  setFilterText: (text) => set({ filterText: text }),

  // Set filter type
  setFilterType: (type) => set({ filterType: type }),

  // Toggle panels
  toggleLeftPanel: () => set((state) => ({ leftPanelOpen: !state.leftPanelOpen })),
  toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),

  // Toast management
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }]
    }));

    // Auto-remove non-error toasts
    if (toast.type !== 'error') {
      setTimeout(() => {
        get().removeToast(id);
      }, 5000);
    }
  },

  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }));
  },

  // Reset all state
  reset: () => set({
    fileA: null,
    fileB: null,
    a2lDefinition: null,
    autoDetectedMaps: [],
    differences: [],
    maps: [],
    comparisonResult: null,
    selectedOffset: null,
    selectedDiff: null,
    showChangedOnly: false,
    filterText: '',
    filterType: 'ALL',
    leftPanelOpen: true,
    rightPanelOpen: true,
    toasts: []
  })
}));

// Helper function
function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
