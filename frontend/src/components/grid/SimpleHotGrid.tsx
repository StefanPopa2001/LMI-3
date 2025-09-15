"use client";
import React, { useEffect, useMemo, useRef } from 'react';
import Handsontable from 'handsontable';
import 'handsontable/dist/handsontable.full.min.css';

type Column = Handsontable.ColumnSettings;

interface SimpleHotGridProps {
  data: any[];
  columns: Column[];
  colHeaders: string[];
  height?: number; // fallback height
  minWidth?: number; // ensure horizontal layout
  onDataChange?: (next: any[]) => void;
  fitContainer?: boolean; // when true, table height follows parent container
}

export default function SimpleHotGrid({
  data,
  columns,
  colHeaders,
  height = 500,
  minWidth = 1200,
  onDataChange,
  fitContainer = false,
}: SimpleHotGridProps) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hotRef = useRef<Handsontable | null>(null);

  const tableWidth = useMemo(() => {
    const sum = columns.reduce((acc, c) => acc + (typeof c.width === 'number' ? c.width : 100), 0);
    // add some room for row headers + scrollbar
    return Math.max(sum + 120, minWidth);
  }, [columns, minWidth]);

  useEffect(() => {
    if (!containerRef.current) return;

    const computedHeight = () => {
      if (fitContainer && outerRef.current) {
        const h = outerRef.current.clientHeight;
        return Math.max(h - 2, 240); // account for borders, ensure minimum
      }
      return height;
    };

    // Helper to compute dynamic width and stretch mode
    const calcLayout = () => {
      const outerW = outerRef.current?.clientWidth ?? tableWidth;
      const base = tableWidth; // sum of columns + headers
      const width = Math.max(base, outerW);
      const stretch: 'none' | 'all' = outerW > base ? 'all' : 'none';
      return { width, stretch };
    };

    const initialLayout = calcLayout();

    // Create instance
    hotRef.current = new Handsontable(containerRef.current, {
      data,
      columns,
      colHeaders,
      height: computedHeight(),
      width: initialLayout.width,
      rowHeaders: true,
      stretchH: initialLayout.stretch,
      autoColumnSize: false,
      manualColumnResize: true,
  minSpareRows: 1,
      contextMenu: true,
      copyPaste: true,
      licenseKey: 'non-commercial-and-evaluation',
      afterChange: (changes, source) => {
        if (!onDataChange || source === 'loadData' || !hotRef.current) return;
        onDataChange(hotRef.current.getSourceData());
      },
      afterInit() {
        // Force a render to ensure widths are applied
        (this as any).render();
      }
    });

    const windowResize = () => {
      if (!hotRef.current) return;
      const layout = ((): { width: number; stretch: 'none' | 'all' } => {
        const outerW = outerRef.current?.clientWidth ?? tableWidth;
        const base = tableWidth;
        const width = Math.max(base, outerW);
        const stretch: 'none' | 'all' = outerW > base ? 'all' : 'none';
        return { width, stretch };
      })();
      hotRef.current.updateSettings({ width: layout.width, height: computedHeight(), stretchH: layout.stretch });
      hotRef.current.render();
    };

    const ro = new ResizeObserver(() => windowResize());
    if (outerRef.current) ro.observe(outerRef.current);
    window.addEventListener('resize', windowResize);

    return () => {
      window.removeEventListener('resize', windowResize);
      try { ro.disconnect(); } catch {}
      try { hotRef.current?.destroy(); } finally { hotRef.current = null; }
    };
  }, [height, tableWidth, columns, colHeaders, onDataChange, data, fitContainer]);

  // External data updates
  useEffect(() => {
    if (hotRef.current) {
      hotRef.current.loadData(data);
      hotRef.current.render();
    }
  }, [data]);

  return (
    <div
      ref={outerRef}
      style={{
        width: '100%',
        height: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        border: '1px solid #ddd',
        borderRadius: 4,
        background: '#fff',
      }}
    >
      <div ref={containerRef} />
    </div>
  );
}
