// Status Bar Component

import React from 'react';
import { CheckCircle, AlertTriangle, Circle, Database, HardDrive } from 'lucide-react';
import { useStore } from '../stores/useStore';

export const StatusBar: React.FC = () => {
  const { fileA, fileB, comparisonResult, selectedOffset, a2lDefinition } = useStore();

  const getStatus = () => {
    if (!fileA && !fileB) {
      return {
        icon: <Circle className="w-3.5 h-3.5 text-gray-500" />,
        text: 'Ready',
        color: 'text-gray-500'
      };
    }

    if (fileA && fileB && comparisonResult) {
      const { stats } = comparisonResult;
      if (stats.bytesChanged === 0) {
        return {
          icon: <CheckCircle className="w-3.5 h-3.5 text-green-400" />,
          text: 'Files are identical',
          color: 'text-green-400'
        };
      }
      return {
        icon: <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />,
        text: `${stats.bytesChanged} bytes changed (${stats.paramsChanged} parameters)`,
        color: 'text-yellow-400'
      };
    }

    if (fileA || fileB) {
      return {
        icon: <Database className="w-3.5 h-3.5 text-blue-400" />,
        text: 'Load second file to compare',
        color: 'text-blue-400'
      };
    }

    return {
      icon: <Circle className="w-3.5 h-3.5 text-gray-500" />,
      text: 'Ready',
      color: 'text-gray-500'
    };
  };

  const status = getStatus();

  return (
    <div className="h-7 bg-gray-800/80 border-t border-gray-700/50 flex items-center justify-between px-4 text-xs">
      {/* Left section */}
      <div className="flex items-center gap-4">
        <div className={`flex items-center gap-1.5 ${status.color}`}>
          {status.icon}
          <span>{status.text}</span>
        </div>
      </div>

      {/* Center section */}
      <div className="flex items-center gap-4 text-gray-500">
        {selectedOffset !== null && (
          <span className="font-mono">
            Offset: 0x{selectedOffset.toString(16).toUpperCase().padStart(8, '0')}
          </span>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-gray-500">
          <HardDrive className="w-3.5 h-3.5" />
          <span>
            {fileA && fileB ? (
              <>
                {formatBytes(fileA.size)} | {formatBytes(fileB.size)}
              </>
            ) : fileA ? (
              formatBytes(fileA.size)
            ) : fileB ? (
              formatBytes(fileB.size)
            ) : (
              'No files'
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {a2lDefinition ? (
            <span className="text-green-400">A2L: {a2lDefinition.moduleName || 'Loaded'}</span>
          ) : (
            <span className="text-gray-600">No A2L</span>
          )}
        </div>
      </div>
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
