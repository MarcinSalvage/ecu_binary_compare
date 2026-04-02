// File Info Panel Component

import React from 'react';
import { File, FileArchive, HardDrive, Hash, Cpu, Box } from 'lucide-react';
import { useStore } from '../stores/useStore';
import type { BinaryFile } from '../types';

interface FileInfoProps {
  file: BinaryFile | null;
  label: string;
  icon: React.ReactNode;
}

const FileInfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({
  icon,
  label,
  value
}) => (
  <div className="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0">
    <div className="text-gray-500 mt-0.5">{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm text-gray-200 font-mono truncate" title={value}>{value}</p>
    </div>
  </div>
);

export const FileInfoCard: React.FC<FileInfoProps> = ({ file, label, icon }) => {
  if (!file) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-gray-500">{icon}</div>
          <h3 className="text-sm font-medium text-gray-400">{label}</h3>
        </div>
        <p className="text-xs text-gray-600 italic">No file loaded</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-blue-400">{icon}</div>
        <h3 className="text-sm font-medium text-gray-200 truncate">{label}</h3>
      </div>

      <div className="space-y-0">
        <FileInfoItem
          icon={<File className="w-3.5 h-3.5" />}
          label="Filename"
          value={file.name}
        />
        <FileInfoItem
          icon={<HardDrive className="w-3.5 h-3.5" />}
          label="Size"
          value={formatBytes(file.size)}
        />
        <FileInfoItem
          icon={<Hash className="w-3.5 h-3.5" />}
          label="Checksum"
          value={file.md5}
        />
      </div>
    </div>
  );
};

export const A2LInfoCard: React.FC = () => {
  const { a2lDefinition, maps } = useStore();

  if (!a2lDefinition) {
    return (
      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="text-purple-400">
            <FileArchive className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-medium text-gray-400">A2L Definition</h3>
        </div>
        <p className="text-xs text-gray-600 italic">No A2L file loaded</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-purple-400">
          <FileArchive className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-medium text-gray-200">A2L Definition</h3>
      </div>

      <div className="space-y-0">
        <FileInfoItem
          icon={<Box className="w-3.5 h-3.5" />}
          label="Module"
          value={a2lDefinition.moduleName || 'Unknown'}
        />
        <FileInfoItem
          icon={<Cpu className="w-3.5 h-3.5" />}
          label="ECU"
          value={a2lDefinition.ecuName || 'Unknown'}
        />
        <FileInfoItem
          icon={<Hash className="w-3.5 h-3.5" />}
          label="CPU"
          value={a2lDefinition.cpuType || 'Unknown'}
        />
        <FileInfoItem
          icon={<File className="w-3.5 h-3.5" />}
          label="Maps Defined"
          value={maps.length.toString()}
        />
        <FileInfoItem
          icon={<File className="w-3.5 h-3.5" />}
          label="Characteristics"
          value={a2lDefinition.characteristic.length.toString()}
        />
        <FileInfoItem
          icon={<File className="w-3.5 h-3.5" />}
          label="Axis Points"
          value={a2lDefinition.axisPts.length.toString()}
        />
      </div>
    </div>
  );
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
