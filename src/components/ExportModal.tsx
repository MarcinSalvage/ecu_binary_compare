// Export Modal Component

import React, { useState } from 'react';
import { X, Download, FileJson, FileText, FileCode, Settings } from 'lucide-react';
import { useStore } from '../stores/useStore';
import { exportDifferences, downloadFile, getExportFilename } from '../lib/export';
import type { ExportOptions } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { comparisonResult } = useStore();

  const [format, setFormat] = useState<ExportOptions['format']>('json');
  const [includeRawData, setIncludeRawData] = useState(true);
  const [includeUnchanged, setIncludeUnchanged] = useState(false);
  const [includeMaps, setIncludeMaps] = useState(true);

  if (!isOpen) return null;

  const handleExport = () => {
    if (!comparisonResult) return;

    const options: ExportOptions = {
      format,
      includeRawData,
      includeUnchanged,
      includeMaps
    };

    const content = exportDifferences(comparisonResult, options);
    const mimeTypes: Record<string, string> = {
      json: 'application/json',
      csv: 'text/csv',
      html: 'text/html'
    };

    const filename = getExportFilename(comparisonResult.fileA.name, format);
    downloadFile(content, filename, mimeTypes[format]);
    onClose();
  };

  const formatOptions = [
    {
      value: 'json' as const,
      label: 'JSON',
      description: 'Full structured data with all details',
      icon: <FileJson className="w-5 h-5" />
    },
    {
      value: 'csv' as const,
      label: 'CSV',
      description: 'Spreadsheet-compatible tabular format',
      icon: <FileText className="w-5 h-5" />
    },
    {
      value: 'html' as const,
      label: 'HTML',
      description: 'Visual report for viewing in browser',
      icon: <FileCode className="w-5 h-5" />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-100">Export Differences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-5 py-4 space-y-5">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Export Format
            </label>
            <div className="space-y-2">
              {formatOptions.map((option) => (
                <label
                  key={option.value}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors
                    ${format === option.value
                      ? 'bg-blue-500/20 border border-blue-500/50'
                      : 'bg-gray-700/30 border border-transparent hover:bg-gray-700/50'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="format"
                    value={option.value}
                    checked={format === option.value}
                    onChange={() => setFormat(option.value)}
                    className="sr-only"
                  />
                  <div className={`${format === option.value ? 'text-blue-400' : 'text-gray-400'}`}>
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${format === option.value ? 'text-blue-300' : 'text-gray-200'}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              <span className="flex items-center gap-1">
                <Settings className="w-4 h-4" />
                Options
              </span>
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/30 cursor-pointer hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={includeRawData}
                  onChange={(e) => setIncludeRawData(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Include raw byte data</span>
              </label>

              <label className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/30 cursor-pointer hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={includeUnchanged}
                  onChange={(e) => setIncludeUnchanged(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Include unchanged bytes</span>
              </label>

              <label className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/30 cursor-pointer hover:bg-gray-700/50 transition-colors">
                <input
                  type="checkbox"
                  checked={includeMaps}
                  onChange={(e) => setIncludeMaps(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-300">Include map definitions</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={!comparisonResult}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2
              ${comparisonResult
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
              }
            `}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};
