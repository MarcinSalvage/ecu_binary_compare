// Diff Stats Component - Statistics overview

import React from 'react';
import { HardDrive, AlertTriangle, Hash, Percent, TrendingUp } from 'lucide-react';
import { useStore } from '../stores/useStore';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'warning' | 'success' | 'danger';
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  subValue,
  variant = 'default'
}) => {
  const variantStyles = {
    default: 'text-gray-300',
    warning: 'text-yellow-400',
    success: 'text-green-400',
    danger: 'text-red-400'
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-gray-500">{icon}</div>
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <div className={`text-xl font-semibold font-mono ${variantStyles[variant]}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {subValue && (
        <div className="text-xs text-gray-500 mt-0.5">{subValue}</div>
      )}
    </div>
  );
};

export const DiffStats: React.FC = () => {
  const { comparisonResult } = useStore();

  if (!comparisonResult) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<HardDrive className="w-4 h-4" />}
          label="Total Bytes"
          value="—"
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Changed"
          value="—"
        />
        <StatCard
          icon={<Hash className="w-4 h-4" />}
          label="Parameters"
          value="—"
        />
        <StatCard
          icon={<Percent className="w-4 h-4" />}
          label="Changed"
          value="—"
        />
      </div>
    );
  }

  const { stats, fileA, fileB } = comparisonResult;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatCard
          icon={<HardDrive className="w-4 h-4" />}
          label="Total Bytes"
          value={stats.totalBytes}
          subValue={`${formatBytes(stats.totalBytes)}`}
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Bytes Changed"
          value={stats.bytesChanged}
          variant={stats.bytesChanged > 0 ? 'warning' : 'success'}
        />
        <StatCard
          icon={<Hash className="w-4 h-4" />}
          label="Parameters"
          value={stats.paramsChanged}
          variant={stats.paramsChanged > 0 ? 'warning' : 'success'}
        />
        <StatCard
          icon={<Percent className="w-4 h-4" />}
          label="Changed"
          value={`${stats.percentChanged.toFixed(3)}%`}
          variant={stats.percentChanged > 1 ? 'danger' : stats.percentChanged > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Size comparison bar */}
      {fileA.size !== fileB.size && (
        <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-gray-500" />
            <span className="text-xs text-gray-500 uppercase tracking-wide">Size Comparison</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400">{formatBytes(fileA.size)}</span>
            <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{ width: `${Math.min(100, (fileA.size / Math.max(fileA.size, fileB.size)) * 100)}%` }}
              />
            </div>
            <span className="text-gray-400">{formatBytes(fileB.size)}</span>
          </div>
          {fileA.size < fileB.size ? (
            <p className="text-xs text-yellow-400 mt-1">
              File B is {formatBytes(fileB.size - fileA.size)} larger
            </p>
          ) : (
            <p className="text-xs text-yellow-400 mt-1">
              File A is {formatBytes(fileA.size - fileB.size)} larger
            </p>
          )}
        </div>
      )}

      {/* File info */}
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Files</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 truncate flex-1 mr-2">{fileA.name}</span>
            <span className="text-gray-500 font-mono">{fileA.md5.slice(0, 8)}...</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400 truncate flex-1 mr-2">{fileB.name}</span>
            <span className="text-gray-500 font-mono">{fileB.md5.slice(0, 8)}...</span>
          </div>
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
