// Map Tree Component - Parameter difference visualization

import React, { useMemo, useCallback } from 'react';
import { ChevronRight, ChevronDown, Hash, Grid3X3, TrendingUp, Axis3D, CircleDot, Search, Filter } from 'lucide-react';
import { useStore } from '../stores/useStore';
import type { MapDefinition, Difference } from '../types';

const typeIcons: Record<MapDefinition['type'], React.ReactNode> = {
  VALUE: <Hash className="w-3.5 h-3.5 text-yellow-400" />,
  MAP: <Grid3X3 className="w-3.5 h-3.5 text-blue-400" />,
  CURVE: <TrendingUp className="w-3.5 h-3.5 text-green-400" />,
  AXIS: <Axis3D className="w-3.5 h-3.5 text-cyan-400" />,
  UNMAPPED: <CircleDot className="w-3.5 h-3.5 text-gray-500" />
};

const typeColors: Record<MapDefinition['type'], string> = {
  VALUE: 'text-yellow-400',
  MAP: 'text-blue-400',
  CURVE: 'text-green-400',
  AXIS: 'text-cyan-400',
  UNMAPPED: 'text-gray-500'
};

interface MapItemProps {
  map: MapDefinition;
  difference?: Difference;
  onSelect: (map: MapDefinition) => void;
  isSelected: boolean;
}

const MapItem: React.FC<MapItemProps> = ({ map, difference, onSelect, isSelected }) => {
  const hasChange = difference && difference.changeType !== 'EQUAL';

  const valueDisplay = useMemo(() => {
    if (difference && difference.fileA.length > 0 && difference.fileB.length > 0) {
      const rawA = readValue(difference.fileA);
      const rawB = readValue(difference.fileB);

      if (rawA !== null && rawB !== null) {
        const delta = rawB - rawA;
        const deltaPercent = rawA !== 0 ? (delta / rawA) * 100 : 0;

        return {
          fileA: '0x' + rawA.toString(16).toUpperCase(),
          fileB: '0x' + rawB.toString(16).toUpperCase(),
          delta: delta,
          deltaPercent: deltaPercent
        };
      }
    }
    return null;
  }, [difference]);

  return (
    <div
      className={`
        flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-500/20' : 'hover:bg-gray-700/30'}
        ${hasChange ? 'border-l-2 border-yellow-500' : 'border-l-2 border-transparent'}
      `}
      onClick={() => onSelect(map)}
    >
      <div className="flex-shrink-0">{typeIcons[map.type]}</div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isSelected ? 'text-blue-300' : 'text-gray-300'} truncate`}>
            {map.name}
          </span>
          <span className={`text-xs ${typeColors[map.type]}`}>
            {map.type}
          </span>
        </div>

        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
          <span className="font-mono">
            0x{map.address.toString(16).toUpperCase().padStart(8, '0')}
          </span>
          {map.dimensions && map.dimensions.length > 0 && (
            <span>
              [{map.dimensions.join(' × ')}]
            </span>
          )}
        </div>
      </div>

      {valueDisplay && (
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-gray-500">{valueDisplay.fileA}</span>
          <span className="text-gray-400">→</span>
          <span className="text-gray-300">{valueDisplay.fileB}</span>
          <span className={`${valueDisplay.delta >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {valueDisplay.delta >= 0 ? '+' : ''}{valueDisplay.delta.toFixed(0)}
            <span className="text-gray-600 ml-0.5">
              ({valueDisplay.deltaPercent >= 0 ? '+' : ''}{valueDisplay.deltaPercent.toFixed(1)}%)
            </span>
          </span>
        </div>
      )}

      {hasChange && (
        <div className="w-2 h-2 rounded-full bg-yellow-500 flex-shrink-0" title="Changed" />
      )}
    </div>
  );
};

export const MapTree: React.FC = () => {
  const {
    maps,
    differences,
    selectedOffset,
    selectOffset,
    showChangedOnly,
    toggleShowChangedOnly,
    filterText,
    setFilterText,
    filterType,
    setFilterType
  } = useStore();

  // Create a map of addresses to differences for quick lookup
  const diffMap = useMemo(() => {
    const map = new Map<number, Difference>();

    for (const diff of differences) {
      if (diff.mappedTo) {
        map.set(diff.mappedTo.address, diff);
      }
    }

    return map;
  }, [differences]);

  // Filter maps
  const filteredMaps = useMemo(() => {
    return maps.filter(map => {
      // Filter by type
      if (filterType !== 'ALL' && map.type !== filterType) {
        return false;
      }

      // Filter by search text
      if (filterText) {
        const searchLower = filterText.toLowerCase();
        return map.name.toLowerCase().includes(searchLower);
      }

      // Filter by changed only
      if (showChangedOnly) {
        const diff = diffMap.get(map.address);
        return diff && diff.changeType !== 'EQUAL';
      }

      return true;
    });
  }, [maps, filterText, filterType, showChangedOnly, diffMap]);

  // Group maps by type
  const groupedMaps = useMemo(() => {
    const groups: Record<MapDefinition['type'], MapDefinition[]> = {
      VALUE: [],
      MAP: [],
      CURVE: [],
      AXIS: [],
      UNMAPPED: []
    };

    for (const map of filteredMaps) {
      groups[map.type].push(map);
    }

    return groups;
  }, [filteredMaps]);

  const handleSelectMap = useCallback((map: MapDefinition) => {
    selectOffset(map.address);
  }, [selectOffset]);

  const changedCount = differences.filter(d => d.changeType !== 'EQUAL').length;

  return (
    <div className="h-full flex flex-col bg-gray-900/50">
      {/* Header */}
      <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">Parameters</h3>
          <span className="text-xs text-gray-500">
            {filteredMaps.length} of {maps.length}
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search parameters..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-700/50 border border-gray-600/50 rounded text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MapDefinition['type'] | 'ALL')}
            className="flex-1 px-2 py-1.5 text-xs bg-gray-700/50 border border-gray-600/50 rounded text-gray-200 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Types</option>
            <option value="VALUE">Values</option>
            <option value="MAP">Maps</option>
            <option value="CURVE">Curves</option>
            <option value="AXIS">Axes</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showChangedOnly}
              onChange={toggleShowChangedOnly}
              className="rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            Changed
          </label>
        </div>
      </div>

      {/* Map list */}
      <div className="flex-1 overflow-auto">
        {maps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Grid3X3 className="w-10 h-10 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No parameters defined</p>
            <p className="text-xs text-gray-600 mt-1">
              Load an A2L file or use auto-detection
            </p>
          </div>
        ) : filteredMaps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Search className="w-10 h-10 text-gray-600 mb-2" />
            <p className="text-sm text-gray-500">No matching parameters</p>
            <p className="text-xs text-gray-600 mt-1">
              Try adjusting your filters
            </p>
          </div>
        ) : (
          <div className="py-1">
            {/* Changed items section */}
            {changedCount > 0 && (
              <div className="mb-2">
                <div className="px-3 py-1.5 text-xs font-medium text-yellow-400 bg-yellow-500/10">
                  Changed Parameters ({changedCount})
                </div>
                {filteredMaps
                  .filter(m => {
                    const diff = diffMap.get(m.address);
                    return diff && diff.changeType !== 'EQUAL';
                  })
                  .map(map => (
                    <MapItem
                      key={map.address}
                      map={map}
                      difference={diffMap.get(map.address)}
                      onSelect={handleSelectMap}
                      isSelected={selectedOffset === map.address}
                    />
                  ))
                }
              </div>
            )}

            {/* Type groups */}
            {(['VALUE', 'MAP', 'CURVE', 'AXIS', 'UNMAPPED'] as const).map(type => {
              const items = groupedMaps[type];
              if (items.length === 0) return null;

              return (
                <div key={type} className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-800/30 flex items-center gap-2">
                    {typeIcons[type]}
                    {type} ({items.length})
                  </div>
                  {items
                    .filter(m => {
                      const diff = diffMap.get(m.address);
                      return !showChangedOnly || !diff || diff.changeType === 'EQUAL';
                    })
                    .map(map => (
                      <MapItem
                        key={map.address}
                        map={map}
                        difference={diffMap.get(map.address)}
                        onSelect={handleSelectMap}
                        isSelected={selectedOffset === map.address}
                      />
                    ))
                  }
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper to read numeric value from bytes
function readValue(bytes: Uint8Array): number | null {
  if (bytes.length === 0) return null;
  if (bytes.length === 1) return bytes[0];
  if (bytes.length === 2) return bytes[0] | (bytes[1] << 8);
  if (bytes.length === 4) return bytes[0] | (bytes[1] << 8) | (bytes[2] << 16) | (bytes[3] << 24);
  return bytes[0] | (bytes[1] << 8);
}
