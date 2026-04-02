// API Integration Store - Connect to Flask Backend

import { create } from 'zustand';

interface ApiConfig {
  baseUrl: string;
  connected: boolean;
  loading: boolean;
  error: string | null;
}

interface ApiState {
  apiConfig: ApiConfig;
  demoMode: boolean;

  setApiUrl: (url: string) => void;
  checkConnection: () => Promise<boolean>;
  enableDemoMode: () => void;
  disableDemoMode: () => void;
}

export const useApiStore = create<ApiState>((set, get) => ({
  apiConfig: {
    baseUrl: 'http://localhost:5000/api',
    connected: false,
    loading: false,
    error: null
  },
  demoMode: true,

  setApiUrl: (url: string) => {
    set({
      apiConfig: {
        ...get().apiConfig,
        baseUrl: url,
        connected: false
      }
    });
  },

  checkConnection: async () => {
    const { apiConfig } = get();
    set({
      apiConfig: {
        ...apiConfig,
        loading: true,
        error: null
      }
    });

    try {
      const response = await fetch(`${apiConfig.baseUrl}/health`);
      if (response.ok) {
        const data = await response.json();
        set({
          apiConfig: {
            ...apiConfig,
            connected: true,
            loading: false,
            error: null
          }
        });
        return true;
      }
    } catch (error) {
      set({
        apiConfig: {
          ...apiConfig,
          connected: false,
          loading: false,
          error: error instanceof Error ? error.message : 'Connection failed'
        }
      });
    }
    return false;
  },

  enableDemoMode: () => set({ demoMode: true }),
  disableDemoMode: () => set({ demoMode: false })
}));

// API Functions
export async function fetchDemoComparison(): Promise<any> {
  const { apiConfig } = useApiStore.getState();

  const response = await fetch(`${apiConfig.baseUrl}/demo`);
  if (!response.ok) throw new Error('Failed to fetch demo');
  return response.json();
}

export async function uploadAndCompare(
  fileA: File,
  fileB: File,
  a2lFile?: File
): Promise<any> {
  const { apiConfig } = useApiStore.getState();

  const formData = new FormData();
  formData.append('file_a', fileA);
  formData.append('file_b', fileB);
  if (a2lFile) {
    formData.append('a2l_file', a2lFile);
  }

  const url = a2lFile
    ? `${apiConfig.baseUrl}/compare-with-maps`
    : `${apiConfig.baseUrl}/compare`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error('Comparison failed');
  return response.json();
}

export async function parseA2LFile(file: File): Promise<any> {
  const { apiConfig } = useApiStore.getState();

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${apiConfig.baseUrl}/parse-a2l`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) throw new Error('A2L parsing failed');
  return response.json();
}

export async function downloadDemoFiles(): Promise<void> {
  const { apiConfig } = useApiStore.getState();

  const response = await fetch(`${apiConfig.baseUrl}/demo/files`);
  if (!response.ok) throw new Error('Download failed');

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ecu_demo_files.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
