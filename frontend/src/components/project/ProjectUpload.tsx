/**
 * ProjectUpload Component
 *
 * Drag-and-drop file upload zone for MS Project files (.mpp, .mpx, .xml).
 * Starts an async import, polls for status, and displays progress.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  uploadProjectFile,
  getImportStatus,
  getImportHistory,
  ImportJob,
  ImportStartResponse,
} from '../../api/projects';

// ============================================================
// Types
// ============================================================

interface ProjectUploadProps {
  projectId: number;
  onImportComplete?: () => void;
}

// ============================================================
// Styles
// ============================================================

const styles = {
  container: {
    padding: '24px',
  },
  dropZone: {
    border: '2px dashed #ccc',
    borderRadius: '8px',
    padding: '48px 24px',
    textAlign: 'center' as const,
    cursor: 'pointer',
    transition: 'all 0.2s',
    backgroundColor: '#fafafa',
  },
  dropZoneActive: {
    border: '2px dashed #1976d2',
    backgroundColor: '#e3f2fd',
  },
  dropZoneDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
  },
  dropIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  dropText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '8px',
  },
  dropSubText: {
    fontSize: '13px',
    color: '#999',
  },
  selectedFile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    backgroundColor: '#f5f5f5',
    borderRadius: '6px',
    marginTop: '16px',
  },
  fileName: {
    fontWeight: 500 as const,
    color: '#333',
  },
  fileSize: {
    fontSize: '13px',
    color: '#999',
  },
  uploadButton: {
    display: 'inline-block',
    padding: '10px 24px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500 as const,
    cursor: 'pointer',
    marginTop: '16px',
  },
  uploadButtonDisabled: {
    backgroundColor: '#bbb',
    cursor: 'not-allowed',
  },
  progressContainer: {
    marginTop: '24px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    overflow: 'hidden' as const,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#1976d2',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: '13px',
    color: '#666',
    marginTop: '8px',
  },
  successMessage: {
    padding: '16px',
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    borderRadius: '6px',
    marginTop: '16px',
  },
  errorMessage: {
    padding: '16px',
    backgroundColor: '#fce4ec',
    color: '#c62828',
    borderRadius: '6px',
    marginTop: '16px',
  },
  historySection: {
    marginTop: '32px',
  },
  historyTitle: {
    fontSize: '16px',
    fontWeight: 600 as const,
    marginBottom: '12px',
  },
  historyItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 16px',
    borderBottom: '1px solid #eee',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500 as const,
  },
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  uploading: 'Uploading',
  parsing: 'Parsing file...',
  creating_records: 'Creating WBS records...',
  completed: 'Completed',
  failed: 'Failed',
};

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fff3e0', color: '#e65100' },
  uploading: { bg: '#e3f2fd', color: '#1565c0' },
  parsing: { bg: '#e3f2fd', color: '#1565c0' },
  creating_records: { bg: '#e3f2fd', color: '#1565c0' },
  completed: { bg: '#e8f5e9', color: '#2e7d32' },
  failed: { bg: '#fce4ec', color: '#c62828' },
};

const ALLOWED_EXTENSIONS = ['.mpp', '.mpx', '.xml'];

// ============================================================
// Component
// ============================================================

const ProjectUpload: React.FC<ProjectUploadProps> = ({ projectId, onImportComplete }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [currentJob, setCurrentJob] = useState<ImportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<ImportJob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  // Load import history
  useEffect(() => {
    getImportHistory(projectId)
      .then((res) => setHistory(res.items))
      .catch(() => {});
  }, [projectId, currentJob]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const validateFile = (file: File): boolean => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setError(`Invalid file type "${ext}". Supported: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return false;
    }
    if (file.size > 100 * 1024 * 1024) {
      setError('File too large. Maximum size: 100 MB');
      return false;
    }
    return true;
  };

  const handleFileSelect = (file: File) => {
    setError(null);
    if (validateFile(file)) {
      setSelectedFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const startPolling = (jobId: number) => {
    pollRef.current = window.setInterval(async () => {
      try {
        const job = await getImportStatus(projectId, jobId);
        setCurrentJob(job);
        if (job.status === 'completed' || job.status === 'failed') {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setIsUploading(false);
          if (job.status === 'completed' && onImportComplete) {
            onImportComplete();
          }
        }
      } catch {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = null;
        setIsUploading(false);
      }
    }, 2000);
  };

  const handleUpload = async () => {
    if (!selectedFile || isUploading) return;
    setError(null);
    setIsUploading(true);
    setCurrentJob(null);

    try {
      const result: ImportStartResponse = await uploadProjectFile(projectId, selectedFile);
      startPolling(result.job_id);
      setSelectedFile(null);
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Upload failed');
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div style={styles.container}>
      {/* Drop Zone */}
      <div
        style={{
          ...styles.dropZone,
          ...(isDragging ? styles.dropZoneActive : {}),
          ...(isUploading ? styles.dropZoneDisabled : {}),
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div style={styles.dropIcon}>&#128193;</div>
        <div style={styles.dropText}>
          {isDragging ? 'Drop file here' : 'Drag & drop an MS Project file, or click to browse'}
        </div>
        <div style={styles.dropSubText}>Supported: .mpp, .mpx, .xml (max 100 MB)</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mpp,.mpx,.xml"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
      </div>

      {/* Selected File */}
      {selectedFile && (
        <div style={styles.selectedFile}>
          <div>
            <div style={styles.fileName}>{selectedFile.name}</div>
            <div style={styles.fileSize}>{formatFileSize(selectedFile.size)}</div>
          </div>
          <button
            style={{
              ...styles.uploadButton,
              ...(isUploading ? styles.uploadButtonDisabled : {}),
            }}
            onClick={handleUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      )}

      {/* Progress */}
      {currentJob && currentJob.status !== 'completed' && currentJob.status !== 'failed' && (
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${currentJob.progress}%` }} />
          </div>
          <div style={styles.progressText}>
            {STATUS_LABELS[currentJob.status] || currentJob.status} ({Math.round(currentJob.progress)}%)
          </div>
        </div>
      )}

      {/* Success */}
      {currentJob?.status === 'completed' && (
        <div style={styles.successMessage}>
          Import completed: {currentJob.task_count} tasks, {currentJob.resource_count} resources,{' '}
          {currentJob.assignment_count} assignments
        </div>
      )}

      {/* Error */}
      {(error || currentJob?.status === 'failed') && (
        <div style={styles.errorMessage}>
          {error || currentJob?.error_message || 'Import failed'}
        </div>
      )}

      {/* Import History */}
      {history.length > 0 && (
        <div style={styles.historySection}>
          <div style={styles.historyTitle}>Import History</div>
          {history.map((job) => {
            const statusStyle = STATUS_COLORS[job.status] || { bg: '#eee', color: '#333' };
            return (
              <div key={job.id} style={styles.historyItem}>
                <div>
                  <div style={{ fontWeight: 500 }}>{job.filename}</div>
                  <div style={{ fontSize: '12px', color: '#999' }}>
                    {formatDate(job.created_at)}
                    {job.task_count > 0 && ` — ${job.task_count} tasks`}
                  </div>
                </div>
                <span
                  style={{
                    ...styles.statusBadge,
                    backgroundColor: statusStyle.bg,
                    color: statusStyle.color,
                  }}
                >
                  {STATUS_LABELS[job.status] || job.status}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProjectUpload;
