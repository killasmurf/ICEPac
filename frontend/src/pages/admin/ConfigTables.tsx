/**
 * ConfigTables - Dynamic configuration table management.
 * Supports 10 config tables including weighted tables (probability, severity, PMB).
 */
import React, { useState } from 'react';
import DataGrid, { Column, StatusBadge } from '../../components/admin/DataGrid';
import FormDialog from '../../components/admin/FormDialog';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { ConfigItem, ConfigTableInfo } from '../../api/admin';

const TABLE_INFO: ConfigTableInfo[] = [
  { name: 'cost_types', label: 'Cost Types', description: 'Element of Cost classifications', weighted: false },
  { name: 'expense_types', label: 'Expense Types', description: 'Expense type categories', weighted: false },
  { name: 'regions', label: 'Regions', description: 'Geographic regions', weighted: false },
  { name: 'business_areas', label: 'Business Areas', description: 'Business area classifications', weighted: false },
  { name: 'estimating_techniques', label: 'Estimating Techniques', description: 'Available estimation methods', weighted: false },
  { name: 'risk_categories', label: 'Risk Categories', description: 'Risk classification categories', weighted: false },
  { name: 'expenditure_indicators', label: 'Expenditure Indicators', description: 'Expenditure indicator types', weighted: false },
  { name: 'probability_levels', label: 'Probability Levels', description: 'Probability with weights', weighted: true },
  { name: 'severity_levels', label: 'Severity Levels', description: 'Severity with weights', weighted: true },
  { name: 'pmb_weights', label: 'PMB Weights', description: 'PMB weight configuration', weighted: true },
];

const MOCK_DATA: Record<string, ConfigItem[]> = {
  cost_types: [
    { id: 1, name: 'Labor', code: 'LBR', description: 'Direct labor costs', is_active: true, sort_order: 1, created_at: '2026-01-01', updated_at: '2026-01-01' },
    { id: 2, name: 'Materials', code: 'MAT', description: 'Materials and supplies', is_active: true, sort_order: 2, created_at: '2026-01-01', updated_at: '2026-01-01' },
    { id: 3, name: 'Subcontract', code: 'SUB', description: 'Subcontractor costs', is_active: true, sort_order: 3, created_at: '2026-01-01', updated_at: '2026-01-01' },
  ],
  probability_levels: [
    { id: 1, name: 'Very Low', description: '<10%', weight: 0.05, level: 1, is_active: true, sort_order: 1, created_at: '2026-01-01', updated_at: '2026-01-01' },
    { id: 2, name: 'Low', description: '10-25%', weight: 0.175, level: 2, is_active: true, sort_order: 2, created_at: '2026-01-01', updated_at: '2026-01-01' },
    { id: 3, name: 'Medium', description: '25-50%', weight: 0.375, level: 3, is_active: true, sort_order: 3, created_at: '2026-01-01', updated_at: '2026-01-01' },
  ],
};

const EMPTY_FORM = { name: '', code: '', description: '', sort_order: 0, weight: 0, level: 1, category: '' };

export default function ConfigTables() {
  const [activeTable, setActiveTable] = useState(TABLE_INFO[0]);
  const [items, setItems] = useState<ConfigItem[]>(MOCK_DATA[TABLE_INFO[0].name] || []);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState<ConfigItem | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };

  const switchTable = (info: ConfigTableInfo) => {
    setActiveTable(info);
    setItems(MOCK_DATA[info.name] || []);
  };

  const handleCreate = () => { setSelected(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const handleEdit = (item: ConfigItem) => { setSelected(item); setForm({ name: item.name, code: item.code || '', description: item.description || '', sort_order: item.sort_order, weight: item.weight || 0, level: item.level || 1, category: item.category || '' }); setShowForm(true); };

  const handleSubmit = () => {
    setSaving(true);
    if (selected) {
      setItems(prev => prev.map(i => i.id === selected.id ? { ...i, ...form } : i));
      showToast(`Item "${form.name}" updated`);
    } else {
      setItems(prev => [...prev, { ...form, id: (prev.length ? Math.max(...prev.map(i => i.id)) : 0) + 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
      showToast(`Item "${form.name}" created`);
    }
    setShowForm(false); setSaving(false);
  };

  const confirmDelete = () => {
    if (!selected) return;
    setItems(prev => prev.filter(i => i.id !== selected.id));
    showToast(`Item "${selected.name}" deleted`);
    setShowDelete(false); setSelected(null);
  };

  const baseColumns: Column<ConfigItem>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'code', label: 'Code', width: '80px', render: v => v || '—' },
    { key: 'description', label: 'Description', render: v => v || '—' },
    { key: 'sort_order', label: 'Order', width: '70px' },
    { key: 'is_active', label: 'Status', width: '90px', render: v => <StatusBadge active={v} /> },
  ];

  const weightedColumns: Column<ConfigItem>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'description', label: 'Description', render: v => v || '—' },
    { key: 'weight', label: 'Weight', width: '80px', render: v => v?.toFixed(3) || '0' },
    { key: 'level', label: 'Level', width: '70px', render: v => v || '—' },
    { key: 'sort_order', label: 'Order', width: '70px' },
    { key: 'is_active', label: 'Status', width: '90px', render: v => <StatusBadge active={v} /> },
  ];

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' };

  return (
    <div style={{ maxWidth: '1400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Configuration Tables</h1>
          <p style={{ fontSize: '15px', color: '#64748b' }}>Manage lookup tables and system configuration</p>
        </div>
        <button onClick={handleCreate} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>+ Add Item</button>
      </div>

      {/* Table selector */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
        {TABLE_INFO.map(t => (
          <button key={t.name} onClick={() => switchTable(t)} style={{
            padding: '8px 16px', border: '1px solid', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            backgroundColor: activeTable.name === t.name ? '#0f172a' : '#fff',
            color: activeTable.name === t.name ? '#fff' : '#475569',
            borderColor: activeTable.name === t.name ? '#0f172a' : '#e2e8f0',
          }}>
            {t.label} {t.weighted && '⚖️'}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', color: '#166534' }}>
        <strong>{activeTable.label}</strong> — {activeTable.description}
        {activeTable.weighted && <span style={{ marginLeft: '8px', opacity: 0.7 }}>(weighted table)</span>}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <DataGrid columns={activeTable.weighted ? weightedColumns : baseColumns} data={items} total={items.length}
          actions={(row: ConfigItem) => (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleEdit(row)} style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px' }}>Edit</button>
              <button onClick={() => { setSelected(row); setShowDelete(true); }} style={{ padding: '4px 12px', border: '1px solid #fee2e2', borderRadius: '6px', backgroundColor: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
            </div>
          )} />
      </div>

      <FormDialog open={showForm} title={selected ? `Edit ${activeTable.label} Item` : `Add ${activeTable.label} Item`} onClose={() => setShowForm(false)} onSubmit={handleSubmit} loading={saving}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div><label style={labelStyle}>Name</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          {!activeTable.weighted && <div><label style={labelStyle}>Code</label><input style={inputStyle} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} /></div>}
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Description</label><input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
          {activeTable.weighted && <div><label style={labelStyle}>Weight (0-1)</label><input style={inputStyle} type="number" step="0.001" min="0" max="1" value={form.weight} onChange={e => setForm({ ...form, weight: parseFloat(e.target.value) || 0 })} /></div>}
          {activeTable.weighted && <div><label style={labelStyle}>Level</label><input style={inputStyle} type="number" min="1" value={form.level} onChange={e => setForm({ ...form, level: parseInt(e.target.value) || 1 })} /></div>}
          <div><label style={labelStyle}>Sort Order</label><input style={inputStyle} type="number" min="0" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={showDelete} title="Delete Item" message={`Delete "${selected?.name}" from ${activeTable.label}?`} onClose={() => setShowDelete(false)} onConfirm={confirmDelete} confirmLabel="Delete" danger />
      {toast && <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 500, zIndex: 2000, backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.message}</div>}
    </div>
  );
}
