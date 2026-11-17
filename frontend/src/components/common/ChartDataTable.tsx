import React from 'react';
import Box from '@mui/material/Box';
import { visuallyHidden } from './visuallyHidden';

export interface ChartDataTableProps {
  /** Names the table for screen readers, e.g. "Estimate by project". */
  caption: string;
  headers: string[];
  rows: React.ReactNode[][];
}

/**
 * The accessible alternative to a chart: a real table, visually hidden. It may hold links, so when a
 * keyboard user tabs into it, it is revealed over the chart (the parent must be `position: relative`).
 */
export function ChartDataTable({ caption, headers, rows }: ChartDataTableProps) {
  return (
    <Box
      data-testid="chart-data-table"
      sx={{
        ...visuallyHidden,
        '&:focus-within': {
          clip: 'auto',
          position: 'absolute',
          inset: 0,
          width: 'auto',
          height: 'auto',
          margin: 0,
          overflow: 'auto',
          whiteSpace: 'normal',
          zIndex: 2,
          p: 1,
          bgcolor: 'background.paper',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
        },
      }}
    >
      <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', color: 'text.primary', fontSize: 'body2.fontSize' }}>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {headers.map((h) => (
              <Box component="th" scope="col" key={h} sx={{ textAlign: 'left', p: 0.5 }}>
                {h}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, i) => (
            <tr key={i}>
              {cells.map((cell, j) =>
                j === 0 ? (
                  <Box component="th" scope="row" key={j} sx={{ textAlign: 'left', fontWeight: 400, p: 0.5 }}>
                    {cell}
                  </Box>
                ) : (
                  <Box component="td" key={j} sx={{ p: 0.5 }}>
                    {cell}
                  </Box>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}

export default ChartDataTable;
