/**
 * ResourceLibrary Component
 * 
 * Admin page for managing resources with full CRUD operations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataGrid, { Column, StatusBadge } from '../../components/admin/DataGrid';
import FormDialog from '../../components/admin/FormDialog';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import SearchBar from '../../components/admin/SearchBar';
import { Resource } from '../../api/admin';

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1400px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  title: { fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' },
  subtitle: { fontSize: '15px', color: '#64748b' },
  primaryButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' },
  filters: { display: 'flex', gap: '12px', alignItems: 'center' },
  filterSelect: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#475569', backgroundColor: '#fff', cursor: 'pointer' },
  tableCard: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  formGroupFull: { gridColumn: '1 / -1' },
  label: { fontSize: '14px', fontWeight: 500, color: '#374151' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer' },
  error: { color: '#dc2626', fontSize: '13px', marginTop: '4px' },
  toast: { position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 500, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  toastSuccess: { backgroundColor: '#10b981' },
  toastError: { backgroundColor: '#ef4444' },
  costCell: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 500, color: '#059669' },
};

const mockResources: Resource[] = [
  { id: 1, resource_code: 'ENG-SR', description: 'Senior Engineer', eoc: 'LABOR', cost: 150.00, units: 'hour', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-15' },
  { id: 2, resource_code: 'ENG-JR', description: 'Junior Engineer', eoc: 'LABOR', cost: 85.00, units: 'hour', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-15' },
  { id: 3, resource_code: 'PM', description: 'Project Manager', eoc: 'LABOR', cost: 175.00, units: 'hour', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-15' },
  { id: 4, resource_code: 'BA', description: 'Business Analyst', eoc: 'LABOR', cost: 125.00, units: 'hour', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-15' },
  { id: 5, resource_code: 'QA', description: 'QA Engineer', eoc: 'LABOR', cost: 95.00, units: 'hour', is_active: false, created_at: '2024-01-01', updated_at: '2024-01-15' },
  { id: 6, resource_code: 'ARCH', description: 'Solution Architect', eoc: 'LABOR', cost: 200.00, units: 'hour', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-15' },
  { id: 7, resource_code: 'EQUIP-PC', description: 'Workstation', eoc: 'EQUIPMENT', cost: 2500.00, units: 'each', is_active: true, created_at: '2024-01-01', updated_at: '2024-01-15' },
];

interface FormData { resource_code: string; description: string; eoc: string; cost: string; units: string; is_active: boolean; }
const initialFormData: FormData = { resource_code: '', description: '', eoc: 'LABOR', cost: '0', units: 'hour', is_active: true };
const eocOptions = ['LABOR', 'MATERIAL', 'EQUIPMENT', 'SUBCONTRACT', 'ODC'];
const unitOptions = ['hour', 'day', 'week', 'month', 'each', 'lot'];

function ResourceLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const [eocFilter, setEocFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadResources = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    let filtered = [...mockResources];
    if (search) { const s = search.toLowerCase(); filtered = filtered.filter(r => r.resource_code.toLowerCase().includes(s) || r.description.toLowerCase().includes(s)); }
    if (eocFilter !== 'all') filtered = filtered.filter(r => r.eoc === eocFilter);
    if (statusFilter === 'active') filtered = filtered.filter(r => r.is_active);
    else if (statusFilter === 'inactive') filtered = filtered.filter(r => !r.is_active);
    setResources(filtered.slice(skip, skip + 20));
    setTotal(filtered.length);
    setLoading(false);
  }, [skip, search, eocFilter, statusFilter]);

  useEffect(() => { loadResources(); }, [loadResources]);
  useEffect(() => { if (searchParams.get('action') === 'new') { setShowCreateDialog(true); setSearchParams({}); } }, [searchParams, setSearchParams]);

  const showToast = (message: string, type: 'success' | 'error') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.resource_code) errors.resource_code = 'Required';
    if (!formData.description) errors.description = 'Required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => { if (!validateForm()) return; setSaving(true); await new Promise(r => setTimeout(r, 500)); showToast('Resource created', 'success'); setShowCreateDialog(false); setFormData(initialFormData); loadResources(); setSaving(false); };
  const handleEdit = (r: Resource) => { setSelectedResource(r); setFormData({ resource_code: r.resource_code, description: r.description, eoc: r.eoc || 'LABOR', cost: r.cost.toString(), units: r.units || 'hour', is_active: r.is_active }); setFormErrors({}); setShowEditDialog(true); };
  const handleUpdate = async () => { if (!validateForm()) return; setSaving(true); await new Promise(r => setTimeout(r, 500)); showToast('Resource updated', 'success'); setShowEditDialog(false); setSelectedResource(null); loadResources(); setSaving(false); };
  const handleDelete = (r: Resource) => { setSelectedResource(r); setShowDeleteDialog(true); };
  const confirmDelete = async () => { setSaving(true); await new Promise(r => setTimeout(r, 500)); showToast('Resource deleted', 'success'); setShowDeleteDialog(false); setSelectedResource(null); loadResources(); setSaving(false); };
  const handleInputChange = (field: keyof FormData, value: string | boolean) => { setFormData(p => ({ ...p, [field]: value })); if (formErrors[field]) setFormErrors(p => ({ ...p, [field]: '' })); };

  const columns: Column<Resource>[] = [
    { key: 'resource_code', header: 'Code', sortable: true, width: '120px', render: r => <span style={{ fontWeight: 600 }}>{r.resource_code}</span> },
    { key: 'description', header: 'Description', sortable: true },
    { key: 'eoc', header: 'EOC', sortable: true, width: '120px', render: r => <span style={{ padding: '4px 8px', backgroundColor: '#f1f5f9', borderRadius: '4px', fontSize: '12px' }}>{r.eoc}</span> },
    { key: 'cost', header: 'Cost', sortable: true, width: '120px', render: r => <span style={styles.costCell}>${r.cost.toLocaleString()}</span> },
    { key: 'units', header: 'Units', sortable: true, width: '100px' },
    { key: 'is_active', header: 'Status', sortable: true, width: '100px', render: r => <StatusBadge isActive={r.is_active} /> },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div><h1 style={styles.title}>Resource Library</h1><p style={styles.subtitle}>Manage resources for project estimation</p></div>
        <button style={styles.primaryButton} onClick={() => { setFormData(initialFormData); setFormErrors({}); setShowCreateDialog(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Resource
        </button>
      </div>

      <div style={styles.toolbar}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search resources..." />
        <div style={styles.filters}>
          <select style={styles.filterSelect} value={eocFilter} onChange={e => setEocFilter(e.target.value)}>
            <option value="all">All EOC</option>
            {eocOptions.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <select style={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div style={styles.tableCard}>
        <DataGrid data={resources} columns={columns} keyField="id" loading={loading} emptyMessage="No resources found"
          onEdit={handleEdit} onDelete={handleDelete} pagination={{ total, skip, limit: 20, onPageChange: setSkip }} />
      </div>

      <FormDialog open={showCreateDialog} title="Create Resource" onClose={() => setShowCreateDialog(false)} onSubmit={handleCreate} loading={saving} submitLabel="Create">
        <div style={styles.formGrid}>
          <div style={styles.formGroup}><label style={styles.label}>Code *</label><input style={styles.input} value={formData.resource_code} onChange={e => handleInputChange('resource_code', e.target.value.toUpperCase())} />{formErrors.resource_code && <span style={styles.error}>{formErrors.resource_code}</span>}</div>
          <div style={styles.formGroup}><label style={styles.label}>EOC</label><select style={styles.select} value={formData.eoc} onChange={e => handleInputChange('eoc', e.target.value)}>{eocOptions.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
          <div style={{...styles.formGroup, ...styles.formGroupFull}}><label style={styles.label}>Description *</label><input style={styles.input} value={formData.description} onChange={e => handleInputChange('description', e.target.value)} />{formErrors.description && <span style={styles.error}>{formErrors.description}</span>}</div>
          <div style={styles.formGroup}><label style={styles.label}>Cost</label><input style={styles.input} type="number" value={formData.cost} onChange={e => handleInputChange('cost', e.target.value)} /></div>
          <div style={styles.formGroup}><label style={styles.label}>Units</label><select style={styles.select} value={formData.units} onChange={e => handleInputChange('units', e.target.value)}>{unitOptions.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
        </div>
      </FormDialog>

      <FormDialog open={showEditDialog} title="Edit Resource" onClose={() => setShowEditDialog(false)} onSubmit={handleUpdate} loading={saving} submitLabel="Save">
        <div style={styles.formGrid}>
          <div style={styles.formGroup}><label style={styles.label}>Code *</label><input style={styles.input} value={formData.resource_code} onChange={e => handleInputChange('resource_code', e.target.value.toUpperCase())} />{formErrors.resource_code && <span style={styles.error}>{formErrors.resource_code}</span>}</div>
          <div style={styles.formGroup}><label style={styles.label}>EOC</label><select style={styles.select} value={formData.eoc} onChange={e => handleInputChange('eoc', e.target.value)}>{eocOptions.map(e => <option key={e} value={e}>{e}</option>)}</select></div>
          <div style={{...styles.formGroup, ...styles.formGroupFull}}><label style={styles.label}>Description *</label><input style={styles.input} value={formData.description} onChange={e => handleInputChange('description', e.target.value)} />{formErrors.description && <span style={styles.error}>{formErrors.description}</span>}</div>
          <div style={styles.formGroup}><label style={styles.label}>Cost</label><input style={styles.input} type="number" value={formData.cost} onChange={e => handleInputChange('cost', e.target.value)} /></div>
          <div style={styles.formGroup}><label style={styles.label}>Units</label><select style={styles.select} value={formData.units} onChange={e => handleInputChange('units', e.target.value)}>{unitOptions.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
          <div style={styles.formGroup}><label style={styles.label}>Status</label><select style={styles.select} value={formData.is_active ? 'active' : 'inactive'} onChange={e => handleInputChange('is_active', e.target.value === 'active')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={showDeleteDialog} title="Delete Resource" message={`Delete "${selectedResource?.resource_code}"?`} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} loading={saving} confirmLabel="Delete" danger />

      {toast && <div style={{...styles.toast, ...(toast.type === 'success' ? styles.toastSuccess : styles.toastError)}}>{toast.message}</div>}
    </div>
  );
}

export default ResourceLibrary;
