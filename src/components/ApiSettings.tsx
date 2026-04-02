// API Connection Settings Component

import React, { useState } from 'react';
import { Wifi, WifiOff, Server, Download, FlaskConical } from 'lucide-react';
import { useApiStore, downloadDemoFiles } from '../stores/apiStore';

export const ApiSettings: React.FC = () => {
  const { apiConfig, setApiUrl, checkConnection, demoMode, enableDemoMode, disableDemoMode } = useApiStore();
  const [inputUrl, setInputUrl] = useState(apiConfig.baseUrl);

  const handleConnect = async () => {
    setApiUrl(inputUrl);
    const success = await checkConnection();
    if (success) {
      disableDemoMode();
    }
  };

  const handleDemoMode = () => {
    enableDemoMode();
  };

  const handleDownloadDemo = async () => {
    try {
      await downloadDemoFiles();
    } catch (error) {
      console.error('Failed to download demo files:', error);
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-3">
        <Server className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-medium text-gray-200">API Connection</h3>
      </div>

      {/* Connection Status */}
      <div className="flex items-center gap-2 mb-3">
        {apiConfig.connected ? (
          <>
            <Wifi className="w-4 h-4 text-green-400" />
            <span className="text-xs text-green-400">Connected to API</span>
          </>
        ) : (
          <>
            <WifiOff className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500">Not connected</span>
          </>
        )}
        {apiConfig.error && (
          <span className="text-xs text-red-400 ml-2">{apiConfig.error}</span>
        )}
      </div>

      {/* API URL Input */}
      {!demoMode && (
        <div className="space-y-2">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="http://localhost:5000/api"
            className="w-full px-3 py-1.5 text-xs bg-gray-700/50 border border-gray-600/50 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={handleConnect}
              disabled={apiConfig.loading}
              className="flex-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {apiConfig.loading ? 'Connecting...' : 'Connect'}
            </button>
            <button
              onClick={handleDemoMode}
              className="flex-1 px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              Use Demo
            </button>
          </div>
        </div>
      )}

      {/* Demo Mode */}
      {demoMode && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-purple-400">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Running in demo mode</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleDemoMode}
              disabled={!apiConfig.connected}
              className="flex-1 px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              Connect to API
            </button>
            <button
              onClick={handleDownloadDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Demo Files
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
