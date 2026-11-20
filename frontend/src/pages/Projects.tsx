import React, { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Link from '@mui/material/Link';
import Pagination from '@mui/material/Pagination';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlined from '@mui/icons-material/UnarchiveOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import GridViewOutlined from '@mui/icons-material/GridViewOutlined';
import TableRowsOutlined from '@mui/icons-material/TableRowsOutlined';
import type { GridColDef, GridPaginationModel, GridSortModel } from '@mui/x-data-grid';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { createProject, deleteProject, getProjects, restoreProject, updateProject, type Project } from '../api/projects';
import { useAuth } from '../auth/AuthContext';
import CardSkeleton from '../components/common/CardSkeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import DataTable from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import FormDialog from '../components/common/FormDialog';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';
import StatusChip, { resolveStatus } from '../components/common/StatusChip';
import { useToast } from '../components/feedback/ToastProvider';
import { formatDate, formatNumber } from '../utils/format';
import {
  CARD_PAGE_SIZE,
  COLUMN_TO_SORT,
  EMPTY_FORM,
  PROJECT_STATUSES,
  SORT_OPTIONS,
  SORT_TO_COLUMN,
  defaultOrder,
  readQueryState,
  readStoredView,
  sortSelectValue,
  storeView,
  toCreateBody,
  toSkip,
  toUpdateBody,
  validateProjectName,
  writeQueryState,
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
  const [restoring, setRestoring] = useState<Project | null>(null);

  const query = readQueryState(searchParams);
  const { archived, status, sort, order } = query;

  const pageSize = view === 'cards' ? CARD_PAGE_SIZE : tableModel.pageSize;
  const page = view === 'cards' ? cardPage : tableModel.page;
  const skip = toSkip(page, pageSize);

  const list = useQuery({
    queryKey: ['projects', 'list', { skip, limit: pageSize, search, archived, status, sort, order }],
    queryFn: () => getProjects(skip, pageSize, search || undefined, { archived, status, sort, order }),
    placeholderData: keepPreviousData,
  });
  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const wantsNew = searchParams.get('new') === '1';
  const dialog: DialogState = editing ? { mode: 'edit', project: editing } : wantsNew && canManage && !archived ? { mode: 'create' } : null;

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

  // Step back when the last project on a later page was archived or restored.
  const stepBackIfLast = () => {
    if (rows.length === 1 && page > 0) {
      setCardPage((p) => Math.max(0, p - 1));
      setTableModel((m) => ({ ...m, page: Math.max(0, m.page - 1) }));
    }
  };

  const archive = useMutation({
    mutationFn: (project: Project) => deleteProject(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Project archived');
      setArchiving(null);
      stepBackIfLast();
    },
    onError: () => setArchiving(null),
  });

  const restore = useMutation({
    mutationFn: (project: Project) => restoreProject(project.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Project restored');
      setRestoring(null);
      stepBackIfLast();
    },
    onError: () => setRestoring(null),
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

  const resetPaging = () => {
    setCardPage(0);
    setTableModel((m) => ({ ...m, page: 0 }));
  };

  const handleSearch = (value: string) => {
    setSearch(value.trim());
    resetPaging();
  };

  // Archived, status and sort live in the URL; changing any of them returns to the first page.
  const updateQuery = (patch: Partial<typeof query>) => {
    setSearchParams(writeQueryState(searchParams, { ...query, ...patch }));
    resetPaging();
  };

  const changeScope = (_: unknown, next: 'active' | 'archived' | null) => {
    if (next) updateQuery({ archived: next === 'archived' });
  };

  const changeSortOption = (value: string) => {
    const option = SORT_OPTIONS.find((o) => o.value === value);
    if (!option) return;
    // The server default (updated_at desc) is expressed by sending nothing.
    const isDefault = option.sort === 'updated_at' && option.order === 'desc';
    updateQuery({ sort: isDefault ? undefined : option.sort, order: isDefault ? undefined : option.order });
  };

  // Stable reference: the grid treats a new sortModel array as a sort change and jumps back to page 1.
  const sortModel = useMemo<GridSortModel>(
    () => (sort ? [{ field: SORT_TO_COLUMN[sort], sort: order ?? defaultOrder(sort) }] : []),
    [sort, order],
  );
  const changeSortModel = (model: GridSortModel) => {
    const item = model[0];
    const field = item ? COLUMN_TO_SORT[item.field] : undefined;
    const next = field && item.sort ? { sort: field, order: item.sort } : { sort: undefined, order: undefined };
    // The grid also reports unchanged models (for example on a page change); that must not reset paging.
    if (next.sort === sort && next.order === (sort ? (order ?? defaultOrder(sort)) : undefined)) return;
    updateQuery(next);
  };

  const newProjectButton = canManage && !archived ? (
    <Button color="secondary" variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
      New project
    </Button>
  ) : undefined;

  const filtered = Boolean(search || status);
  let emptyTitle = 'No projects yet';
  if (filtered) emptyTitle = 'No projects match your filters';
  else if (archived) emptyTitle = 'No archived projects';
  let emptyDescription: string;
  if (search) emptyDescription = `Nothing matched "${search}". Try a different name or clear the search.`;
  else if (status) emptyDescription = 'No projects have this status. Choose another status or clear the filter.';
  else if (archived) emptyDescription = 'Archived projects appear here, where they can be restored.';
  else
    emptyDescription = canManage
      ? 'Create a project, then import an MS Project file to build its work breakdown structure.'
      : 'Projects will appear here once a manager creates them.';

  const renderActions = (project: Project) => {
    if (!canManage) return null;
    if (archived) {
      return (
        <Tooltip title="Restore project">
          <IconButton size="small" aria-label={`Restore ${project.project_name}`} onClick={(e) => { e.stopPropagation(); setRestoring(project); }}>
            <UnarchiveOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      );
    }
    return (
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
    );
  };

  const columns: GridColDef<Project>[] = [
    {
      field: 'project_name',
      headerName: 'Project',
      flex: 1.4,
      minWidth: 200,
      sortable: true,
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
          <Link component={RouterLink} to={`/projects/${row.id}`} underline="hover" color="text.primary" fontWeight={600} onClick={(e) => e.stopPropagation()}>
            {row.project_name}
          </Link>
          {row.archived && <StatusChip kind="project" value="archived" />}
        </Box>
      ),
    },
    { field: 'project_manager', headerName: 'Manager', flex: 1, minWidth: 140, sortable: true, valueGetter: (_v, row) => row.project_manager ?? '—' },
    { field: 'status', headerName: 'Status', width: 140, sortable: true, renderCell: ({ row }) => (row.status ? <StatusChip kind="project" value={row.status} /> : '—') },
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
    { field: 'updated_at', headerName: 'Updated', width: 130, sortable: true, valueFormatter: (value: string) => formatDate(value) },
    { field: 'created_at', headerName: 'Created', width: 130, sortable: true, valueFormatter: (value: string) => formatDate(value) },
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
        sortModel={sortModel}
        onSortModelChange={changeSortModel}
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
                  {project.archived && <StatusChip kind="project" value="archived" />}
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
        subtitle={
          list.data
            ? `${formatNumber(total)} ${archived ? 'archived ' : ''}${total === 1 ? 'project' : 'projects'}${filtered ? ' found' : ''}`
            : undefined
        }
        actions={newProjectButton}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2 }}>
        <Box sx={{ flex: '1 1 260px', maxWidth: 420 }}>
          <SearchField onChange={handleSearch} placeholder="Search projects" label="Search projects" fullWidth />
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <ToggleButtonGroup size="small" exclusive value={archived ? 'archived' : 'active'} onChange={changeScope}
            aria-label="Project scope"
            sx={{ '& .MuiToggleButton-root': { px: 2, color: 'text.secondary', '&.Mui-selected': { color: 'text.primary', fontWeight: 600 } } }}
          >
            <ToggleButton value="active">Active</ToggleButton>
            <ToggleButton value="archived">Archived</ToggleButton>
          </ToggleButtonGroup>
          <ToggleButtonGroup size="small" exclusive value={view} onChange={changeView} aria-label="Projects view">
            <ToggleButton value="cards" aria-label="Card view">
              <GridViewOutlined fontSize="small" />
            </ToggleButton>
            <ToggleButton value="table" aria-label="Table view">
              <TableRowsOutlined fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <TextField
          select
          size="small"
          label="Status"
          value={status ?? ''}
          onChange={(e) => updateQuery({ status: e.target.value || undefined })}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All statuses</MenuItem>
          {PROJECT_STATUSES.map((value) => (
            <MenuItem key={value} value={value}>
              {resolveStatus('project', value).label}
            </MenuItem>
          ))}
        </TextField>
        {view === 'cards' && (
          <TextField select size="small" label="Sort by" value={sortSelectValue(query)} onChange={(e) => changeSortOption(e.target.value)} sx={{ minWidth: 200 }}>
            {SORT_OPTIONS.map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
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
            <strong>{archiving?.project_name}</strong> will be hidden from the projects list. Nothing is deleted and its data is kept. You
            can restore it later from the Archived view.
          </>
        }
        confirmLabel="Archive project"
        destructive
        loading={archive.isPending}
        onConfirm={() => archiving && archive.mutate(archiving)}
        onClose={() => setArchiving(null)}
      />

      <ConfirmDialog
        open={restoring != null}
        title="Restore project?"
        message={
          <>
            <strong>{restoring?.project_name}</strong> will return to the Active projects list.
          </>
        }
        confirmLabel="Restore project"
        loading={restore.isPending}
        onConfirm={() => restoring && restore.mutate(restoring)}
        onClose={() => setRestoring(null)}
      />
    </>
  );
};

export default Projects;
