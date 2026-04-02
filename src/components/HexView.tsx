// Hex View Component - Side-by-side binary comparison

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useStore } from '../stores/useStore';
import type { Difference } from '../types';

const BYTES_PER_ROW = 16;
const ROW_HEIGHT = 24;

interface HexByteProps {
  byte: number | null;
  isDiff: boolean;
  diffType?: 'ADDED' | 'REMOVED' | 'MODIFIED' | 'EQUAL';
  isSelected: boolean;
  onClick: () => void;
}

const HexByte: React.FC<HexByteProps> = ({ byte, isDiff, diffType, isSelected, onClick }) => {
  const bgColor = useMemo(() => {
    if (isSelected) return 'bg-blue-500/40';
    if (!isDiff) return 'bg-transparent';
    switch (diffType) {
      case 'ADDED': return 'bg-green-500/30';
      case 'REMOVED': return 'bg-red-500/30';
      case 'MODIFIED': return 'bg-yellow-500/30';
      default: return 'bg-transparent';
    }
  }, [isSelected, isDiff, diffType]);

  const textColor = useMemo(() => {
    if (byte === null) return 'text-gray-600';
    if (isDiff) {
      switch (diffType) {
        case 'ADDED': return 'text-green-400';
        case 'REMOVED': return 'text-red-400';
        case 'MODIFIED': return 'text-yellow-400';
      }
    }
    return 'text-gray-300';
  }, [byte, isDiff, diffType]);

  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-5 text-xs font-mono cursor-pointer transition-colors ${bgColor} ${textColor} hover:bg-blue-500/20`}
      onClick={onClick}
    >
      {byte !== null ? byte.toString(16).padStart(2, '0').toUpperCase() : '--'}
    </span>
  );
};

interface AsciiByteProps {
  byte: number | null;
  isDiff: boolean;
  diffType?: 'ADDED' | 'REMOVED' | 'MODIFIED';
}

const AsciiByte: React.FC<AsciiByteProps> = ({ byte, isDiff, diffType }) => {
  const bgColor = useMemo(() => {
    if (!isDiff) return 'bg-transparent';
    switch (diffType) {
      case 'ADDED': return 'bg-green-500/20';
      case 'REMOVED': return 'bg-red-500/20';
      case 'MODIFIED': return 'bg-yellow-500/20';
      default: return 'bg-transparent';
    }
  }, [isDiff, diffType]);

  const char = byte !== null && byte >= 32 && byte < 127
    ? String.fromCharCode(byte)
    : '.';

  return (
    <span className={`inline-flex items-center justify-center w-3.5 h-5 text-xs font-mono ${bgColor} text-gray-400`}>
      {char}
    </span>
  );
};

export const HexView: React.FC = () => {
  const { fileA, fileB, differences, selectedOffset, selectOffset, comparisonResult } = useStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollSync, setScrollSync] = useState(true);

  // Create a map of offsets to diff info for quick lookup
  const diffMap = useMemo(() => {
    const map = new Map<number, { diff: Difference; relativeOffset: number }>();

    for (const diff of differences) {
      for (let i = 0; i < diff.length; i++) {
        map.set(diff.offset + i, {
          diff,
          relativeOffset: i
        });
      }
    }

    return map;
  }, [differences]);

  // Generate rows for display
  const rows = useMemo(() => {
    if (!fileA && !fileB) return [];

    const maxLength = Math.max(
      fileA?.data.length || 0,
      fileB?.data.length || 0
    );

    const result: Array<{
      offset: number;
      bytesA: (number | null)[];
      bytesB: (number | null)[];
      hasDiff: boolean;
    }> = [];

    for (let offset = 0; offset < maxLength; offset += BYTES_PER_ROW) {
      const bytesA: (number | null)[] = [];
      const bytesB: (number | null)[] = [];

      for (let i = 0; i < BYTES_PER_ROW; i++) {
        const addr = offset + i;
        bytesA.push(fileA && addr < fileA.data.length ? fileA.data[addr] : null);
        bytesB.push(fileB && addr < fileB.data.length ? fileB.data[addr] : null);
      }

      const hasDiff = bytesA.some((b, i) => b !== bytesB[i]);

      result.push({ offset, bytesA, bytesB, hasDiff });
    }

    return result;
  }, [fileA, fileB]);

  const handleByteClick = useCallback((offset: number) => {
    selectOffset(selectedOffset === offset ? null : offset);
  }, [selectedOffset, selectOffset]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (scrollSync && containerRef.current) {
      const scrollTop = e.currentTarget.scrollTop;
      const containers = containerRef.current.querySelectorAll('.scroll-sync');
      containers.forEach((c) => {
        if (c !== e.currentTarget) {
          c.scrollTop = scrollTop;
        }
      });
    }
  }, [scrollSync]);

  if (!fileA && !fileB) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-900/50">
        <div className="text-center">
          <div className="text-gray-600 text-6xl mb-4">📊</div>
          <p className="text-gray-500 text-sm">Load binary files to view comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800/50 border-b border-gray-700/50">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-medium text-gray-300">Hex View</h3>
          {comparisonResult && (
            <span className="text-xs text-gray-500">
              {comparisonResult.stats.bytesChanged} bytes changed
            </span>
          )}
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            checked={scrollSync}
            onChange={(e) => setScrollSync(e.target.checked)}
            className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
          />
          Sync scroll
        </label>
      </div>

      {/* Column headers */}
      <div className="flex border-b border-gray-700/50 text-xs font-medium text-gray-500 uppercase tracking-wider">
        <div className="w-20 px-2 py-1.5">Offset</div>
        <div className="flex-1 px-2 py-1.5 border-l border-gray-700/50">
          {fileA?.name || 'File A'}
        </div>
        <div className="flex-1 px-2 py-1.5 border-l border-gray-700/50">
          {fileB?.name || 'File B'}
        </div>
      </div>

      {/* Hex content */}
      <div ref={containerRef} className="flex-1 overflow-auto font-mono text-xs">
        <div className="flex min-h-full">
          {/* File A column */}
          <div className="flex-1 border-r border-gray-700/50">
            {rows.map((row) => (
              <div
                key={`a-${row.offset}`}
                className={`flex h-6 hover:bg-gray-800/30 ${
                  selectedOffset !== null &&
                  selectedOffset >= row.offset &&
                  selectedOffset < row.offset + BYTES_PER_ROW
                    ? 'bg-blue-500/10'
                    : ''
                }`}
              >
                <div className="w-20 px-2 py-1 text-right text-gray-500 border-r border-gray-700/30 flex-shrink-0">
                  {row.offset.toString(16).toUpperCase().padStart(8, '0')}
                </div>
                <div className="flex items-center gap-0.5 px-2">
                  {row.bytesA.map((byte, i) => {
                    const offset = row.offset + i;
                    const diffInfo = diffMap.get(offset);
                    return (
                      <HexByte
                        key={i}
                        byte={byte}
                        isDiff={diffInfo?.diff.changeType !== 'EQUAL'}
                        diffType={diffInfo?.diff.changeType}
                        isSelected={selectedOffset === offset}
                        onClick={() => handleByteClick(offset)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* File B column */}
          <div className="flex-1">
            {rows.map((row) => (
              <div
                key={`b-${row.offset}`}
                className={`flex h-6 hover:bg-gray-800/30 ${
                  selectedOffset !== null &&
                  selectedOffset >= row.offset &&
                  selectedOffset < row.offset + BYTES_PER_ROW
                    ? 'bg-blue-500/10'
                    : ''
                }`}
              >
                <div className="w-20 px-2 py-1 text-right text-gray-500 border-r border-gray-700/30 flex-shrink-0">
                  {row.offset.toString(16).toUpperCase().padStart(8, '0')}
                </div>
                <div className="flex items-center gap-0.5 px-2">
                  {row.bytesB.map((byte, i) => {
                    const offset = row.offset + i;
                    const diffInfo = diffMap.get(offset);
                    return (
                      <HexByte
                        key={i}
                        byte={byte}
                        isDiff={diffInfo?.diff.changeType !== 'EQUAL'}
                        diffType={diffInfo?.diff.changeType}
                        isSelected={selectedOffset === offset}
                        onClick={() => handleByteClick(offset)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2 bg-gray-800/50 border-t border-gray-700/50 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500/30"></div>
          <span className="text-gray-500">Added</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/30"></div>
          <span className="text-gray-500">Removed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-500/30"></div>
          <span className="text-gray-500">Modified</span>
        </div>
        <div className="flex-1"></div>
        <span className="text-gray-600">Click on a byte to see details</span>
      </div>
    </div>
  );
};
