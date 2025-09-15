import { useState, useEffect, useRef, useCallback } from 'react';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.min.css';

export interface GridColumn {
  data: string | number;
  readOnly?: boolean;
  width?: number;
  hidden?: boolean;
  className?: string;
  type?: string;
  editor?: string | boolean;
  dateFormat?: string;
  correctFormat?: boolean;
  defaultDate?: string;
  renderer?: (instance: Handsontable, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties: Handsontable.CellProperties) => void;
}

export interface GridConfig {
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
  nestedHeaders?: string[][];
  fillHandle?: boolean;
  fixedRowsTop?: number;
  fixedColumnsLeft?: number;
  viewportRowRenderingOffset?: number;
  viewportColumnRenderingOffset?: number;
  contextMenu?: any;
  afterChange?: (changes: Handsontable.CellChange[] | null, source: Handsontable.ChangeSource) => void;
  afterSelection?: (row: number, column: number, row2: number, column2: number, preventScrolling: any, selectionLayerLevel: number) => void;
  selectionMode?: 'single' | 'range' | 'multiple';
  outsideClickDeselects?: boolean;
  beforeRemoveRow?: (index: number, amount: number) => void;
}

export interface UseHandsontableGridProps {
  config: GridConfig;
  containerRef: React.RefObject<HTMLDivElement | null>;
  data?: any[];
  isEditable?: boolean;
  theme?: 'light' | 'dark';
  alternatingRows?: boolean;
  onChange?: (changes: Handsontable.CellChange[] | null, source: Handsontable.ChangeSource) => void;
}

export const useHandsontableGrid = ({
  config,
  containerRef,
  data = [],
  isEditable = false,
  theme = 'light',
  alternatingRows = false,
  onChange
}: UseHandsontableGridProps) => {
  const hotInstanceRef = useRef<Handsontable | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const isMountedRef = useRef(true);

  // Initialize Handsontable
  useEffect(() => {
    if (containerRef.current && !hotInstanceRef.current) {
      console.log('Initializing Handsontable...');
      console.log('Config:', config);
      console.log('Data length:', data.length);
      
      const hot = new Handsontable(containerRef.current, {
        data: [], // Start with empty data
        licenseKey: "non-commercial-and-evaluation",
        ...config,
        afterChange: onChange
      });

      hotInstanceRef.current = hot;
      setIsInitialized(true);
      console.log('Handsontable initialized');
    }

    return () => {
      isMountedRef.current = false;
      if (hotInstanceRef.current) {
        console.log('Destroying Handsontable');
        hotInstanceRef.current.destroy();
        hotInstanceRef.current = null;
        setIsInitialized(false);
      }
    };
  }, [config, containerRef, onChange]); // Removed data from dependencies

  // Update data when it changes
  useEffect(() => {
    if (hotInstanceRef.current && isInitialized && isMountedRef.current) {
      console.log('Loading data into Handsontable:', data.length, 'rows');
      hotInstanceRef.current.loadData(data);
      console.log('Data loaded successfully');
    }
  }, [data, isInitialized]);

  // Update settings when config changes
  useEffect(() => {
    if (hotInstanceRef.current && isInitialized && isMountedRef.current) {
      console.log('Updating Handsontable settings');
      hotInstanceRef.current.updateSettings({
        ...config,
        allowRemoveRow: isEditable,
        minSpareRows: isEditable ? 1 : 0,
      });
      console.log('Settings updated successfully');
    }
  }, [config, isEditable, isInitialized]);

  // Apply theme and alternating rows
  useEffect(() => {
    if (hotInstanceRef.current && isInitialized && isMountedRef.current) {
      const hotElement = hotInstanceRef.current.rootElement;

      if (hotElement) {
        // Remove existing theme classes
        hotElement.classList.remove('ht-theme-dark', 'ht-theme-light', 'ht-alternating-rows');

        // Add current theme class
        if (theme === 'dark') {
          hotElement.classList.add('ht-theme-dark');
        } else {
          hotElement.classList.add('ht-theme-light');
        }

        // Add alternating rows class if enabled
        if (alternatingRows) {
          hotElement.classList.add('ht-alternating-rows');
        }
      }
    }
  }, [theme, alternatingRows, isInitialized]);

  const getInstance = useCallback(() => hotInstanceRef.current, []);
  const getData = useCallback(() => hotInstanceRef.current?.getData() || [], []);
  const getSourceData = useCallback(() => hotInstanceRef.current?.getSourceData() || [], []);
  const getSourceDataAtRow = useCallback((row: number) => hotInstanceRef.current?.getSourceDataAtRow(row), []);
  const updateSettings = useCallback((settings: Partial<GridConfig>) => {
    if (hotInstanceRef.current) {
      hotInstanceRef.current.updateSettings(settings);
    }
  }, []);

  return {
    instance: hotInstanceRef.current,
    isInitialized,
    getInstance,
    getData,
    getSourceData,
    getSourceDataAtRow,
    updateSettings
  };
};

// Utility function to create action button renderer
export const createActionButtonRenderer = (
  buttons: Array<{
    className: string;
    icon: string;
    title: string;
    onClick: (rowData: any, row: number, instance: Handsontable) => void;
  }>
) => {
  return function(instance: Handsontable, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties: Handsontable.CellProperties) {
    const buttonHtml = buttons.map(btn =>
      `<button class="action-btn ${btn.className}" data-row="${row}" data-action="${btn.className}" title="${btn.title}">${btn.icon}</button>`
    ).join('');

    td.innerHTML = buttonHtml;

    // Add event listeners
    buttons.forEach(btn => {
      const buttonElement = td.querySelector(`.${btn.className}`) as HTMLButtonElement;
      if (buttonElement) {
        buttonElement.addEventListener('click', () => {
          // Check if instance is still valid before calling onClick
          if (instance && !instance.isDestroyed) {
            const rowData = instance.getSourceDataAtRow(row);
            btn.onClick(rowData, row, instance);
          }
        });
      }
    });

    return td;
  };
};

// Utility function to create image renderer
export const createImageRenderer = (fallbackText = '?') => {
  return function(instance: Handsontable, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties: Handsontable.CellProperties) {
    td.innerHTML = value ?
      `<img src="${value}" alt="Image" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />` :
      `<div style="width: 32px; height: 32px; border-radius: 50%; background: #ccc; display: flex; align-items: center; justify-content: center; color: #666;">${fallbackText}</div>`;
    return td;
  };
};

// Utility function to create badge renderer
export const createBadgeRenderer = (colorMap: Record<string, string>, defaultColor = '#666') => {
  return function(instance: Handsontable, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties: Handsontable.CellProperties) {
    const color = colorMap[value as keyof typeof colorMap] || defaultColor;
    td.innerHTML = `<span style="display: inline-block; padding: 4px 8px; border-radius: 12px; background: ${color}; color: white; font-size: 12px; font-weight: bold;">${value || 'unknown'}</span>`;
    return td;
  };
};

// Utility function to create progress bar renderer
export const createProgressRenderer = () => {
  return function(instance: Handsontable, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties: Handsontable.CellProperties) {
    const progress = value || 0;
    td.innerHTML = `
      <div style="width: 100%; background: #e0e0e0; border-radius: 4px; height: 8px;">
        <div style="width: ${progress}%; background: linear-gradient(90deg, #4caf50, #8bc34a); height: 100%; border-radius: 4px; transition: width 0.3s ease;"></div>
      </div>
      <span style="font-size: 11px; color: #666; margin-top: 2px; display: block;">${progress}%</span>
    `;
    return td;
  };
};

// Utility function to create tag renderer
export const createTagRenderer = () => {
  return function(instance: Handsontable, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties: Handsontable.CellProperties) {
    const tags = value || [];
    td.innerHTML = tags.map((tag: string) =>
      `<span style="display: inline-block; padding: 2px 6px; margin: 1px; border-radius: 10px; background: #e3f2fd; color: #1976d2; font-size: 11px; border: 1px solid #bbdefb;">${tag}</span>`
    ).join('');
    return td;
  };
};

// Utility function to create graph renderer
export const createGraphRenderer = () => {
  return function(instance: Handsontable, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties: Handsontable.CellProperties) {
    const data = [20, 35, 45, 60, 75, 55, 80]; // Sample data points
    const max = Math.max(...data);
    const points = data.map((val, i) => `${i * 20 + 10},${50 - (val / max) * 40}`).join(' ');

    td.innerHTML = `
      <svg width="100" height="50" style="display: block; margin: 0 auto;">
        <polyline
          fill="none"
          stroke="#2196f3"
          stroke-width="2"
          points="${points}"
        />
        <circle cx="10" cy="${50 - (data[0] / max) * 40}" r="3" fill="#2196f3"/>
        <circle cx="30" cy="${50 - (data[1] / max) * 40}" r="3" fill="#2196f3"/>
        <circle cx="50" cy="${50 - (data[2] / max) * 40}" r="3" fill="#2196f3"/>
        <circle cx="70" cy="${50 - (data[3] / max) * 40}" r="3" fill="#2196f3"/>
        <circle cx="90" cy="${50 - (data[4] / max) * 40}" r="3" fill="#2196f3"/>
      </svg>
    `;
    return td;
  };
};

// Utility function to create level renderer that shows text but allows number editing
export const createLevelRenderer = () => {
  return function(instance: Handsontable, td: HTMLTableCellElement, row: number, col: number, prop: string | number, value: any, cellProperties: Handsontable.CellProperties) {
    const numValue = parseInt(value) || 0;
    let levelText = '';
    let color = '#666';
    
    switch(numValue) {
      case 0:
        levelText = 'Junior';
        color = '#4caf50';
        break;
      case 1:
        levelText = 'Medior';
        color = '#2196f3';
        break;
      case 2:
        levelText = 'Senior';
        color = '#ff9800';
        break;
      default:
        levelText = `Level ${numValue}`;
        color = '#666';
    }
    
    td.innerHTML = `<span style="display: inline-block; padding: 4px 8px; border-radius: 12px; background: ${color}; color: white; font-size: 12px; font-weight: bold;" title="Level ${numValue}">${levelText}</span>`;
    
    // Store the actual numeric value for editing
    td.setAttribute('data-level-value', numValue.toString());
    
    return td;
  };
};
