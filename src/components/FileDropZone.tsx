// File Drop Zone Component

import React, { useCallback, useState } from 'react';
import { Upload, File, FileArchive, AlertCircle } from 'lucide-react';

interface FileDropZoneProps {
  onFileDrop: (file: File, type: 'bin' | 'a2l') => void;
  label: string;
  accept?: string;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFileDrop,
  label,
  accept = '.bin,.hex,.a2l,.aml'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setError(null);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0];
    const type = detectFileType(file);
    onFileDrop(file, type);
  }, [onFileDrop]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const type = detectFileType(file);
    onFileDrop(file, type);
  }, [onFileDrop]);

  const detectFileType = (file: File): 'bin' | 'a2l' => {
    const ext = file.name.toLowerCase().split('.').pop() || '';

    if (['a2l', 'aml', 'xcp'].includes(ext)) {
      return 'a2l';
    }

    return 'bin';
  };

  const getIcon = () => {
    if (error) return <AlertCircle className="w-12 h-12 text-red-400" />;
    if (accept.includes('a2l')) return <FileArchive className="w-12 h-12 text-blue-400" />;
    return <File className="w-12 h-12 text-blue-400" />;
  };

  return (
    <div className="relative">
      <div
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-all duration-150
          ${isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : error
              ? 'border-red-500 bg-red-500/5'
              : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
          }
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="flex flex-col items-center gap-3">
          {isDragging ? (
            <Upload className="w-12 h-12 text-blue-400 animate-bounce" />
          ) : (
            getIcon()
          )}

          <div>
            <p className="text-sm font-medium text-gray-300">{label}</p>
            <p className="text-xs text-gray-500 mt-1">
              {accept.includes('a2l')
                ? 'Drop .bin, .hex, .a2l, or .aml files'
                : 'Drop .bin, .hex files'
              }
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-400 mt-2">{error}</p>
      )}
    </div>
  );
};
