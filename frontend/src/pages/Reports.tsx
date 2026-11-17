/**
 * Reports - choose a report, set filters, generate a preview and export it.
 * The selected report and filters live in the URL query string so a view can be bookmarked.
 */
import React, { useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import PlayArrow from '@mui/icons-material/PlayArrow';
import { getProjects } from '../api/projects';
import { reportsApi, type ReportRequest, type ReportType } from '../api/reports';
import { CardSkeleton } from '../components/common/CardSkeleton';
import ErrorState from '../components/common/ErrorState';
import { PageHeader } from '../components/common/PageHeader';
import { TableSkeleton } from '../components/common/TableSkeleton';
import { ExportOptions, FilterPanel, ReportPreview, ReportSelector } from '../components/reports';
import {
  buildReportFilter,
  paramsFromState,
  pruneFilters,
  valuesFromParams,
  type FilterValues,
} from '../components/reports/reportFilters';

function StepCard({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <Card component="section" aria-labelledby={`reports-step-${step}`}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography id={`reports-step-${step}`} variant="h5" component="h2">
          <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>
            {step}.
          </Box>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function Reports() {
  const [params, setParams] = useSearchParams();

  const catalogQuery = useQuery({ queryKey: ['reports', 'catalog'], queryFn: reportsApi.getCatalog });
  const projectsQuery = useQuery({
    queryKey: ['projects', 'list', { skip: 0, limit: 100 }],
    queryFn: () => getProjects(0, 100),
  });

  const catalog = catalogQuery.data;
  const reportParam = params.get('report');
  const selected: ReportType | null = useMemo(() => {
    if (!catalog || !reportParam) return null;
    const known = Object.values(catalog).some((c) => c.reports.some((r) => r.type === reportParam));
    return known ? (reportParam as ReportType) : null;
  }, [catalog, reportParam]);
  const values = useMemo(() => valuesFromParams(params), [params]);

  const generate = useMutation({ mutationFn: (request: ReportRequest) => reportsApi.generate(request) });

  const filter = selected ? buildReportFilter(selected, values) : null;
  const currentRequest: ReportRequest | null = selected && filter ? { report_type: selected, filters: filter } : null;
  const generatedRequest = generate.variables;
  const result = generate.data;
  const stale =
    result !== undefined && JSON.stringify(currentRequest) !== JSON.stringify(generatedRequest);

  const setState = (type: ReportType | null, next: FilterValues, replace: boolean) =>
    setParams(paramsFromState(type, next), { replace });

  const onSelect = (type: ReportType) => {
    if (type === selected) return;
    generate.reset();
    setState(type, pruneFilters(type, values), false);
  };

  // React Router's functional setSearchParams reads the params from the last render, not from
  // an update that is still pending, so two filter edits in quick succession (for example both
  // date fields) would drop the first one. Keep the newest params in a ref and build on that.
  const latestParams = useRef(params);
  const pendingParams = useRef<string | null>(null);
  useEffect(() => {
    // Ignore a render that is older than the update we have already queued.
    if (pendingParams.current !== null && params.toString() !== pendingParams.current) return;
    latestParams.current = params;
    pendingParams.current = null;
  }, [params]);

  const onFiltersChange = (patch: Partial<FilterValues>) => {
    if (!selected) return;
    const next = paramsFromState(selected, { ...valuesFromParams(latestParams.current), ...patch });
    latestParams.current = next;
    pendingParams.current = next.toString();
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="Reports" subtitle="Generate cost control, basis of estimate, risk and audit reports, then export them." />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <StepCard step={1} title="Choose a report">
          {catalogQuery.isPending ? (
            <CardSkeleton lines={4} />
          ) : catalogQuery.isError || !catalog ? (
            <ErrorState
              title="Could not load the report catalog"
              description="Check your connection and try again."
              action={
                <Button variant="outlined" onClick={() => catalogQuery.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : (
            <ReportSelector catalog={catalog} selected={selected} onSelect={onSelect} />
          )}
        </StepCard>

        {selected && (
          <StepCard step={2} title="Set filters">
            {projectsQuery.isError ? (
              <ErrorState
                title="Could not load projects"
                description="A project is required to generate a report."
                action={
                  <Button variant="outlined" onClick={() => projectsQuery.refetch()}>
                    Retry
                  </Button>
                }
              />
            ) : (
              <FilterPanel
                reportType={selected}
                values={values}
                onChange={onFiltersChange}
                projects={projectsQuery.data?.items ?? []}
                projectsLoading={projectsQuery.isPending}
              />
            )}
          </StepCard>
        )}

        {selected && (
          <StepCard step={3} title="Generate and export">
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<PlayArrow />}
                disabled={!currentRequest || generate.isPending}
                onClick={() => currentRequest && generate.mutate(currentRequest)}
              >
                {generate.isPending ? 'Generating…' : 'Generate'}
              </Button>
              <ExportOptions request={generatedRequest ?? null} disabled={!result || stale || generate.isPending || result.row_count === 0} />
              {!currentRequest && (
                <Typography variant="body2" color="text.secondary">
                  Choose a project{values.project_id !== undefined ? ' and a valid date range' : ''} to generate this report.
                </Typography>
              )}
            </Box>

            {stale && !generate.isPending && (
              <Alert severity="info">Filters have changed since this report was generated. Generate again to refresh it.</Alert>
            )}

            {generate.isPending && (
              <Box aria-live="polite">
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Generating report
                </Typography>
                <TableSkeleton rows={5} columns={5} />
              </Box>
            )}
            {generate.isError && !generate.isPending && (
              <ErrorState
                title="Could not generate the report"
                description="Check the filters and try again."
                action={
                  <Button variant="outlined" onClick={() => generatedRequest && generate.mutate(generatedRequest)}>
                    Retry
                  </Button>
                }
              />
            )}
            {result && !generate.isPending && <ReportPreview result={result} />}
          </StepCard>
        )}
      </Box>
    </>
  );
}
