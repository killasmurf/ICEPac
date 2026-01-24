import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Grid,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, updateProject, Project, ProjectUpdateInput } from '../api/projects';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectUpdateInput>({});

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProject(Number(id))
      .then((data) => {
        setProject(data);
        setForm({
          project_name: data.project_name,
          project_manager: data.project_manager || '',
          description: data.description || '',
        });
      })
      .catch(() => setError('Failed to load project.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!id || !project) return;
    setSaving(true);
    try {
      const updated = await updateProject(Number(id), form);
      setProject(updated);
      setEditing(false);
    } catch {
      setError('Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !project) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')} sx={{ mb: 2 }}>
          Back to Projects
        </Button>
        <Typography color="error">{error || 'Project not found.'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
        {!editing ? (
          <Button startIcon={<EditIcon />} variant="outlined" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={() => setEditing(false)}>Cancel</Button>
            <Button
              startIcon={<SaveIcon />}
              variant="contained"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        )}
      </Box>

      <Paper sx={{ p: 3 }}>
        {editing ? (
          <>
            <TextField
              fullWidth
              label="Project Name"
              margin="normal"
              value={form.project_name || ''}
              onChange={(e) => setForm({ ...form, project_name: e.target.value })}
            />
            <TextField
              fullWidth
              label="Project Manager"
              margin="normal"
              value={form.project_manager || ''}
              onChange={(e) => setForm({ ...form, project_manager: e.target.value })}
            />
            <TextField
              fullWidth
              label="Description"
              margin="normal"
              multiline
              rows={4}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </>
        ) : (
          <>
            <Typography variant="h4" gutterBottom>
              {project.project_name}
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Project Manager
                </Typography>
                <Typography>{project.project_manager || 'Not assigned'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Typography>{project.archived ? 'Archived' : 'Active'}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Created
                </Typography>
                <Typography>{formatDateTime(project.created_at)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Last Modified
                </Typography>
                <Typography>{formatDateTime(project.updated_at)}</Typography>
              </Grid>
            </Grid>

            {project.description && (
              <>
                <Typography variant="subtitle2" color="text.secondary">
                  Description
                </Typography>
                <Typography sx={{ whiteSpace: 'pre-wrap' }}>
                  {project.description}
                </Typography>
              </>
            )}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default ProjectDetail;
