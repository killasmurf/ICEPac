import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useNavigate } from 'react-router-dom';
import { getProjects, createProject, deleteProject, Project, ProjectCreateInput } from '../api/projects';

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  draft: 'default',
  importing: 'info',
  imported: 'success',
  import_failed: 'error',
  active: 'primary',
  archived: 'warning',
};

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProject, setNewProject] = useState<ProjectCreateInput>({
    project_name: '',
    project_manager: '',
    description: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async (search?: string) => {
    setLoading(true);
    setError('');
    try {
      const data = await getProjects(0, 100, search || undefined);
      setProjects(data.items);
      setTotal(data.total);
    } catch {
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    loadProjects(query || undefined);
  };

  const handleCreate = async () => {
    if (!newProject.project_name.trim()) return;
    setCreating(true);
    try {
      await createProject(newProject);
      setDialogOpen(false);
      setNewProject({ project_name: '', project_manager: '', description: '' });
      loadProjects(searchQuery || undefined);
    } catch {
      setError('Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm('Archive this project?')) return;
    try {
      await deleteProject(id);
      loadProjects(searchQuery || undefined);
    } catch {
      setError('Failed to archive project.');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4">Projects</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          New Project
        </Button>
      </Box>

      <TextField
        fullWidth
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Manager</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Tasks</TableCell>
                <TableCell>Created</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography color="text.secondary" sx={{ py: 4 }}>
                      No projects found.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow
                    key={project.id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <TableCell>
                      <Typography fontWeight={500}>{project.project_name}</Typography>
                    </TableCell>
                    <TableCell>{project.project_manager || '-'}</TableCell>
                    <TableCell>
                      {project.status && (
                        <Chip
                          label={project.status.replace('_', ' ')}
                          color={STATUS_COLORS[project.status] || 'default'}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">{project.task_count || 0}</TableCell>
                    <TableCell>{formatDate(project.created_at)}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => handleDelete(e, project.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!loading && total > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {total} project{total !== 1 ? 's' : ''}
        </Typography>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New Project</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Project Name"
            margin="normal"
            value={newProject.project_name}
            onChange={(e) => setNewProject({ ...newProject, project_name: e.target.value })}
          />
          <TextField
            fullWidth
            label="Project Manager"
            margin="normal"
            value={newProject.project_manager}
            onChange={(e) => setNewProject({ ...newProject, project_manager: e.target.value })}
          />
          <TextField
            fullWidth
            label="Description"
            margin="normal"
            multiline
            rows={3}
            value={newProject.description}
            onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={creating || !newProject.project_name.trim()}
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Projects;
