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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getImportHistory,
  getImportStatus,
  uploadProjectFile,
  type ImportJob,
} from '../../api/projects';
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
          <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}>
            <Table size="small" aria-label="Import history">
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Tasks</TableCell>
                  <TableCell align="right">Resources</TableCell>
                  <TableCell align="right">Size</TableCell>
                  <TableCell>Started</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.data.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell sx={{ overflowWrap: 'anywhere' }}>
                      {item.filename}
                      {item.status === 'failed' && item.error_message && (
                        <Typography variant="caption" color="error" component="div">
                          {item.error_message}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip kind="job" value={item.status} />
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {formatNumber(item.task_count)}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {formatNumber(item.resource_count)}
                    </TableCell>
                    <TableCell align="right" className="tabular-nums">
                      {formatFileSize(item.file_size)}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(item.started_at ?? item.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Box>
  );
};

export default ProjectUpload;
