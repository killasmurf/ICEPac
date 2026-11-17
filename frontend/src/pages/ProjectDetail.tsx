import React, { useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import CardSkeleton from '../components/common/CardSkeleton';
import ErrorState from '../components/common/ErrorState';
import EstimationSummary from '../components/estimation/EstimationSummary';
import ProjectUpload from '../components/project/ProjectUpload';
import { ProjectRiskRegister } from '../components/project/ProjectRiskRegister';
import ProjectHeader from './projectDetail/ProjectHeader';
import WBSWorkspace from './projectDetail/WBSWorkspace';
import { DEFAULT_TAB, PROJECT_TABS, ProjectTab, parseTab, parseWbsId, pertByWbsId } from './projectDetail/tabs';
import { isNotFound, useProject, useProjectEstimation, useReferenceData } from './projectDetail/useProjectData';

const TAB_LABELS: Record<ProjectTab, string> = {
  wbs: 'WBS',
  summary: 'Summary',
  risks: 'Risks',
  imports: 'Imports',
};

const BackToProjects: React.FC<{ variant?: 'text' | 'outlined' }> = ({ variant = 'outlined' }) => (
  <Button component={RouterLink} to="/projects" variant={variant} startIcon={<ArrowBackIcon />}>
    Back to Projects
  </Button>
);

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const projectId = Number(id);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tab = parseTab(searchParams.get('tab'));
  const selectedWbsId = parseWbsId(searchParams.get('wbs'));

  const project = useProject(projectId);
  const estimation = useProjectEstimation(projectId, project.isSuccess);
  const reference = useReferenceData(tab === 'wbs');
  const pertTotals = useMemo(() => pertByWbsId(estimation.data?.wbs_summaries), [estimation.data]);

  const goToTab = useCallback(
    (next: ProjectTab) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.delete('wbs');
        if (next === DEFAULT_TAB) params.delete('tab');
        else params.set('tab', next);
        return params;
      });
    },
    [setSearchParams],
  );
  const changeTab = (_: React.SyntheticEvent, next: ProjectTab) => goToTab(next);

  const selectWbs = useCallback(
    (wbsId: number) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set('wbs', String(wbsId));
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const refreshAfterImport = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
  }, [queryClient, projectId]);

  if (!Number.isFinite(projectId) || projectId <= 0 || (project.isError && isNotFound(project.error))) {
    return (
      <ErrorState
        title="Project not found"
        description="This project does not exist or you do not have access to it."
        action={<BackToProjects />}
      />
    );
  }

  if (project.isPending) {
    return (
      <Box aria-busy="true">
        <CardSkeleton lines={4} />
      </Box>
    );
  }

  if (project.isError) {
    return (
      <ErrorState
        title="Could not load the project"
        description="Something went wrong while loading this project."
        action={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
            <Button variant="contained" onClick={() => void project.refetch()}>
              Retry
            </Button>
            <BackToProjects />
          </Box>
        }
      />
    );
  }

  const data = project.data;
  const wbsCount = estimation.data?.total_wbs_items ?? data.task_count;

  return (
    <Box>
      <ProjectHeader project={data} estimation={estimation.data} estimationLoading={estimation.isPending} />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tab} onChange={changeTab} variant="scrollable" scrollButtons="auto" aria-label="Project sections">
          {PROJECT_TABS.map((t) => (
            <Tab
              key={t}
              value={t}
              id={`project-tab-${t}`}
              aria-controls={`project-panel-${t}`}
              label={t === 'wbs' && wbsCount ? `${TAB_LABELS[t]} (${wbsCount})` : TAB_LABELS[t]}
            />
          ))}
        </Tabs>
      </Box>

      <Box role="tabpanel" id={`project-panel-${tab}`} aria-labelledby={`project-tab-${tab}`}>
        {tab === 'wbs' && (
          <WBSWorkspace
            projectId={projectId}
            selectedId={selectedWbsId}
            onSelect={selectWbs}
            pertTotals={pertTotals}
            reference={reference.data}
            onOpenImports={() => goToTab('imports')}
          />
        )}
        {tab === 'summary' && (
          <Card>
            <CardContent>
              <EstimationSummary projectId={projectId} hideHeadline />
            </CardContent>
          </Card>
        )}
        {tab === 'risks' && (
          <Card>
            <CardContent>
              <ProjectRiskRegister projectId={projectId} />
            </CardContent>
          </Card>
        )}
        {tab === 'imports' && (
          <Card>
            <ProjectUpload projectId={projectId} onImportComplete={refreshAfterImport} />
          </Card>
        )}
      </Box>
    </Box>
  );
};

export default ProjectDetail;
