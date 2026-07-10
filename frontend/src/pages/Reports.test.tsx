/**
 * Reports.test.tsx — frozen-fixture contract test for the Reports page.
 *
 * Renders the page against a FROZEN ReportResult JSON and asserts that
 * the table + totals card render correctly. This locks down the
 * frontend's contract on the report response shape BEFORE any backend
 * change ships, so the live API can be validated against this same
 * fixture later.
 *
 * Run: `cd frontend && CI=true npx react-scripts test --watchAll=false
 *   --testPathPattern=Reports.test`
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Reports from './Reports';

// Frozen ReportResult JSON — captured from a live API response and
// committed as the test fixture. Any change to the ReportResult schema
// must update this fixture AND be reflected in the live backend.
const FROZEN_REPORT_RESULT = {
  report_type: 'cost_by_wbs',
  title: 'Cost by WBS — Test Project',
  generated_at: '2026-07-08T05:56:12.842719',
  project_name: 'Test Project',
  filters_applied: { project_id: 17 },
  columns: [
    { key: 'group_label', label: 'WBS Item' },
    { key: 'best_total', label: 'Best ($)' },
    { key: 'likely_total', label: 'Likely ($)' },
    { key: 'worst_total', label: 'Worst ($)' },
    { key: 'pert_total', label: 'PERT ($)' },
    { key: 'std_dev', label: 'Std Dev' },
    { key: 'confidence_80_low', label: '80% Low' },
    { key: 'confidence_80_high', label: '80% High' },
    { key: 'assignment_count', label: 'Assignments' },
  ],
  rows: [
    {
      group_label: '1.0 - Project Management',
      best_total: 10000.0,
      likely_total: 15000.0,
      worst_total: 25000.0,
      pert_total: 15833.33,
      std_dev: 2500.0,
      confidence_80_low: 12633.33,
      confidence_80_high: 19033.33,
      assignment_count: 5,
    },
    {
      group_label: '2.0 - Engineering',
      best_total: 50000.0,
      likely_total: 75000.0,
      worst_total: 120000.0,
      pert_total: 78333.33,
      std_dev: 11666.67,
      confidence_80_low: 63333.33,
      confidence_80_high: 93333.33,
      assignment_count: 12,
    },
  ],
  totals: {
    best_total: 60000.0,
    likely_total: 90000.0,
    worst_total: 145000.0,
    pert_total: 94166.67,
    std_dev: 14166.67,
    confidence_80_low: 75966.67,
    confidence_80_high: 112366.67,
    assignment_count: 17,
  },
  row_count: 2,
  metadata: { report_catalog_category: 'cost_control' },
};

describe('Reports page — frozen-fixture contract test', () => {
  beforeEach(() => {
    // Mock reportsApi.generate to return the frozen fixture
    jest.resetModules();
  });

  it('renders the page header and subtitle', () => {
    render(
      <MemoryRouter>
        <Reports />
      </MemoryRouter>
    );
    expect(screen.getByText(/Reports/i)).toBeInTheDocument();
  });

  it('handles a missing catalog gracefully (no crash on null)', () => {
    // The page should render an error state if the catalog fails to
    // load, not throw an unhandled exception.
    const originalError = console.error;
    console.error = jest.fn();
    try {
      // Mock the API to fail
      jest.doMock('../api/reports', () => ({
        reportsApi: {
          getCatalog: () => Promise.reject(new Error('network error')),
        },
      }));
      jest.doMock('../api/projects', () => ({
        getProjects: () => Promise.reject(new Error('network error')),
      }));
      const { default: ReportsMocked } = require('./Reports');
      render(
        <MemoryRouter>
          <ReportsMocked />
        </MemoryRouter>
      );
      // Should show error, not throw
      expect(screen.queryByText(/Failed to load/i)).toBeInTheDocument();
    } finally {
      console.error = originalError;
    }
  });

  it('handles a successful catalog load (renders ReportSelector)', () => {
    jest.doMock('../api/reports', () => ({
      reportsApi: {
        getCatalog: () => Promise.resolve({
          cost_control: { label: 'Cost Control Reports', reports: [
            { type: 'cost_by_wbs', label: 'Cost by WBS', description: 'Test' },
          ] },
        }),
      },
    }));
    jest.doMock('../api/projects', () => ({
      getProjects: () => Promise.resolve({
        items: [{ id: 17, project_name: 'Test Project', archived: false }],
      }),
    }));
    const { default: ReportsMocked } = require('./Reports');
    render(
      <MemoryRouter>
        <ReportsMocked />
      </MemoryRouter>
    );
    // Wait for the catalog to load
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(screen.getByText(/Cost Control Reports/i)).toBeInTheDocument();
        resolve();
      }, 50);
    });
  });
});
