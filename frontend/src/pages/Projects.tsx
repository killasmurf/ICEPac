import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Pagination from '@mui/material/Pagination';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import GridViewOutlined from '@mui/icons-material/GridViewOutlined';
import TableRowsOutlined from '@mui/icons-material/TableRowsOutlined';
import type { GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { createProject, deleteProject, getProjects, updateProject, type Project } from '../api/projects';
import { useAuth } from '../auth/AuthContext';
import CardSkeleton from '../components/common/CardSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import DataTable from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import FormDialog from '../components/common/FormDialog';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import StatusChip from '../components/common/StatusChip';
import { useToast } from '../components/feedback/ToastProvider';
import { formatDate, formatNumber } from '../utils/format';
import {
  CARD_PAGE_SIZE,
  EMPTY_FORM,
  readStoredView,
  storeView,
  toCreateBody,
  toSkip,
  toUpdateBody,
  validateProjectName,
  type ProjectFormValues,
  type ProjectsView,
} from './projectsPageUtils';

type DialogState = { mode: 'create' } | { mode: 'edit'; project: Project } | null;

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { role } = useAuth();
  const canManage = role === 'admin' || role === 'manager';
  const [searchParams, setSearchParams] = useSearchParams();

  const [view, setView] = useState<ProjectsView>(readStoredView);
  const [search, setSearch] = useState('');
  const [tableModel, setTableModel] = useState<GridPaginationModel>({ page: 0, pageSize: 10 });
  const [cardPage, setCardPage] = useState(0);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<ProjectFormValues>(EMPTY_FORM);
  const [nameTouched, setNameTouched] = useState(false);
  const [archiving, setArchiving] = useState<Project | null>(null);

  const pageSize = view === 'cards' ? CARD_PAGE_SIZE : tableModel.pageSize;
  const page = view === 'cards' ? cardPage : tableModel.page;
  const skip = toSkip(page, pageSize);

  const list = useQuery({
    queryKey: ['projects', 'list', { skip, limit: pageSize, search }],
    queryFn: () => getProjects(skip, pageSize, search || undefined),
    placeholderData: keepPreviousData,
  });
  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const wantsNew = searchParams.get('new') === '1';
  const dialog: DialogState = editing ? { mode: 'edit', project: editing } : wantsNew && canManage ? { mode: 'create' } : null;

  // The create dialog is driven by ?new=1 so the command palette can link straight to it.
  const openCreate = () => {
    setForm(EMPTY_FORM);
    setNameTouched(false);
    const next = new URLSearchParams(searchParams);
    next.set('new', '1');
    setSearchParams(next);
  };

  const openEdit = (project: Project) => {
    setForm({
      project_name: project.project_name,
      project_manager: project.project_manager ?? '',
      description: project.description ?? '',
    });
    setNameTouched(false);
    setEditing(project);
  };

  const closeDialog = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setNameTouched(false);
    if (searchParams.has('new')) {
      const next = new URLSearchParams(searchParams);
      next.delete('new');
      setSearchParams(next, { replace: true });
    }
  };

  const save = useMutation({
    mutationFn: (state: NonNullable<DialogState>) =>
      state.mode === 'create'
        ? createProject(toCreateBody(form))
        : updateProject(state.project.id, toUpdateBody(form)),
    onSuccess: (_data, state) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(state.mode === 'create' ? 'Project created' : 'Project updated');
      closeDialog();
    },
  });

  const archive = useMutation({
    mutationFn: (project: Project) => deleteProject(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project archived');
      setArchiving(null);
      // Step back when the last project on a later page was archived.
      if (rows.length === 1 && page > 0) {
        setCardPage((p) => Math.max(0, p - 1));
        setTableModel((m) => ({ ...m, page: Math.max(0, m.page - 1) }));
      }
    },
    onError: () => setArchiving(null),
  });

  const nameError = validateProjectName(form.project_name);
  const submit = () => {
    setNameTouched(true);
    if (nameError || !dialog) return;
    save.mutate(dialog);
  };

  const changeView = (_: unknown, next: ProjectsView | null) => {
    if (!next) return;
    setView(next);
    storeView(next);
  };

  const handleSearch = (value: string) => {
    setSearch(value.trim());
    setCardPage(0);
    setTableModel((m) => ({ ...m, page: 0 }));
  };

  const newProjectButton = canManage ? (
    <Button color="secondary" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
      New project
    </Button>
  ) : undefined;

  const emptyTitle = search ? 'No projects match your search' : 'No projects yet';
  const emptyDescription = search
    ? `Nothing matched "${search}". Try a different name or clear the search.`
    : canManage
      ? 'Create a project, then import an MS Project file to build its work breakdown structure.'
      : 'Projects will appear here once a manager creates them.';

  const renderActions = (project: Project) =>
    canManage ? (
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Tooltip title="Edit project">
          <IconButton size="small" aria-label={`Edit ${project.project_name}`} onClick={(e) => { e.stopPropagation(); openEdit(project); }}>
            <EditOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Archive project">
          <IconButton size="small" aria-label={`Archive ${project.project_name}`} onClick={(e) => { e.stopPropagation(); setArchiving(project); }}>
            <ArchiveOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    ) : null;

  const columns: GridColDef<Project>[] = [
    {
      field: 'project_name',
      headerName: 'Project',
      flex: 1.4,
      minWidth: 200,
      sortable: false,
      renderCell: ({ row }) => (
        <Link component={RouterLink} to={`/projects/${row.id}`} underline="hover" color="text.primary" fontWeight={600} onClick={(e) => e.stopPropagation()}>
          {row.project_name}
        </Link>
      ),
    },
    { field: 'project_manager', headerName: 'Manager', flex: 1, minWidth: 140, sortable: false, valueGetter: (_v, row) => row.project_manager ?? '—' },
    { field: 'status', headerName: 'Status', width: 140, sortable: false, renderCell: ({ row }) => (row.status ? <StatusChip kind="project" value={row.status} /> : '—') },
    {
      field: 'task_count',
      headerName: 'Tasks',
      type: 'number',
      width: 100,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      cellClassName: 'tabular-nums',
      valueFormatter: (value: number) => formatNumber(value),
    },
    { field: 'updated_at', headerName: 'Updated', width: 130, sortable: false, valueFormatter: (value: string) => formatDate(value) },
    { field: 'created_at', headerName: 'Created', width: 130, sortable: false, valueFormatter: (value: string) => formatDate(value) },
    ...(canManage
      ? [{ field: 'actions', headerName: 'Actions', width: 110, sortable: false, filterable: false, disableColumnMenu: true, renderCell: ({ row }: { row: Project }) => renderActions(row) } satisfies GridColDef<Project>]
      : []),
  ];

  const retry = (
    <Button variant="outlined" onClick={() => list.refetch()}>
      Retry
    </Button>
  );

  const empty = (
    <EmptyState icon={<FolderOpenOutlined />} title={emptyTitle} description={emptyDescription} action={!search ? newProjectButton : undefined} />
  );

  let content: React.ReactNode;
  if (list.isError && !list.data) {
    content = <ErrorState title="Could not load projects" description="Something went wrong while loading your projects. Check your connection and try again." action={retry} />;
  } else if (view === 'table') {
    content = (
      <DataTable<Project>
        ariaLabel="Projects"
        rows={rows}
        columns={columns}
        loading={list.isFetching}
        rowCount={total}
        paginationModel={tableModel}
        onPaginationModelChange={setTableModel}
        onRowClick={(row) => navigate(`/projects/${row.id}`)}
        emptyTitle={emptyTitle}
        emptyDescription={emptyDescription}
        emptyAction={!search ? newProjectButton : undefined}
      />
    );
  } else if (list.isPending) {
    content = (
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {Array.from({ length: 6 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </Box>
    );
  } else if (rows.length === 0) {
    content = empty;
  } else {
    content = (
      <>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {rows.map((project) => (
            <Card key={project.id} variant="outlined" sx={{ position: 'relative', '&:hover': { borderColor: 'text.secondary' } }}>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1 }}>
                  <Link
                    component={RouterLink}
                    to={`/projects/${project.id}`}
                    underline="hover"
                    color="text.primary"
                    variant="h6"
                    sx={{ overflowWrap: 'anywhere', '&::after': { content: '""', position: 'absolute', inset: 0 } }}
                  >
                    {project.project_name}
                  </Link>
                  <Box sx={{ position: 'relative', zIndex: 1, flexShrink: 0, mr: -0.5, mt: -0.5 }}>
                    {renderActions(project)}
                  </Box>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {project.project_manager ? `Manager: ${project.project_manager}` : 'No manager assigned'}
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
                  {project.status && <StatusChip kind="project" value={project.status} />}
                  {project.task_count > 0 && (
                    <Typography variant="body2" color="text.secondary" className="tabular-nums">
                      {formatNumber(project.task_count)} {project.task_count === 1 ? 'task' : 'tasks'}
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 'auto', pt: 1 }}>
                  Updated {formatDate(project.updated_at)} · Created {formatDate(project.created_at)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
        {total > CARD_PAGE_SIZE && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={Math.ceil(total / CARD_PAGE_SIZE)}
              page={cardPage + 1}
              onChange={(_, p) => setCardPage(p - 1)}
              color="primary"
              aria-label="Projects pagination"
            />
          </Box>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Projects"
        subtitle={list.data ? `${formatNumber(total)} ${total === 1 ? 'project' : 'projects'}${search ? ' found' : ''}` : undefined}
        actions={newProjectButton}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
        <Box sx={{ flex: '1 1 260px', maxWidth: 420 }}>
          <SearchField onChange={handleSearch} placeholder="Search projects" label="Search projects" fullWidth />
        </Box>
        <ToggleButtonGroup size="small" exclusive value={view} onChange={changeView} aria-label="Projects view">
          <ToggleButton value="cards" aria-label="Card view">
            <GridViewOutlined fontSize="small" />
          </ToggleButton>
          <ToggleButton value="table" aria-label="Table view">
            <TableRowsOutlined fontSize="small" />
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {content}

      <FormDialog
        open={dialog != null}
        title={dialog?.mode === 'edit' ? 'Edit project' : 'New project'}
        submitLabel={dialog?.mode === 'edit' ? 'Save changes' : 'Create project'}
        loading={save.isPending}
        onClose={closeDialog}
        onSubmit={submit}
      >
        <TextField
          autoFocus
          required
          label="Project name"
          value={form.project_name}
          onChange={(e) => setForm({ ...form, project_name: e.target.value })}
          onBlur={() => setNameTouched(true)}
          error={nameTouched && nameError != null}
          helperText={nameTouched && nameError ? nameError : ' '}
        />
        <TextField label="Project manager" value={form.project_manager} onChange={(e) => setForm({ ...form, project_manager: e.target.value })} />
        <TextField label="Description" multiline minRows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </FormDialog>

      <ConfirmDialog
        open={archiving != null}
        title="Archive project?"
        message={
          <>
            <strong>{archiving?.project_name}</strong> will be hidden from the projects list. Nothing is deleted and its data is kept, but
            there is no screen to restore an archived project yet.
          </>
        }
        confirmLabel="Archive project"
        destructive
        loading={archive.isPending}
        onConfirm={() => archiving && archive.mutate(archiving)}
        onClose={() => setArchiving(null)}
      />
    </>
  );
};

export default Projects;
