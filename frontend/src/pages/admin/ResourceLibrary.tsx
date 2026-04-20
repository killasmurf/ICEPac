/**
 * ResourceLibrary - Admin page for managing resources with EOC filtering.
 */
import React, { useState } from 'react';
import DataGrid, { Column, StatusBadge } from '../../components/admin/DataGrid';
import FormDialog from '../../components/admin/FormDialog';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import SearchBar from '../../components/admin/SearchBar';
import { Resource } from '../../api/admin';

const MOCK_RESOURCES: Resource[] = [
  { id: 1, resource_code: 'LBR-001', description: 'Senior Engineer', eoc: 'Labor', cost: 175.0, units: 'hours', supplier_name: 'Acme Corp', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-15' },
  { id: 2, resource_code: 'LBR-002', description: 'Junior Analyst', eoc: 'Labor', cost: 85.0, units: 'hours', is_active: true, created_at: '2026-01-02', updated_at: '2026-01-14' },
  { id: 3, resource_code: 'MAT-001', description: 'Server Hardware', eoc: 'Materials', cost: 12500.0, units: 'each', supplier_name: 'Dell Inc', is_active: true, created_at: '2026-01-03', updated_at: '2026-01-13' },
  { id: 4, resource_code: 'TRV-001', description: 'Domestic Travel', eoc: 'Travel', cost: 500.0, units: 'trip', is_active: true, created_at: '2026-01-04', updated_at: '2026-01-12' },
  { id: 5, resource_code: 'SUB-001', description: 'Testing Contractor', eoc: 'Subcontract', cost: 225.0, units: 'hours', supplier_name: 'QA Partners', is_active: false, created_at: '2025-11-01', updated_at: '2026-01-10' },
];

const EMPTY_FORM = { resource_code: '', description: '', eoc: '', cost: 0, units: '', supplier_name: '', notes: '' };

export default function ResourceLibrary() {
  const [resources, setResources] = useState<Resource[]>(MOCK_RESOURCES);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [eocFilter, setEocFilter] = useState('');
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const handleCreate = () => { setSelected(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const handleEdit = (r: Resource) => { setSelected(r); setForm({ resource_code: r.resource_code, description: r.description, eoc: r.eoc || '', cost: r.cost, units: r.units || '', supplier_name: r.supplier_name || '', notes: r.notes || '' }); setShowForm(true); };

  const handleSubmit = () => {
    setSaving(true);
    if (selected) {
      setResources(prev => prev.map(r => r.id === selected.id ? { ...r, ...form, updated_at: new Date().toISOString() } : r));
      showToast(`Resource "${form.resource_code}" updated`);
    } else {
      setResources(prev => [...prev, { ...form, id: Math.max(...prev.map(r => r.id)) + 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
      showToast(`Resource "${form.resource_code}" created`);
    }
    setShowForm(false); setSaving(false);
  };

  const confirmDelete = () => {
    if (!selected) return;
    setResources(prev => prev.filter(r => r.id !== selected.id));
    showToast(`Resource "${selected.resource_code}" deleted`);
    setShowDelete(false); setSelected(null);
  };

  const columns: Column<Resource>[] = [
    { key: 'resource_code', label: 'Code', sortable: true, width: '120px' },
    { key: 'description', label: 'Description', sortable: true },
    { key: 'eoc', label: 'EOC', sortable: true, width: '120px' },
    { key: 'cost', label: 'Cost', sortable: true, width: '100px', render: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
    { key: 'units', label: 'Units', width: '80px' },
    { key: 'supplier_name', label: 'Supplier', render: (v) => v || '—' },
    { key: 'is_active', label: 'Status', width: '90px', render: (v) => <StatusBadge active={v} /> },
  ];

  const eocs = [...new Set(resources.map(r => r.eoc).filter(Boolean))];
  const filtered = resources.filter(r => {
    if (search && !r.resource_code.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (eocFilter && r.eoc !== eocFilter) return false;
    return true;
  });

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' };

  return (
    <div style={{ maxWidth: '1400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Resource Library</h1>
          <p style={{ fontSize: '15px', color: '#64748b' }}>Manage resources, costs, and Element of Cost classifications</p>
        </div>
        <button onClick={handleCreate} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>+ Add Resource</button>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search resources..." />
        <select style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }} value={eocFilter} onChange={e => setEocFilter(e.target.value)}>
          <option value="">All EOC</option>
          {eocs.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <DataGrid columns={columns} data={filtered} total={filtered.length} page={page} pageSize={20} onPageChange={setPage} loading={loading}
          actions={(row: Resource) => (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleEdit(row)} style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px' }}>Edit</button>
              <button onClick={() => { setSelected(row); setShowDelete(true); }} style={{ padding: '4px 12px', border: '1px solid #fee2e2', borderRadius: '6px', backgroundColor: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
            </div>
          )} />
      </div>

      <FormDialog open={showForm} title={selected ? 'Edit Resource' : 'Add Resource'} onClose={() => setShowForm(false)} onSubmit={handleSubmit} loading={saving}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div><label style={labelStyle}>Resource Code</label><input style={inputStyle} value={form.resource_code} onChange={e => setForm({ ...form, resource_code: e.target.value })} /></div>
          <div><label style={labelStyle}>EOC</label><select style={{ ...inputStyle, cursor: 'pointer' }} value={form.eoc} onChange={e => setForm({ ...form, eoc: e.target.value })}><option value="">Select...</option><option>Labor</option><option>Materials</option><option>Subcontract</option><option>Travel</option><option>Other Direct Costs</option><option>Overhead</option></select></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Description</label><input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          <div><label style={labelStyle}>Cost ($)</label><input style={inputStyle} type="number" value={form.cost} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} /></div>
          <div><label style={labelStyle}>Units</label><input style={inputStyle} value={form.units} onChange={e => setForm({ ...form, units: e.target.value })} /></div>
          <div><label style={labelStyle}>Supplier</label><input style={inputStyle} value={form.supplier_name} onChange={e => setForm({ ...form, supplier_name: e.target.value })} /></div>
          <div><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={showDelete} title="Delete Resource" message={`Delete resource "${selected?.resource_code}"? This cannot be undone.`} onClose={() => setShowDelete(false)} onConfirm={confirmDelete} confirmLabel="Delete" danger />

      {toast && <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 500, zIndex: 2000, backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.message}</div>}
    </div>
  );
}
