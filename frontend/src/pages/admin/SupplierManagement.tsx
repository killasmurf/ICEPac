/**
 * SupplierManagement - Admin page for managing suppliers.
 */
import React, { useState } from 'react';
import DataGrid, { Column, StatusBadge } from '../../components/admin/DataGrid';
import FormDialog from '../../components/admin/FormDialog';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import SearchBar from '../../components/admin/SearchBar';
import { Supplier } from '../../api/admin';

const MOCK_SUPPLIERS: Supplier[] = [
  { id: 1, name: 'Acme Corp', contact_name: 'John Doe', email: 'john@acme.com', phone: '555-0100', address: '123 Main St', website: 'https://acme.com', is_active: true, created_at: '2026-01-01', updated_at: '2026-01-15' },
  { id: 2, name: 'Dell Inc', contact_name: 'Jane Wilson', email: 'jane@dell.com', phone: '555-0200', is_active: true, created_at: '2026-01-03', updated_at: '2026-01-12' },
  { id: 3, name: 'QA Partners', contact_name: 'Bob Lee', email: 'bob@qapartners.com', phone: '555-0300', is_active: true, created_at: '2026-01-05', updated_at: '2026-01-10' },
  { id: 4, name: 'Old Vendor', contact_name: 'Ex Contact', email: 'ex@old.com', is_active: false, created_at: '2025-06-01', updated_at: '2025-12-01' },
];

const EMPTY_FORM = { name: '', contact_name: '', email: '', phone: '', address: '', website: '', notes: '' };

export default function SupplierManagement() {
  const [suppliers, setSuppliers] = useState<Supplier[]>(MOCK_SUPPLIERS);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3000); };
  const handleCreate = () => { setSelected(null); setForm({ ...EMPTY_FORM }); setShowForm(true); };
  const handleEdit = (s: Supplier) => { setSelected(s); setForm({ name: s.name, contact_name: s.contact_name || '', email: s.email || '', phone: s.phone || '', address: s.address || '', website: s.website || '', notes: s.notes || '' }); setShowForm(true); };

  const handleSubmit = () => {
    setSaving(true);
    if (selected) {
      setSuppliers(prev => prev.map(s => s.id === selected.id ? { ...s, ...form, updated_at: new Date().toISOString() } : s));
      showToast(`Supplier "${form.name}" updated`);
    } else {
      setSuppliers(prev => [...prev, { ...form, id: Math.max(...prev.map(s => s.id)) + 1, is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
      showToast(`Supplier "${form.name}" created`);
    }
    setShowForm(false); setSaving(false);
  };

  const confirmDelete = () => {
    if (!selected) return;
    setSuppliers(prev => prev.filter(s => s.id !== selected.id));
    showToast(`Supplier "${selected.name}" deleted`);
    setShowDelete(false); setSelected(null);
  };

  const columns: Column<Supplier>[] = [
    { key: 'name', label: 'Company Name', sortable: true },
    { key: 'contact_name', label: 'Contact', sortable: true, render: v => v || '—' },
    { key: 'email', label: 'Email', render: v => v || '—' },
    { key: 'phone', label: 'Phone', render: v => v || '—' },
    { key: 'is_active', label: 'Status', width: '90px', render: v => <StatusBadge active={v} /> },
  ];

  const filtered = suppliers.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return s.name.toLowerCase().includes(q) || (s.contact_name || '').toLowerCase().includes(q) || (s.email || '').toLowerCase().includes(q);
  });

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' };

  return (
    <div style={{ maxWidth: '1400px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>Supplier Management</h1>
          <p style={{ fontSize: '15px', color: '#64748b' }}>Manage supplier contacts and company information</p>
        </div>
        <button onClick={handleCreate} style={{ padding: '10px 20px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>+ Add Supplier</button>
      </div>

      <div style={{ marginBottom: '20px' }}><SearchBar value={search} onChange={setSearch} placeholder="Search suppliers..." /></div>

      <div style={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <DataGrid columns={columns} data={filtered} total={filtered.length} page={page} pageSize={20} onPageChange={setPage} loading={loading}
          actions={(row: Supplier) => (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => handleEdit(row)} style={{ padding: '4px 12px', border: '1px solid #e2e8f0', borderRadius: '6px', backgroundColor: '#fff', cursor: 'pointer', fontSize: '13px' }}>Edit</button>
              <button onClick={() => { setSelected(row); setShowDelete(true); }} style={{ padding: '4px 12px', border: '1px solid #fee2e2', borderRadius: '6px', backgroundColor: '#fff', color: '#ef4444', cursor: 'pointer', fontSize: '13px' }}>Delete</button>
            </div>
          )} />
      </div>

      <FormDialog open={showForm} title={selected ? 'Edit Supplier' : 'Add Supplier'} onClose={() => setShowForm(false)} onSubmit={handleSubmit} loading={saving}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' }}>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Company Name</label><input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
          <div><label style={labelStyle}>Contact Name</label><input style={inputStyle} value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
          <div><label style={labelStyle}>Email</label><input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          <div><label style={labelStyle}>Phone</label><input style={inputStyle} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
          <div><label style={labelStyle}>Website</label><input style={inputStyle} value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Address</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Notes</label><textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={showDelete} title="Delete Supplier" message={`Delete supplier "${selected?.name}"? This cannot be undone.`} onClose={() => setShowDelete(false)} onConfirm={confirmDelete} confirmLabel="Delete" danger />
      {toast && <div style={{ position: 'fixed', bottom: '24px', right: '24px', padding: '12px 20px', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 500, zIndex: 2000, backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444' }}>{toast.message}</div>}
    </div>
  );
}
