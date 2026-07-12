/**
 * Reports - Main reports page wired to the live backend.
 *
 * Loads the report catalog from /api/v1/reports/catalog and the user's
 * projects from /api/v1/projects, then lets the user pick a report +
 * project + filters and hit "Generate" to call /api/v1/reports/{type}.
 * The result is rendered as a table with totals; export buttons hit
 * /api/v1/reports/export and trigger a browser file download.
 */
import React, { useState, useEffect } from 'react';
import { ReportSelector, FilterPanel, ReportPreview, ExportOptions } from '../components/reports';
import { ReportCatalog, ReportFilter, ReportRequest, ReportResult, ReportType, reportsApi } from '../api/reports';
import { getProjects, Project } from '../api/projects';

export default function Reports() {
  const [catalog, setCatalog] = useState<ReportCatalog | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<ReportFilter>({} as ReportFilter);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);

  // Load the report catalog + project list on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cat, projResp] = await Promise.all([
          reportsApi.getCatalog(),
          getProjects(0, 100),
        ]);
        if (cancelled) return;
        setCatalog(cat);
        setProjects(projResp.items ?? []);
        // Default the project filter to the first non-archived project.
        const firstActive = (projResp.items ?? []).find(
          (p) => !(p as any).archived
        );
        if (firstActive) {
          setFilters({ project_id: firstActive.id });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.detail ??
            err?.message ??
            'Failed to load reports catalog or projects.'
          );
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGenerate = async () => {
    if (!selectedType) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const request: ReportRequest = { report_type: selectedType, filters };
      const data = await reportsApi.generate(request);
      setResult(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ??
          err?.message ??
          'Failed to generate report.'
      );
    } finally {
      setLoading(false);
    }
  };

  const currentRequest: ReportRequest | null = selectedType
    ? { report_type: selectedType, filters }
    : null;

  if (catalogLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        Loading report catalog…
      </div>
    );
  }

  if (!catalog) {
    return (
      <div style={{ padding: '24px' }}>
        <div style={errorStyle}>{error ?? 'Failed to load reports catalog.'}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
            Reports
          </h1>
          <p style={{ fontSize: '15px', color: '#64748b' }}>
            Generate cost control, BOE, risk, and audit reports
          </p>
        </div>
      </div>

      <ReportSelector catalog={catalog} selected={selectedType} onSelect={setSelectedType} />

      {selectedType && (
        <>
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            projects={projects.map((p) => ({ id: p.id, name: p.project_name }))}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{
                padding: '10px 28px',
                backgroundColor: '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
            <ExportOptions request={currentRequest} disabled={!result || loading} />
          </div>

          {error && !result && <div style={errorStyle}>{error}</div>}

          <ReportPreview result={result} loading={loading} />
        </>
      )}
    </div>
  );
}

const errorStyle: React.CSSProperties = {
  padding: '12px 16px',
  backgroundColor: '#fef2f2',
  border: '1px solid #fee2e2',
  borderRadius: '8px',
  color: '#991b1b',
  fontSize: '14px',
  marginBottom: '16px',
};