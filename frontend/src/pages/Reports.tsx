/**
 * Reports - Main reports page with selector, filters, preview, and export.
 */
import React, { useState, useEffect } from 'react';
import { ReportSelector, FilterPanel, ReportPreview, ExportOptions } from '../components/reports';
import { ReportCatalog, ReportFilter, ReportRequest, ReportResult, ReportType, reportsApi } from '../api/reports';

// Mock catalog for development
const MOCK_CATALOG: ReportCatalog = {
  cost_control: {
    label: 'Cost Control Reports',
    reports: [
      { type: 'cost_by_wbs', label: 'Cost by WBS', description: 'Cost rollup by Work Breakdown Structure' },
      { type: 'cost_by_resource', label: 'Cost by Resource', description: 'Cost breakdown by resource code' },
      { type: 'cost_by_supplier', label: 'Cost by Supplier', description: 'Cost breakdown by supplier' },
      { type: 'cost_by_eoc', label: 'Cost by EOC', description: 'Cost by Element of Cost category' },
      { type: 'cost_by_technique', label: 'Cost by Technique', description: 'Cost by estimating technique' },
      { type: 'cost_by_region', label: 'Cost by Region', description: 'Cost breakdown by geographic region' },
    ],
  },
  boe: {
    label: 'Basis of Estimate',
    reports: [
      { type: 'boe_summary', label: 'BOE Summary', description: 'High-level estimation basis summary' },
      { type: 'boe_detailed', label: 'BOE Detailed', description: 'Detailed estimation basis with methodology' },
      { type: 'boe_by_wbs', label: 'BOE by WBS', description: 'Basis of estimate per WBS item' },
    ],
  },
  risk: {
    label: 'Risk Reports',
    reports: [
      { type: 'risk_assessment', label: 'Risk Assessment', description: 'Full risk assessment with probability/severity' },
      { type: 'risk_summary', label: 'Risk Summary', description: 'Risk summary with exposure totals' },
    ],
  },
  audit: {
    label: 'Audit Reports',
    reports: [
      { type: 'estimator_activity', label: 'Estimator Activity', description: 'Activity log for estimators' },
      { type: 'approver_activity', label: 'Approver Activity', description: 'Approval decisions and history' },
      { type: 'change_history', label: 'Change History', description: 'All changes to project estimates' },
    ],
  },
  utilization: {
    label: 'Utilization Reports',
    reports: [
      { type: 'resource_utilization', label: 'Resource Utilization', description: 'Resource allocation across projects' },
      { type: 'project_summary', label: 'Project Summary', description: 'Overall project status and metrics' },
    ],
  },
};

const MOCK_PROJECTS = [
  { id: 1, name: 'FY26 Defense Modernization' },
  { id: 2, name: 'Infrastructure Upgrade Phase II' },
  { id: 3, name: 'Cloud Migration Program' },
];

export default function Reports() {
  const [catalog, setCatalog] = useState<ReportCatalog>(MOCK_CATALOG);
  const [selectedType, setSelectedType] = useState<ReportType | null>(null);
  const [filters, setFilters] = useState<ReportFilter>({ project_id: MOCK_PROJECTS[0].id });
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err.message || 'Failed to generate report');
      // Mock result for development
      setResult({
        report_type: selectedType,
        title: selectedType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        generated_at: new Date().toISOString(),
        project_name: MOCK_PROJECTS.find(p => p.id === filters.project_id)?.name || 'Project',
        filters_applied: { project_id: filters.project_id },
        columns: [
          { key: 'group_label', label: 'Item' },
          { key: 'best_total', label: 'Best ($)' },
          { key: 'likely_total', label: 'Likely ($)' },
          { key: 'worst_total', label: 'Worst ($)' },
          { key: 'pert_total', label: 'PERT ($)' },
          { key: 'assignment_count', label: 'Assignments' },
        ],
        rows: [
          { group_label: '1.0 - Project Management', best_total: 10000, likely_total: 15000, worst_total: 25000, pert_total: 15833.33, assignment_count: 5 },
          { group_label: '2.0 - Engineering', best_total: 50000, likely_total: 75000, worst_total: 120000, pert_total: 78333.33, assignment_count: 12 },
          { group_label: '3.0 - Testing', best_total: 20000, likely_total: 30000, worst_total: 50000, pert_total: 31666.67, assignment_count: 8 },
        ],
        totals: { best_total: 80000, likely_total: 120000, worst_total: 195000, pert_total: 125833.33, assignment_count: 25 },
        row_count: 3,
      });
    }
    setLoading(false);
  };

  const currentRequest: ReportRequest | null = selectedType ? { report_type: selectedType, filters } : null;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Reports</h1>
          <p style={{ fontSize: '15px', color: '#64748b' }}>Generate cost control, BOE, risk, and audit reports</p>
        </div>
      </div>

      <ReportSelector catalog={catalog} selected={selectedType} onSelect={setSelectedType} />

      {selectedType && (
        <>
          <FilterPanel filters={filters} onChange={setFilters} projects={MOCK_PROJECTS} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <button onClick={handleGenerate} disabled={loading}
              style={{ padding: '10px 28px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
            <ExportOptions request={currentRequest} disabled={!result || loading} />
          </div>

          {error && !result && (
            <div style={{ padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', color: '#991b1b', fontSize: '14px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <ReportPreview result={result} loading={loading} />
        </>
      )}
    </div>
  );
}
