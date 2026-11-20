import React from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { restoreProject, type Project } from '../../api/projects';
import { useAuth } from '../../auth/AuthContext';
import { useToast } from '../feedback/ToastProvider';

export interface ArchivedProjectBannerProps {
  project: Pick<Project, 'id' | 'project_name' | 'archived'>;
}

/**
 * Non-dismissable notice for an archived project. Admins and managers get a Restore button.
 * Renders nothing for an active project, so it can be mounted unconditionally.
 */
export function ArchivedProjectBanner({ project }: ArchivedProjectBannerProps) {
  const { role } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const canRestore = role === 'admin' || role === 'manager';

  const restore = useMutation({
    mutationFn: () => restoreProject(project.id),
    onSuccess: () => {
      // The project itself, every project list (both views) and the dashboard's active-project counts.
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Project restored');
    },
  });

  if (!project.archived) return null;

  return (
    <Alert
      severity="warning"
      sx={{ mb: 2 }}
      action={
        canRestore ? (
          <Button color="inherit" size="small" onClick={() => restore.mutate()} disabled={restore.isPending}>
            {restore.isPending ? 'Restoring' : 'Restore'}
          </Button>
        ) : undefined
      }
    >
      This project is archived. It is hidden from the active projects list
      {canRestore ? ' until it is restored.' : '; ask a manager to restore it.'}
    </Alert>
  );
}

export default ArchivedProjectBanner;
