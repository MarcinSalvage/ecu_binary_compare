// ECU Binary Compare - Main Application

import React, { useState, useCallback } from 'react';
import {
  Cpu,
  Upload,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Trash2,
  FlaskConical
} from 'lucide-react';
import { useStore } from './stores/useStore';
import {
  FileDropZone,
  FileInfoCard,
  A2LInfoCard,
  HexView,
  MapTree,
  DiffStats,
  ExportModal,
  StatusBar,
  ToastContainer
} from './components';

const App: React.FC = () => {
  const {
    fileA,
    fileB,
    loadFileA,
    loadFileB,
    loadA2L,
    loadDemoFiles,
    reset,
    comparisonResult,
    leftPanelOpen,
    rightPanelOpen,
    toggleLeftPanel,
    toggleRightPanel
  } = useStore();

  const [exportModalOpen, setExportModalOpen] = useState(false);

  const handleFileDrop = useCallback(async (file: File, type: 'bin' | 'a2l') => {
    if (type === 'a2l') {
      await loadA2L(file);
    } else {
      // Determine which slot based on what's already loaded
      if (!fileA) {
        await loadFileA(file);
      } else if (!fileB) {
        await loadFileB(file);
      } else {
        // Both loaded, replace file A
        await loadFileA(file);
      }
    }
  }, [fileA, fileB, loadFileA, loadFileB, loadA2L]);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-blue-400" />
            <h1 className="text-lg font-semibold text-gray-100">ECU Binary Compare</h1>
          </div>

          {comparisonResult && (
            <div className="hidden md:flex items-center gap-2 ml-4 px-3 py-1 bg-gray-800/50 rounded-full text-xs">
              <span className="text-gray-400">Comparing:</span>
              <span className="text-gray-300 truncate max-w-32">{comparisonResult.fileA.name}</span>
              <span className="text-gray-600">vs</span>
              <span className="text-gray-300 truncate max-w-32">{comparisonResult.fileB.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Demo button */}
          <button
            onClick={loadDemoFiles}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-lg transition-colors"
            title="Load demo files"
          >
            <FlaskConical className="w-4 h-4" />
            <span className="hidden sm:inline">Demo</span>
          </button>

          {/* Export button */}
          <button
            onClick={() => setExportModalOpen(true)}
            disabled={!comparisonResult}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors
              ${comparisonResult
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Clear button */}
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel - File info */}
        <div
          className={`
            flex-shrink-0 border-r border-gray-800 transition-all duration-200 overflow-hidden relative
            ${leftPanelOpen ? 'w-72' : 'w-10'}
          `}
        >
          {leftPanelOpen ? (
            <div className="h-full flex flex-col p-3 gap-3 overflow-auto">
              {/* File upload sections */}
              <div className="space-y-3">
                <FileDropZone
                  onFileDrop={handleFileDrop}
                  label="Drop File A (Original)"
                />
                <FileDropZone
                  onFileDrop={handleFileDrop}
                  label="Drop File B (Modified)"
                />
                <FileDropZone
                  onFileDrop={handleFileDrop}
                  label="Drop A2L/ASAP2 Definition"
                  accept=".a2l,.aml,.xml"
                />
              </div>

              {/* File info */}
              <div className="space-y-3">
                <FileInfoCard
                  file={fileA}
                  label={fileA?.name || 'File A'}
                  icon={<Upload className="w-4 h-4" />}
                />
                <FileInfoCard
                  file={fileB}
                  label={fileB?.name || 'File B'}
                  icon={<Upload className="w-4 h-4" />}
                />
                <A2LInfoCard />
              </div>

              {/* Stats */}
              <DiffStats />
            </div>
          ) : (
            <button
              onClick={toggleLeftPanel}
              className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
              title="Show left panel"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}

          {leftPanelOpen && (
            <button
              onClick={toggleLeftPanel}
              className="absolute top-16 left-0 p-1 text-gray-600 hover:text-gray-400 transition-colors z-10"
              title="Hide left panel"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Center panel - Hex view */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <HexView />
        </div>

        {/* Right panel - Map tree */}
        <div
          className={`
            flex-shrink-0 border-l border-gray-800 transition-all duration-200 overflow-hidden relative
            ${rightPanelOpen ? 'w-80' : 'w-10'}
          `}
        >
          {rightPanelOpen ? (
            <div className="h-full flex flex-col">
              <button
                onClick={toggleRightPanel}
                className="absolute top-16 right-0 p-1 text-gray-600 hover:text-gray-400 transition-colors z-10"
                title="Hide right panel"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
              <MapTree />
            </div>
          ) : (
            <button
              onClick={toggleRightPanel}
              className="w-10 h-full flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 transition-colors"
              title="Show right panel"
            >
              <PanelRightOpen className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <StatusBar />

      {/* Modals */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
};

export default App;
