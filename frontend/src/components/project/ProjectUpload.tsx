/**
 * ProjectUpload
 *
 * Drag-and-drop (or "Choose file") upload for MS Project files (.mpp, .mpx, .xml).
 * Uploads with progress, polls the import job until it completes or fails,
 * shows a result summary and the project's import history.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getImportHistory,
  getImportStatus,
  uploadProjectFile,
  type ImportJob,
} from '../../api/projects';
import type { GridColDef } from '@mui/x-data-grid';
import DataTable from '../common/DataTable';
import { EmptyState } from '../common/EmptyState';
import ErrorState from '../common/ErrorState';
import { StatusChip } from '../common/StatusChip';
import { TableSkeleton } from '../common/TableSkeleton';
import { useToast } from '../feedback/ToastProvider';
import { formatDateTime, formatNumber } from '../../utils/format';
import {
  ALLOWED_EXTENSIONS,
  JOB_STATUS_DETAIL,
  MAX_FILE_BYTES,
  formatFileSize,
  isTerminalStatus,
  jobProgress,
  uploadErrorMessage,
  validateUploadFile,
} from './projectUploadUtils';

interface ProjectUploadProps {
  projectId: number;
  onImportComplete?: () => void;
}

const POLL_INTERVAL_MS = 2000;
const HISTORY_COLUMNS: GridColDef<ImportJob>[] = [
  {
    field: 'filename',
    headerName: 'File',
    flex: 1.5,
    minWidth: 200,
    sortable: false,
    renderCell: ({ row }) => (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', minWidth: 0, lineHeight: 1.3 }}>
        <Typography variant="body2" noWrap title={row.filename}>
          {row.filename}
        </Typography>
        {row.status === 'failed' && row.error_message && (
          <Typography variant="caption" color="error" noWrap title={row.error_message}>
            {row.error_message}
          </Typography>
        )}
      </Box>
    ),
  },
  { field: 'status', headerName: 'Status', width: 140, sortable: false, renderCell: ({ row }) => <StatusChip kind="job" value={row.status} /> },
  {
    field: 'task_count',
    headerName: 'Tasks',
    type: 'number',
    width: 100,
    sortable: false,
    cellClassName: 'tabular-nums',
    valueFormatter: (v: number) => formatNumber(v),
  },
  {
    field: 'resource_count',
    headerName: 'Resources',
    type: 'number',
    width: 120,
    sortable: false,
    cellClassName: 'tabular-nums',
    valueFormatter: (v: number) => formatNumber(v),
  },
  {
    field: 'file_size',
    headerName: 'Size',
    type: 'number',
    width: 110,
    sortable: false,
    cellClassName: 'tabular-nums',
    valueFormatter: (v: number | null) => formatFileSize(v),
  },
  {
    field: 'started_at',
    headerName: 'Started',
    width: 170,
    sortable: false,
    valueGetter: (_v, row) => row.started_at ?? row.created_at,
    valueFormatter: (v: string) => formatDateTime(v),
  },
];

const tint = (color: string) => `color-mix(in srgb, ${color} 14%, transparent)`;

const ProjectUpload: React.FC<ProjectUploadProps> = ({ projectId, onImportComplete }) => {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [jobId, setJobId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const notifiedJob = useRef<number | null>(null);

  const historyKey = ['projects', projectId, 'imports'] as const;

  const history = useQuery({
    queryKey: historyKey,
    queryFn: () => getImportHistory(projectId),
  });

  const job = useQuery({
    queryKey: [...historyKey, jobId],
    queryFn: () => getImportStatus(projectId, jobId as number),
    enabled: jobId != null,
    refetchInterval: (query) =>
      query.state.status === 'error' || isTerminalStatus(query.state.data?.status) ? false : POLL_INTERVAL_MS,
  });

  const upload = useMutation({
    meta: { silent: true },
    mutationFn: (file: File) => uploadProjectFile(projectId, file, setUploadPercent),
    onSuccess: (result) => {
      setSelectedFile(null);
      setJobId(result.job_id);
      queryClient.invalidateQueries({ queryKey: historyKey });
    },
  });

  const currentJob: ImportJob | undefined = job.data;
  const jobRunning = jobId != null && !isTerminalStatus(currentJob?.status) && !job.isError;
  const busy = upload.isPending || jobRunning;

  // Fire completion side effects once per job.
  useEffect(() => {
    if (!currentJob || !isTerminalStatus(currentJob.status) || notifiedJob.current === currentJob.id) return;
    notifiedJob.current = currentJob.id;
    queryClient.invalidateQueries({ queryKey: historyKey });
    if (currentJob.status === 'completed') {
      toast.success('Import completed');
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
      onImportComplete?.();
    } else {
      toast.error(currentJob.error_message || 'Import failed');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentJob]);

  const chooseFile = useCallback((file: File | undefined) => {
    if (!file) return;
    const message = validateUploadFile(file);
    setValidationError(message);
    if (!message) {
      upload.reset();
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!busy) chooseFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!busy) setIsDragging(true);
  };

  const startImport = () => {
    if (!selectedFile || busy) return;
    setUploadPercent(0);
    setJobId(null);
    upload.mutate(selectedFile);
  };

  const accepted = ALLOWED_EXTENSIONS.join(', ');
  const problem = validationError ?? (upload.isError ? uploadErrorMessage(upload.error) : null);

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        data-testid="upload-dropzone"
        data-dragging={isDragging}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setIsDragging(false)}
        sx={[
          {
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1,
            textAlign: 'center',
            px: 3,
            py: { xs: 4, sm: 6 },
            border: 2,
            borderStyle: 'dashed',
            borderRadius: 1,
            borderColor: 'divider',
            bgcolor: 'action.hover',
            opacity: busy ? 0.6 : 1,
            transition: 'border-color 150ms, background-color 150ms',
          },
          // Gold is the secondary colour in light mode and the primary colour in dark mode.
          isDragging && ((theme) => ({ borderColor: 'secondary.main', bgcolor: tint((theme.vars ?? theme).palette.secondary.main) })),
          isDragging &&
            ((theme) =>
              theme.applyStyles('dark', {
                borderColor: 'primary.main',
                bgcolor: tint((theme.vars ?? theme).palette.primary.main),
              })),
        ]}
      >
        <Box aria-hidden sx={{ color: 'text.secondary', display: 'flex', '& svg': { fontSize: 48 } }}>
          <CloudUploadOutlined />
        </Box>
        <Typography variant="h6" component="p">
          {isDragging ? 'Drop the file to select it' : 'Drag and drop an MS Project file here'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or
        </Typography>
        <Button variant="outlined" onClick={() => inputRef.current?.click()} disabled={busy}>
          Choose file
        </Button>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ALLOWED_EXTENSIONS.join(',')}
          aria-label="MS Project file"
          data-testid="upload-input"
          onChange={(e) => {
            chooseFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <Typography variant="body2" color="text.secondary">
          Accepted types: {accepted}. Maximum size: {formatFileSize(MAX_FILE_BYTES)}.
        </Typography>
      </Box>

      {problem && (
        <Alert severity="error" role="alert">
          {problem}
        </Alert>
      )}

      {selectedFile && !busy && (
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            p: 2,
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography fontWeight={600} sx={{ overflowWrap: 'anywhere' }}>
              {selectedFile.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(selectedFile.size)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button color="inherit" onClick={() => setSelectedFile(null)}>
              Remove
            </Button>
            <Button variant="contained" onClick={startImport}>
              Start import
            </Button>
          </Box>
        </Box>
      )}

      {upload.isPending && (
        <Box>
          <LinearProgress variant="determinate" value={uploadPercent} aria-label="Upload progress" />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Uploading... {uploadPercent}%
          </Typography>
        </Box>
      )}

      {jobRunning && (
        <Box>
          <LinearProgress
            variant={currentJob ? 'determinate' : 'indeterminate'}
            value={currentJob ? jobProgress(currentJob) : undefined}
            aria-label="Import progress"
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} role="status">
            {currentJob ? `${JOB_STATUS_DETAIL[currentJob.status] ?? currentJob.status} (${jobProgress(currentJob)}%)` : 'Starting import'}
          </Typography>
        </Box>
      )}

      {currentJob?.status === 'completed' && (
        <Alert severity="success">
          Import completed: {formatNumber(currentJob.task_count)} tasks, {formatNumber(currentJob.resource_count)} resources,{' '}
          {formatNumber(currentJob.assignment_count)} assignments created.
        </Alert>
      )}
      {currentJob?.status === 'failed' && (
        <Alert severity="error">Import failed: {currentJob.error_message || 'no error message was recorded.'}</Alert>
      )}

      <Box component="section" aria-labelledby="import-history-title">
        <Typography id="import-history-title" variant="h6" component="h2" sx={{ mb: 1.5 }}>
          Import history
        </Typography>
        {history.isPending ? (
          <TableSkeleton rows={3} columns={5} />
        ) : history.isError ? (
          <ErrorState
            title="Could not load import history"
            action={
              <Button variant="outlined" onClick={() => history.refetch()}>
                Retry
              </Button>
            }
          />
        ) : history.data.items.length === 0 ? (
          <EmptyState title="No imports yet" description="Imports of MS Project files for this project will be listed here." />
        ) : (
          <DataTable<ImportJob> rows={history.data.items} columns={HISTORY_COLUMNS} ariaLabel="Import history" />
        )}
      </Box>
    </Box>
  );
};

export default ProjectUpload;
