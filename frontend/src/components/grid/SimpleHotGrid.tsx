"use client";
import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

type Column = { data: string | number; width?: number; type?: string };

interface SimpleGridProps {
  data: any[];
  columns: Column[];
  colHeaders: string[];
  height?: number;
  minWidth?: number;
  onDataChange?: (next: any[]) => void; // reserved for future inline editing
  fitContainer?: boolean; // not used with DataGrid, kept for API compat
}

export default function SimpleHotGrid({
  data,
  columns,
  colHeaders,
  height = 500,
  minWidth = 1200,
}: SimpleGridProps) {
  const gridColumns: GridColDef[] = useMemo(
    () =>
      columns.map((c, idx) => ({
        field: String(c.data),
        headerName: colHeaders[idx] ?? String(c.data),
        width: c.width,
        type:
          c.type === 'checkbox'
            ? 'boolean'
            : c.type === 'dropdown'
            ? 'singleSelect'
            : undefined,
      })),
    [columns, colHeaders]
  );

  const rows = useMemo(() => data.map((row, i) => ({ id: i, ...row })), [data]);

  return (
    <Box sx={{ width: '100%', minWidth, height }}>
      <DataGrid
        rows={rows}
        columns={gridColumns}
        disableRowSelectionOnClick
        checkboxSelection={false}
        pageSizeOptions={[25, 50, 100]}
        initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
      />
    </Box>
  );
}
