# Reusable Handsontable Grid System

This is a comprehensive, reusable grid system built with Handsontable, React, and TypeScript that serves as a template for creating advanced data grids with various UI elements.

## Features

- **Multiple UI Elements**: Images, graphs, buttons, tags, toggles, progress bars, badges
- **Themes**: Light and dark mode support
- **Custom Renderers**: Pre-built renderers for common UI components
- **Responsive Design**: Resizable container with Material-UI integration
- **Advanced Functionality**: Sorting, filtering, search, copy/paste, context menus
- **Type Safety**: Full TypeScript support with comprehensive interfaces

## File Structure

```
├── page.tsx                    # Main component using the reusable hook
├── useHandsontableGrid.ts      # Custom hook providing grid functionality
├── grid-types.ts              # TypeScript interfaces and types
└── handsontable-grid.css      # Centralized CSS for styling and themes
```

## Usage

### Basic Setup

```tsx
import { useHandsontableGrid } from './useHandsontableGrid';
import { User } from './grid-types';
import './handsontable-grid.css';

const MyGridComponent = () => {
  const hotRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<User[]>([]);

  const gridConfig = {
    columns: [
      { data: "name", readOnly: false },
      { data: "email", readOnly: false },
      // ... more columns
    ],
    colHeaders: ["Name", "Email"],
    // ... other Handsontable options
  };

  const { instance, isInitialized } = useHandsontableGrid({
    config: gridConfig,
    containerRef: hotRef,
    data: data,
    isEditable: true,
    theme: 'light',
    alternatingRows: true
  });

  return (
    <div
      ref={hotRef}
      className="handsontable-container ht-theme-light ht-alternating-rows"
    />
  );
};
```

### Available Renderers

#### Image Renderer
```tsx
import { createImageRenderer } from './useHandsontableGrid';

{
  data: "avatar",
  renderer: createImageRenderer('?') // fallback text
}
```

#### Badge Renderer
```tsx
import { createBadgeRenderer } from './useHandsontableGrid';

{
  data: "status",
  renderer: createBadgeRenderer({
    active: '#4caf50',
    inactive: '#f44336',
    pending: '#ff9800'
  })
}
```

#### Progress Bar Renderer
```tsx
import { createProgressRenderer } from './useHandsontableGrid';

{
  data: "progress",
  renderer: createProgressRenderer()
}
```

#### Tag Renderer
```tsx
import { createTagRenderer } from './useHandsontableGrid';

{
  data: "tags",
  renderer: createTagRenderer()
}
```

#### Graph Renderer
```tsx
import { createGraphRenderer } from './useHandsontableGrid';

{
  data: "graph",
  renderer: createGraphRenderer()
}
```

#### Action Button Renderer
```tsx
import { createActionButtonRenderer } from './useHandsontableGrid';

{
  data: "actions",
  renderer: createActionButtonRenderer([
    {
      className: 'edit-btn',
      icon: '✏️',
      title: 'Edit',
      onClick: (rowData, row, instance) => {
        // Handle edit action
      }
    },
    {
      className: 'delete-btn',
      icon: '🗑️',
      title: 'Delete',
      onClick: (rowData, row, instance) => {
        // Handle delete action
      }
    }
  ])
}
```

## Configuration Options

### GridConfig Interface

```typescript
interface GridConfig {
  columns: GridColumn[];
  colHeaders: string[];
  data?: any[];
  height?: number | string;
  width?: string;
  stretchH?: "none" | "all" | "last";
  rowHeaders?: boolean;
  manualColumnResize?: boolean;
  manualColumnMove?: boolean;
  columnSorting?: boolean;
  manualRowResize?: boolean;
  manualRowMove?: boolean;
  filters?: boolean;
  dropdownMenu?: boolean;
  copyPaste?: boolean;
  search?: boolean;
  autoColumnSize?: boolean;
  autoRowSize?: boolean;
  mergeCells?: boolean;
  comments?: boolean;
  customBorders?: boolean;
  multiColumnSorting?: boolean;
  hiddenRows?: boolean;
  hiddenColumns?: boolean;
  nestedHeaders?: string[][];
  fillHandle?: boolean;
  fixedRowsTop?: number;
  fixedColumnsLeft?: number;
  viewportRowRenderingOffset?: number;
  viewportColumnRenderingOffset?: number;
  contextMenu?: any;
  afterChange?: (changes: Handsontable.CellChange[] | null, source: Handsontable.ChangeSource) => void;
  beforeRemoveRow?: (index: number, amount: number) => void;
}
```

### Hook Props

```typescript
interface UseHandsontableGridProps {
  config: GridConfig;
  containerRef: React.RefObject<HTMLDivElement | null>;
  data?: any[];
  isEditable?: boolean;
  theme?: 'light' | 'dark';
  alternatingRows?: boolean;
}
```

## Styling

The system uses centralized CSS classes for consistent theming:

- `.handsontable-container` - Main container
- `.ht-theme-light` - Light theme
- `.ht-theme-dark` - Dark theme
- `.ht-alternating-rows` - Alternating row colors
- `.action-btn` - Action button styling
- `.edit-btn`, `.delete-btn`, etc. - Specific action button styles

## Data Types

```typescript
interface User {
  id: number;
  email: string;
  name?: string;
  avatar?: string;
  status?: 'active' | 'inactive' | 'pending';
  progress?: number;
  graph?: string;
  tags?: string[];
  verified?: boolean;
  lastLogin?: string;
  role?: 'admin' | 'user' | 'moderator';
}

interface GridChange {
  type: 'add' | 'update' | 'delete';
  user: User;
  newData?: Partial<User>;
  rowIndex?: number;
}
```

## Dependencies

- `handsontable` - Core grid library
- `react` - UI framework
- `@mui/material` - Material-UI components
- `react-resizable` - Resizable container
- `typescript` - Type safety

## Customization

To create your own renderer:

```typescript
const customRenderer = (instance: any, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties: any) => {
  // Your custom rendering logic
  td.innerHTML = `<div>Your custom content</div>`;
  return td;
};
```

## Best Practices

1. **Always use the hook**: Don't instantiate Handsontable directly
2. **Type your data**: Use proper TypeScript interfaces
3. **Centralize styles**: Use the provided CSS classes
4. **Handle refs properly**: Ensure container refs are properly typed
5. **Use renderers consistently**: Leverage the pre-built renderers for common UI elements

## Example Implementation

See `page.tsx` for a complete example of how to use this reusable grid system with all features enabled.
