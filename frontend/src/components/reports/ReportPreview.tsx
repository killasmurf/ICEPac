/**
 * ReportPreview - Renders the report result as a formatted table with totals.
 */
import React from 'react';
import { ReportResult } from '../../api/reports';

interface ReportPreviewProps {
  result: ReportResult | null;
  loading?: boolean;
}

const MONEY_KEYS = new Set([
  'best_total', 'likely_total', 'worst_total', 'pert_total', 'std_dev',
  'confidence_80_low', 'confidence_80_high', 'exposure', 'total_exposure',
  'total_likely', 'total_pert', 'combined_std_dev', 'risk_exposure',
  'best_estimate', 'likely_estimate', 'worst_estimate', 'pert_estimate',
]);

function formatValue(key: string, value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (MONEY_KEYS.has(key) && typeof value === 'number') {
    return '$' + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
}

export default function ReportPreview({ result, loading }: ReportPreviewProps) {
  const s: Record<string, React.CSSProperties> = {
    wrapper: { backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
    header: { padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: '16px', fontWeight: 600, color: '#0f172a' },
    meta: { fontSize: '12px', color: '#94a3b8' },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '2px solid #e2e8f0', backgroundColor: '#f8fafc', whiteSpace: 'nowrap', fontSize: '12px' },
    td: { padding: '10px 14px', borderBottom: '1px solid #f1f5f9', color: '#1e293b' },
    totalRow: { backgroundColor: '#f0fdf4', fontWeight: 600 },
    loading: { padding: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '15px' },
    empty: { padding: '60px', textAlign: 'center', color: '#94a3b8' },
  };

  if (loading) return <div style={s.wrapper}><div style={s.loading}>Generating report...</div></div>;
  if (!result) return <div style={s.wrapper}><div style={s.empty}>Select a report type and click Generate</div></div>;
  if (result.row_count === 0) return <div style={s.wrapper}><div style={s.empty}>No data found for the selected filters</div></div>;

  const keys = result.columns.map(c => c.key);

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <div>
          <div style={s.title}>{result.title}</div>
          <div style={s.meta}>{result.project_name} • {result.row_count} rows • Generated {new Date(result.generated_at).toLocaleString()}</div>
        </div>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={s.table}>
          <thead>
            <tr>{result.columns.map(col => <th key={col.key} style={{ ...s.th, textAlign: MONEY_KEYS.has(col.key) ? 'right' : 'left' }}>{col.label}</th>)}</tr>
          </thead>
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>
                {keys.map(k => <td key={k} style={{ ...s.td, textAlign: MONEY_KEYS.has(k) ? 'right' : 'left', fontVariantNumeric: MONEY_KEYS.has(k) ? 'tabular-nums' : 'normal' }}>{formatValue(k, row[k])}</td>)}
              </tr>
            ))}
            {result.totals && (
              <tr style={s.totalRow}>
                {keys.map((k, i) => (
                  <td key={k} style={{ ...s.td, textAlign: MONEY_KEYS.has(k) ? 'right' : 'left', fontVariantNumeric: 'tabular-nums' }}>
                    {i === 0 ? 'TOTALS' : (k in result.totals! ? formatValue(k, result.totals![k]) : '')}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
