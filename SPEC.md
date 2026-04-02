# ECU Binary Compare - Technical Specification

## Concept & Vision

A professional-grade binary comparison tool designed for automotive ECU engineers. The tool bridges the gap between raw binary data and human-readable parameter maps by parsing A2L/ASAP2 definition files. It provides an intuitive visual interface for comparing ECU binary files, identifying parameter changes, and exporting structured difference reports.

The aesthetic is **industrial-technical**: clean, data-dense interfaces with a dark theme reminiscent of professional diagnostic tools like INCA, CANape, or Vector tools. Confidence and precision over decoration.

---

## Design Language

### Aesthetic Direction
Industrial diagnostic software meets modern web UI. Think: dark IDE aesthetic with data visualization clarity. Monospace fonts for hex/binary data, clean sans-serif for UI elements.

### Color Palette
- **Background Primary**: `#0f1419` (deep charcoal)
- **Background Secondary**: `#1a2332` (panel backgrounds)
- **Background Tertiary**: `#242d3d` (elevated elements)
- **Border**: `#2d3748` (subtle separators)
- **Text Primary**: `#e2e8f0` (high contrast)
- **Text Secondary**: `#94a3b8` (labels, descriptions)
- **Text Muted**: `#64748b` (disabled, hints)
- **Accent Blue**: `#3b82f6` (primary actions, links)
- **Accent Green**: `#22c55e` (additions, matches)
- **Accent Red**: `#ef4444` (deletions, errors)
- **Accent Yellow**: `#eab308` (warnings, modifications)
- **Accent Purple**: `#a855f7` (map highlights)

### Typography
- **UI Text**: Inter (400, 500, 600 weights)
- **Code/Hex Data**: JetBrains Mono or Fira Code (monospace)
- **Fallbacks**: system-ui, -apple-system, sans-serif

### Spatial System
- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64
- Border radius: 4px (inputs), 8px (cards), 12px (modals)
- Panel gaps: 1px (dark separator lines)

### Motion Philosophy
- Minimal, functional animations
- Transitions: 150ms ease-out for hover states
- Panel resize: instant (no animation)
- Data loading: skeleton placeholders
- No decorative animations

### Visual Assets
- Lucide icons throughout (consistent stroke width)
- Custom hex view renderer (no images)
- Data visualization via inline SVG charts

---

## Layout & Structure

### Main Layout (Three-Panel Design)
```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Logo | File Tabs | Export Actions | Settings          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┬───────────────────────┬─────────────────────┐  │
│  │  File Info  │     Hex View         │    Map View         │  │
│  │  Panel      │     (Central)        │    (Right)          │  │
│  │             │                       │                     │  │
│  │  - A2L Def  │  - Side-by-side      │  - Parameter tree   │  │
│  │  - Stats    │  - Byte highlighting │  - Value diffs      │  │
│  │  - Maps     │  - Navigation        │  - Change markers    │  │
│  │             │                       │                     │  │
│  └─────────────┴───────────────────────┴─────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Status Bar: File sizes | Differences count | Parse status      │
└─────────────────────────────────────────────────────────────────┘
```

### Panel Behavior
- Left panel (300px): Collapsible, file metadata and map definitions
- Center panel (flex): Hex comparison view, scroll-synced
- Right panel (350px): Collapsible, parameter difference tree

### Responsive Strategy
- Minimum width: 1280px (professional tool, desktop-focused)
- Panels stack vertically on narrower screens
- Mobile: simplified read-only view

---

## Features & Interactions

### Core Features

#### 1. File Loading
- **Supported formats**:
  - Binary files (.bin, .hex, .s19)
  - A2L/ASAP2 definition files (.a2l, .aml)
  - Project files (.xp, .cp)
- **Drag-and-drop** with file type auto-detection
- **Recent files** list (localStorage)
- **File validation**: magic bytes, checksums displayed

#### 2. A2L/ASAP2 Parser
Parses ECU definition files to extract:
- **Characteristic/Parameter definitions**:
  - Values (scalars)
  - Maps (2D, 3D, n-D lookup tables)
  - Curves (1D function plots)
  - Axis definitions (reference axes, break points)
- **COMPU_METHOD**: Conversion formulas (physical ↔ raw)
- **RECORD_LAYOUT**: Memory layout information
- **MOD_PAR**: Module parameters (ECU identification)

#### 3. Binary Comparison Engine
- **Byte-level diff**: Exact byte comparison
- **Map-level diff**: When A2L definitions provided, aligns to parameter boundaries
- **Intelligent matching**:
  - By offset (when no A2L)
  - By symbol name (when A2L provided)
  - Fuzzy matching for relocated parameters

#### 4. Hex View (Center Panel)
- **Dual-pane view**: File A | File B
- **Synchronized scrolling**: Both files scroll together
- **Color coding**:
  - Green highlight: Added bytes
  - Red highlight: Removed bytes
  - Yellow highlight: Modified bytes
  - Purple highlight: Map/parameter boundaries (when A2L loaded)
- **Selection**: Click to select, multi-select with Shift
- **Navigation**: Go to offset, search for bytes/patterns
- **Context menu**: Copy hex, copy value, jump to map

#### 5. Map View (Right Panel)
- **Tree structure** matching A2L hierarchy
- **Parameter types with icons**:
  - 📊 Values (single values)
  - 🗺️ Maps (2D/3D lookup tables)
  - 📈 Curves (1D functions)
  - 📐 Axes (axis definitions)
- **Value display**:
  - Raw hex value
  - Physical value (using COMPU_METHOD conversion)
  - Difference (Δ) with percentage
- **Filtering**:
  - Show all / Show changed only
  - Filter by type
  - Search by name
- **Sort**: By address, by name, by change magnitude

#### 6. Difference Summary
- **Statistics panel**:
  - Total bytes compared
  - Bytes changed
  - Parameters changed
  - Percentage changed
- **Change log**: Chronological list of all changes
- **Export options**:
  - JSON (full structured data)
  - CSV (tabular format)
  - HTML report (visual)
  - Patch file (.bin delta)

#### 7. Map Pattern Recognition
Automatically identifies common map patterns:
- **Axis maps**: X/Y axis breakpoint arrays
- **Value maps**: 2D/3D interpolation tables
- **Axis descriptors**: Standard ASAP2 axis formats
- **Virtual functions**: Computed values from maps

### Interaction Details

#### File Drop Zone
- **Drag enter**: Border pulses blue, "Drop files here" overlay
- **Drag over valid**: Green tint
- **Drag over invalid**: Red tint with error message
- **Drop**: Files load with progress indicator

#### Hex View Interactions
- **Click byte**: Select single byte, show details in tooltip
- **Shift+Click**: Range selection
- **Ctrl+Click**: Add to selection
- **Right-click**: Context menu (copy, search, navigate to map)
- **Hover**: Tooltip with address, value, and associated map (if any)

#### Map Tree Interactions
- **Click item**: Highlight corresponding bytes in hex view
- **Double-click**: Expand/collapse for maps (show table view)
- **Right-click**: Copy value, copy address, view history (if available)

#### Keyboard Shortcuts
- `Ctrl+O`: Open files
- `Ctrl+S`: Export differences
- `Ctrl+F`: Search
- `Ctrl+G`: Go to offset
- `F3`: Find next
- `Esc`: Clear selection

### Error Handling
- **Invalid file**: Toast notification with specific error
- **Parse error**: Detailed error in status bar, partial data shown
- **Memory limits**: Warning for files > 100MB, streaming mode

### Edge Cases
- **Empty file**: Display "Empty file" message
- **Binary vs ASCII**: Auto-detect and display appropriately
- **Different file sizes**: Highlight size mismatch, compare common range
- **Unknown maps**: Mark as "Unmapped" with raw offset

---

## Component Inventory

### FileDropZone
- **Default**: Dashed border, icon + "Drop files or click to browse"
- **Hover**: Border color brightens
- **Drag active**: Pulsing border, text changes
- **Error**: Red border, error message
- **Loading**: Progress bar overlay

### FileInfoPanel
- **Empty**: "Load files to see info"
- **Loaded**: File name, size, MD5, format
- **With A2L**: Module name, ECU ID, calibration system

### HexView
- **Header row**: Offset | Hex bytes (16) | ASCII representation
- **Data row**: Address | [0x00 0x01 ...] | "....ABC..."
- **Highlight states**: Background color per byte based on diff status
- **Selection**: Semi-transparent blue overlay
- **Current line**: Slightly elevated background

### MapTree
- **Item states**: Default, hover, selected, expanded
- **Type icons**: Color-coded by parameter type
- **Change indicators**: Colored dot (green/red/yellow)
- **Value cells**: Monospace, aligned right
- **Delta display**: Small badge with change magnitude

### DiffStats
- **Circular progress**: Visual percentage indicator
- **Count badges**: Numbers with icons
- **Sparkline**: Mini chart of changes across file

### ExportModal
- **Format selection**: Radio buttons for JSON/CSV/HTML/Patch
- **Options checkboxes**: Include raw data, include unchanged, etc.
- **Preview**: Sample output snippet
- **Actions**: Cancel, Export buttons

### Toast Notifications
- **Types**: Success (green), Error (red), Warning (yellow), Info (blue)
- **Position**: Bottom-right stack
- **Duration**: 5s auto-dismiss (errors persist)
- **Actions**: Dismiss, retry (where applicable)

### StatusBar
- **Left**: File info summary
- **Center**: Current offset, selection info
- **Right**: Parser status, memory usage

---

## Technical Approach

### Frontend Architecture
- **Framework**: React 18 + TypeScript
- **Build**: Vite 6
- **State**: Zustand for global state
- **Styling**: Tailwind CSS

### Key Libraries
- `jszip`: For reading ZIP-compressed A2L files
- `file-saver`: For exporting
- `react-window`: Virtualized lists for large files
- `zustand`: State management
- `lucide-react`: Icons

### Binary Processing
All binary processing happens client-side:
- FileReader API for loading
- ArrayBuffer for binary manipulation
- TypedArrays (Uint8Array, Int32Array, Float32Array) for data views
- Web Workers for heavy comparison (non-blocking UI)

### A2L Parser
Custom parser supporting ASAP2 1.51 specification:
- Characteristic/Parameter blocks
- Axis_Pts definitions
- CompuMethod conversions
- RecordLayout memory mapping
- MOD_COMMON/ECU specifications

### Data Model

```typescript
interface BinaryFile {
  name: string;
  path: string;
  size: number;
  md5: string;
  data: Uint8Array;
}

interface MapDefinition {
  name: string;
  type: 'VALUE' | 'MAP' | 'CURVE' | 'AXIS';
  address: number;
  size: number;
  dimensions?: number[];
  axisRefs?: string[];
  compuMethod?: string;
  rawValue: number | number[];
  physicalValue?: number | number[][];
}

interface Difference {
  offset: number;
  length: number;
  fileA: Uint8Array;
  fileB: Uint8Array;
  mappedTo?: MapDefinition;
  changeType: 'ADDED' | 'REMOVED' | 'MODIFIED';
}

interface ComparisonResult {
  fileA: BinaryFile;
  fileB: BinaryFile;
  differences: Difference[];
  maps: MapDefinition[];
  stats: {
    totalBytes: number;
    bytesChanged: number;
    paramsChanged: number;
    percentChanged: number;
  };
}
```

### JSON Export Format
```json
{
  "metadata": {
    "tool": "ECU Binary Compare",
    "version": "1.0.0",
    "timestamp": "2024-01-15T10:30:00Z",
    "fileA": { "name": "...", "size": 1234, "md5": "..." },
    "fileB": { "name": "...", "size": 1234, "md5": "..." }
  },
  "statistics": {
    "totalBytes": 1048576,
    "bytesChanged": 256,
    "parametersChanged": 12,
    "percentChanged": 0.024
  },
  "differences": [
    {
      "offset": "0x1234",
      "parameter": "Engine_Speed_Limit",
      "address": "0x1234",
      "size": 2,
      "fileA_value": { "raw": "0x1F40", "physical": "8000 rpm" },
      "fileB_value": { "raw": "0x2328", "physical": "9000 rpm" },
      "delta": { "absolute": 1000, "percent": 12.5 }
    }
  ],
  "maps": [
    {
      "name": "Fuel_Map",
      "type": "MAP",
      "address": "0x5000",
      "dimensions": [16, 16],
      "values": { "fileA": [...], "fileB": [...] }
    }
  ]
}
```

---

## File Structure
```
src/
├── components/
│   ├── FileDropZone.tsx
│   ├── FileInfoPanel.tsx
│   ├── HexView.tsx
│   ├── MapTree.tsx
│   ├── DiffStats.tsx
│   ├── ExportModal.tsx
│   ├── StatusBar.tsx
│   └── Toast.tsx
├── lib/
│   ├── binary.ts          # Binary comparison engine
│   ├── a2l-parser.ts      # ASAP2/A2L parser
│   ├── maps.ts            # Map pattern recognition
│   └── export.ts          # Export formatters
├── stores/
│   └── useStore.ts        # Zustand store
├── types/
│   └── index.ts            # TypeScript interfaces
├── App.tsx
└── main.tsx
```
