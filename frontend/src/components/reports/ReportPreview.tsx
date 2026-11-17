/**
 * ReportPreview - report result as a client-mode DataTable with a totals summary row.
 */
import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import type { GridColDef } from '@mui/x-data-grid';
import type { ReportResult } from '../../api/reports';
import { DataTable } from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import { formatDateTime, formatNumber } from '../../utils/format';
import { columnKind, formatCell, isNumericKind, type ColumnKind } from './reportColumns';

interface ReportPreviewProps {
  result: ReportResult;
}

interface PreviewRow {
  id: number;
  [key: string]: unknown;
}

const LONG_TEXT_KEYS = /(mitigation|assumptions|details|title)/;

export default function ReportPreview({ result }: ReportPreviewProps) {
  const { kinds, columns, rows } = useMemo(() => {
    const kinds = new Map<string, ColumnKind>(result.columns.map((c) => [c.key, columnKind(c, result.rows, result.totals)]));
    const columns: GridColDef<PreviewRow>[] = result.columns.map((c) => {
      const kind = kinds.get(c.key) ?? 'text';
      const numeric = isNumericKind(kind);
      return {
        field: c.key,
        headerName: c.label,
        type: numeric ? 'number' : 'string',
        align: numeric ? 'right' : 'left',
        headerAlign: numeric ? 'right' : 'left',
        flex: 1,
        minWidth: numeric ? 130 : LONG_TEXT_KEYS.test(c.key) ? 220 : 150,
        cellClassName: numeric ? 'tabular-nums' : undefined,
        valueFormatter: (value: unknown) => formatCell(kind, value),
      };
    });
    const rows: PreviewRow[] = result.rows.map((r, i) => ({ ...r, id: i }));
    return { kinds, columns, rows };
  }, [result]);

  const totalEntries = result.columns.filter((c) => result.totals && c.key in result.totals);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <Box>
        <Typography variant="h4" component="h3">
          {result.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {result.project_name} · {formatNumber(result.row_count)} {result.row_count === 1 ? 'row' : 'rows'} · Generated{' '}
          {formatDateTime(result.generated_at)}
        </Typography>
      </Box>

      {result.row_count === 0 ? (
        <EmptyState
          icon={<DescriptionOutlined />}
          title="No data for these filters"
          description="Try a different project or loosen the filters, then generate again."
        />
      ) : (
        <>
          <DataTable<PreviewRow>
            rows={rows}
            columns={columns}
            ariaLabel={`${result.title} report data`}
            footer={
              totalEntries.length > 0 ? (
                <Box
                  component="dl"
                  aria-label="Report totals"
                  sx={{
                    m: 0,
                    p: 2,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: 2,
                    bgcolor: 'action.hover',
                  }}
                >
                  {totalEntries.map((c) => (
                    <Box key={c.key} sx={{ minWidth: 0 }}>
                      <Typography component="dt" variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        Total {c.label}
                      </Typography>
                      <Typography component="dd" variant="subtitle1" className="tabular-nums" sx={{ m: 0 }}>
                        {formatCell(kinds.get(c.key) ?? 'text', result.totals?.[c.key])}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : undefined
            }
          />
        </>
      )}
    </Box>
  );
}
