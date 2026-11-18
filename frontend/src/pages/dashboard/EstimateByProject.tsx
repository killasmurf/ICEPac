import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { BarChart } from '@mui/x-charts/BarChart';
import type { PortfolioProject } from '../../api/dashboard';
import { ChartDataTable } from '../../components/common/ChartDataTable';
import { useChartPalette } from '../../components/common/useChartPalette';
import { formatCurrency, formatNumber } from '../../utils/format';
import { topProjects, truncate } from './dashboardUtils';
import Panel from './Panel';

const ROW_HEIGHT = 36;

/** Horizontal bars of the ten biggest estimates. Click a bar, or tab into the hidden table, to open the project. */
export function EstimateByProject({ projects }: { projects: PortfolioProject[] }) {
  const navigate = useNavigate();
  const theme = useTheme();
  const palette = useChartPalette();
  const narrow = useMediaQuery(theme.breakpoints.down('sm'));
  const top = topProjects(projects, 10);
  const byId = new Map(top.map((p) => [p.project_id, p]));
  const maxChars = narrow ? 14 : 26;

  return (
    <Panel title="Estimate by project" subtitle={`Top ${top.length} of ${projects.length} by PERT estimate`}>
      {/* The card is as tall as its neighbour (the donut), so the chart fills it: its height comes from this
          box, never less than the rows need. Few projects get thinner bars rather than a stretched card. */}
      <Box
        sx={{
          position: 'relative',
          minWidth: 0,
          flex: 1,
          minHeight: top.length * ROW_HEIGHT + 56,
          '& .MuiBarChart-element': { cursor: 'pointer' },
        }}
      >
        {/* Absolutely positioned so the chart takes its size from the box and never feeds back into it. */}
        <Box sx={{ position: 'absolute', inset: 0 }}>
          <BarChart
            layout="horizontal"
            hideLegend
            grid={{ vertical: true }}
            margin={{ top: 8, right: 28, bottom: 8, left: 8 }}
            series={[
              {
                id: 'estimate',
                label: 'PERT estimate',
                data: top.map((p) => p.total_pert),
                color: palette[0],
                valueFormatter: (v) => formatCurrency(v),
              },
            ]}
            yAxis={[
              {
                id: 'project',
                scaleType: 'band',
                // Ids, not names: two long names can truncate to the same text, and a band scale needs unique values.
                data: top.map((p) => p.project_id),
                width: narrow ? 104 : 176,
                categoryGapRatio: top.length < 6 ? 0.6 : 0.3,
                valueFormatter: (id: number, ctx) => {
                  const name = byId.get(id)?.name ?? '';
                  return ctx.location === 'tooltip' ? name : truncate(name, maxChars);
                },
              },
            ]}
            xAxis={[{ id: 'amount', tickNumber: narrow ? 3 : 5, valueFormatter: (v: number) => formatCurrency(v, { compact: true }) }]}
            onItemClick={(_event, item) => {
              const project = top[item.dataIndex ?? -1];
              if (project) navigate(`/projects/${project.project_id}`);
            }}
          />
        </Box>
        <ChartDataTable
          caption="Estimate by project"
          headers={['Project', 'PERT estimate', 'WBS items', 'Risks']}
          rows={top.map((p) => [
            <Link key={p.project_id} component={RouterLink} to={`/projects/${p.project_id}`}>
              {p.name}
            </Link>,
            formatCurrency(p.total_pert),
            formatNumber(p.wbs_total),
            formatNumber(p.risk_count),
          ])}
        />
      </Box>
    </Panel>
  );
}

export default EstimateByProject;
