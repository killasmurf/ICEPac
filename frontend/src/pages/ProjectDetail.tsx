import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  CircularProgress,
  Grid,
  Tabs,
  Tab,
  Chip,
  Drawer,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useParams, useNavigate } from 'react-router-dom';
import { getProject, updateProject, Project, ProjectUpdateInput, WBSItem } from '../api/projects';
import { getResources, getSuppliers, getConfigItems } from '../api/admin';
import ProjectUpload from '../components/project/ProjectUpload';
import WBSTree from '../components/project/WBSTree';
import EstimationSummary from '../components/estimation/EstimationSummary';
import WBSDetailPanel from '../components/estimation/WBSDetailPanel';

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'> = {
  draft: 'default',
  importing: 'info',
  imported: 'success',
  import_failed: 'error',
  active: 'primary',
  archived: 'warning',
};

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProjectUpdateInput>({});
  const [activeTab, setActiveTab] = useState(0);

  // Estimation panel state
  const [selectedWBS, setSelectedWBS] = useState<WBSItem | null>(null);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);

  // Lookup data for estimation forms
  const [resources, setResources] = useState<{ code: string; description: string }[]>([]);
  const [suppliers, setSuppliers] = useState<{ code: string; name: string }[]>([]);
  const [costTypes, setCostTypes] = useState<{ code: string; description: string }[]>([]);
  const [regions, setRegions] = useState<{ code: string; description: string }[]>([]);
  const [businessAreas, setBusinessAreas] = useState<{ code: string; description: string }[]>([]);
  const [estimatingTechniques, setEstimatingTechniques] = useState<{ code: string; description: string }[]>([]);
  const [riskCategories, setRiskCategories] = useState<{ code: string; description: string }[]>([]);
  const [probabilityLevels, setProbabilityLevels] = useState<{ code: string; description: string; weight: number }[]>([]);
  const [severityLevels, setSeverityLevels] = useState<{ code: string; description: string; weight: number }[]>([]);

  const loadProject = () => {
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
  };

  const loadLookupData = useCallback(async () => {
    try {
      const [
        resourcesRes,
        suppliersRes,
        costTypesRes,
        regionsRes,
        businessAreasRes,
        estTechniquesRes,
        riskCategoriesRes,
        probabilityRes,
        severityRes,
      ] = await Promise.all([
        getResources(0, 500, undefined, true),
        getSuppliers(0, 500, undefined, true),
        getConfigItems('cost-types', true),
        getConfigItems('regions', true),
        getConfigItems('business-areas', true),
        getConfigItems('estimating-techniques', true),
        getConfigItems('risk-categories', true),
        getConfigItems('probability-levels', true),
        getConfigItems('severity-levels', true),
      ]);

      setResources(resourcesRes.items.map((r) => ({ code: r.resource_code, description: r.description })));
      setSuppliers(suppliersRes.items.map((s) => ({ code: s.supplier_code, name: s.name })));
      setCostTypes(costTypesRes.items.map((i) => ({ code: i.code, description: i.description })));
      setRegions(regionsRes.items.map((i) => ({ code: i.code, description: i.description })));
      setBusinessAreas(businessAreasRes.items.map((i) => ({ code: i.code, description: i.description })));
      setEstimatingTechniques(estTechniquesRes.items.map((i) => ({ code: i.code, description: i.description })));
      setRiskCategories(riskCategoriesRes.items.map((i) => ({ code: i.code, description: i.description })));
      setProbabilityLevels(
        probabilityRes.items.map((i: any) => ({ code: i.code, description: i.description, weight: i.weight || 0 }))
      );
      setSeverityLevels(
        severityRes.items.map((i: any) => ({ code: i.code, description: i.description, weight: i.weight || 0 }))
      );
    } catch {
      // Lookup data is optional – estimation panel will still work with empty dropdowns
      console.warn('Failed to load some lookup data for estimation forms');
    }
  }, []);

  useEffect(() => {
    loadProject();
  }, [id]);

  // Load lookup data once when entering estimation-related tabs
  useEffect(() => {
    if (activeTab === 1 || activeTab === 3) {
      loadLookupData();
    }
  }, [activeTab, loadLookupData]);

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

  const handleImportComplete = () => {
    loadProject();
  };

  const handleWBSClick = useCallback((node: WBSItem) => {
    setSelectedWBS(node);
    setDetailPanelOpen(true);
  }, []);

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
          <Typography variant="h5">{project.project_name}</Typography>
          {project.status && (
            <Chip
              label={project.status.replace('_', ' ')}
              color={STATUS_COLORS[project.status] || 'default'}
              size="small"
            />
          )}
        </Box>
        {activeTab === 0 && !editing && (
          <Button startIcon={<EditIcon />} variant="outlined" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
        {activeTab === 0 && editing && (
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

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)}>
          <Tab label="Overview" />
          <Tab label={`WBS${project.task_count ? ` (${project.task_count})` : ''}`} />
          <Tab label="Import" />
          <Tab label="Estimation" />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      {activeTab === 0 && (
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
                  <Typography>{project.status || (project.archived ? 'Archived' : 'Active')}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Start Date
                  </Typography>
                  <Typography>{formatDate(project.start_date)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Finish Date
                  </Typography>
                  <Typography>{formatDate(project.finish_date)}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tasks
                  </Typography>
                  <Typography>{project.task_count}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Resources
                  </Typography>
                  <Typography>{project.resource_count}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Source File
                  </Typography>
                  <Typography>{project.source_file || '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Created
                  </Typography>
                  <Typography>{formatDateTime(project.created_at)}</Typography>
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
      )}

      {/* WBS Tab */}
      {activeTab === 1 && (
        <Paper>
          <WBSTree projectId={Number(id)} onNodeClick={handleWBSClick} />
        </Paper>
      )}

      {/* Import Tab */}
      {activeTab === 2 && (
        <Paper>
          <ProjectUpload projectId={Number(id)} onImportComplete={handleImportComplete} />
        </Paper>
      )}

      {/* Estimation Tab */}
      {activeTab === 3 && (
        <Paper sx={{ p: 3 }}>
          <EstimationSummary projectId={Number(id)} />
        </Paper>
      )}

      {/* WBS Detail Panel (drawer for assignments, risks, approval) */}
      <WBSDetailPanel
        open={detailPanelOpen}
        onClose={() => setDetailPanelOpen(false)}
        projectId={Number(id)}
        wbs={selectedWBS}
        resources={resources}
        suppliers={suppliers}
        costTypes={costTypes}
        regions={regions}
        businessAreas={businessAreas}
        estimatingTechniques={estimatingTechniques}
        riskCategories={riskCategories}
        probabilityLevels={probabilityLevels}
        severityLevels={severityLevels}
      />
    </Box>
  );
};

export default ProjectDetail;
