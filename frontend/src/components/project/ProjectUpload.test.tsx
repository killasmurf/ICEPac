import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/renderWithProviders';
import type { ImportJob } from '../../api/projects';
import ProjectUpload from './ProjectUpload';

const api = vi.hoisted(() => ({
  uploadProjectFile: vi.fn(),
  getImportStatus: vi.fn(),
  getImportHistory: vi.fn(),
}));
vi.mock('../../api/projects', () => api);

const job = (over: Partial<ImportJob> = {}): ImportJob => ({
  id: 7,
  project_id: 1,
  user_id: 1,
  filename: 'plan.mpp',
  s3_key: null,
  file_size: 2048,
  status: 'pending',
  progress: 0,
  celery_task_id: null,
  task_count: 0,
  resource_count: 0,
  assignment_count: 0,
  error_message: null,
  started_at: '2026-03-01T01:00:00Z',
  completed_at: null,
  created_at: '2026-03-01T01:00:00Z',
  updated_at: '2026-03-01T01:00:00Z',
  ...over,
});

const file = (name: string, size = 2048) => new File([new Uint8Array(size)], name);

beforeEach(() => {
  vi.resetAllMocks();
  api.getImportHistory.mockResolvedValue({ items: [], total: 0 });
});

describe('ProjectUpload', () => {
  it('lists accepted types and the size limit, and shows the empty history', async () => {
    renderWithProviders(<ProjectUpload projectId={1} />);
    expect(screen.getByText(/Accepted types: \.mpp, \.mpx, \.xml\. Maximum size: 100\.0 MB/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Choose file' })).toBeInTheDocument();
    expect(await screen.findByText('No imports yet')).toBeInTheDocument();
  });

  it('shows a clear message for an invalid file type and does not upload', async () => {
    const user = userEvent.setup({ applyAccept: false });
    renderWithProviders(<ProjectUpload projectId={1} />);
    await user.upload(screen.getByTestId('upload-input'), file('sheet.xlsx'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid file type ".xlsx"');
    expect(screen.queryByRole('button', { name: 'Start import' })).not.toBeInTheDocument();
    expect(api.uploadProjectFile).not.toHaveBeenCalled();
  });

  it('uploads, polls until completed, then shows the summary and calls onImportComplete once', async () => {
    const user = userEvent.setup();
    const onImportComplete = vi.fn();
    api.uploadProjectFile.mockResolvedValue({ job_id: 7, status: 'pending', message: 'ok' });
    api.getImportStatus.mockResolvedValue(job({ status: 'completed', progress: 100, task_count: 12, resource_count: 3, assignment_count: 20 }));
    renderWithProviders(<ProjectUpload projectId={1} onImportComplete={onImportComplete} />);

    await user.upload(screen.getByTestId('upload-input'), file('plan.mpp'));
    await user.click(await screen.findByRole('button', { name: 'Start import' }));

    expect(api.uploadProjectFile).toHaveBeenCalledWith(1, expect.any(File), expect.any(Function));
    expect(await screen.findByText(/Import completed: 12 tasks, 3 resources, 20 assignments/)).toBeInTheDocument();
    await waitFor(() => expect(onImportComplete).toHaveBeenCalledTimes(1));
  });

  it('shows the error message of a failed job and does not call onImportComplete', async () => {
    const user = userEvent.setup();
    const onImportComplete = vi.fn();
    api.uploadProjectFile.mockResolvedValue({ job_id: 7, status: 'pending', message: 'ok' });
    api.getImportStatus.mockResolvedValue(job({ status: 'failed', error_message: 'Corrupt file' }));
    renderWithProviders(<ProjectUpload projectId={1} onImportComplete={onImportComplete} />);

    await user.upload(screen.getByTestId('upload-input'), file('plan.mpp'));
    await user.click(await screen.findByRole('button', { name: 'Start import' }));

    expect(await screen.findByText(/Import failed: Corrupt file/)).toBeInTheDocument();
    expect(onImportComplete).not.toHaveBeenCalled();
  });

  it('shows the backend detail when the upload is rejected', async () => {
    const user = userEvent.setup();
    api.uploadProjectFile.mockRejectedValue({ response: { data: { detail: 'Invalid file: File too small' } } });
    renderWithProviders(<ProjectUpload projectId={1} />);
    await user.upload(screen.getByTestId('upload-input'), file('plan.mpp'));
    await user.click(await screen.findByRole('button', { name: 'Start import' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid file: File too small');
  });

  it('renders import history with status chips', async () => {
    api.getImportHistory.mockResolvedValue({
      items: [job({ id: 1, status: 'completed', task_count: 40, filename: 'old.mpp' }), job({ id: 2, status: 'failed', filename: 'bad.xml', error_message: 'Boom' })],
      total: 2,
    });
    renderWithProviders(<ProjectUpload projectId={1} />);
    expect(await screen.findByText('old.mpp')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Boom')).toBeInTheDocument();
  });

  it('highlights the drop zone on drag-over', async () => {
    const { fireEvent } = await import('@testing-library/react');
    renderWithProviders(<ProjectUpload projectId={1} />);
    const zone = screen.getByTestId('upload-dropzone');
    fireEvent.dragOver(zone);
    expect(zone).toHaveAttribute('data-dragging', 'true');
    fireEvent.dragLeave(zone);
    expect(zone).toHaveAttribute('data-dragging', 'false');
  });
});
