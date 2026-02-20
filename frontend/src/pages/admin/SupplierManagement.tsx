/**
 * SupplierManagement Component
 *
 * Admin page for managing suppliers with full CRUD operations.
 * Connected to real backend API endpoints.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import DataGrid, { Column, StatusBadge } from '../../components/admin/DataGrid';
import FormDialog from '../../components/admin/FormDialog';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import SearchBar from '../../components/admin/SearchBar';
import {
  getSuppliers, createSupplier, updateSupplier, deleteSupplier,
  Supplier, SupplierCreate, SupplierUpdate,
} from '../../api/admin';

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1400px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  title: { fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' },
  subtitle: { fontSize: '15px', color: '#64748b' },
  primaryButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#8b5cf6', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' },
  filters: { display: 'flex', gap: '12px', alignItems: 'center' },
  filterSelect: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '14px', color: '#475569', backgroundColor: '#fff', cursor: 'pointer' },
  tableCard: { backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', overflow: 'hidden' },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '6px' },
  formGroupFull: { gridColumn: '1 / -1' },
  label: { fontSize: '14px', fontWeight: 500, color: '#374151' },
  input: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none' },
  textarea: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', outline: 'none', minHeight: '80px', resize: 'vertical' as const, fontFamily: 'inherit' },
  select: { padding: '10px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', backgroundColor: '#fff', cursor: 'pointer' },
  error: { color: '#dc2626', fontSize: '13px', marginTop: '4px' },
  toast: { position: 'fixed', bottom: '24px', right: '24px', padding: '16px 24px', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 500, zIndex: 1000, display: 'flex', alignItems: 'center', gap: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  toastSuccess: { backgroundColor: '#10b981' },
  toastError: { backgroundColor: '#ef4444' },
  contactInfo: { display: 'flex', flexDirection: 'column', gap: '4px' },
  contactName: { fontWeight: 500, color: '#0f172a' },
  contactDetail: { fontSize: '13px', color: '#64748b' },
};

interface FormData { supplier_code: string; name: string; contact: string; phone: string; email: string; notes: string; is_active: boolean; }
const initialFormData: FormData = { supplier_code: '', name: '', contact: '', phone: '', email: '', notes: '', is_active: true };

function SupplierManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    try {
      const activeOnly = statusFilter === 'active';
      const response = await getSuppliers(skip, 20, search || undefined, activeOnly);
      let filtered = response.items;
      if (statusFilter === 'inactive') {
        filtered = filtered.filter(s => !s.is_active);
      }
      setSuppliers(filtered);
      setTotal(response.total);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to load suppliers', 'error');
    } finally {
      setLoading(false);
    }
  }, [skip, search, statusFilter]);

  useEffect(() => { loadSuppliers(); }, [loadSuppliers]);
  useEffect(() => { if (searchParams.get('action') === 'new') { setShowCreateDialog(true); setSearchParams({}); } }, [searchParams, setSearchParams]);

  const showToast = (message: string, type: 'success' | 'error') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.supplier_code) errors.supplier_code = 'Required';
    if (!formData.name) errors.name = 'Required';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = 'Invalid email';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload: SupplierCreate = {
        supplier_code: formData.supplier_code,
        name: formData.name,
        contact: formData.contact || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        notes: formData.notes || undefined,
        is_active: formData.is_active,
      };
      await createSupplier(payload);
      showToast('Supplier created successfully', 'success');
      setShowCreateDialog(false);
      setFormData(initialFormData);
      loadSuppliers();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to create supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (s: Supplier) => {
    setSelectedSupplier(s);
    setFormData({ supplier_code: s.supplier_code, name: s.name, contact: s.contact || '', phone: s.phone || '', email: s.email || '', notes: s.notes || '', is_active: s.is_active });
    setFormErrors({});
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!validateForm() || !selectedSupplier) return;
    setSaving(true);
    try {
      const payload: SupplierUpdate = {
        supplier_code: formData.supplier_code,
        name: formData.name,
        contact: formData.contact || undefined,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        notes: formData.notes || undefined,
        is_active: formData.is_active,
      };
      await updateSupplier(selectedSupplier.id, payload);
      showToast('Supplier updated successfully', 'success');
      setShowEditDialog(false);
      setSelectedSupplier(null);
      loadSuppliers();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to update supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (s: Supplier) => { setSelectedSupplier(s); setShowDeleteDialog(true); };
  const confirmDelete = async () => {
    if (!selectedSupplier) return;
    setSaving(true);
    try {
      await deleteSupplier(selectedSupplier.id);
      showToast('Supplier deleted successfully', 'success');
      setShowDeleteDialog(false);
      setSelectedSupplier(null);
      loadSuppliers();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to delete supplier', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => { setFormData(p => ({ ...p, [field]: value })); if (formErrors[field]) setFormErrors(p => ({ ...p, [field]: '' })); };

  const columns: Column<Supplier>[] = [
    { key: 'supplier_code', header: 'Code', sortable: true, width: '120px', render: s => <span style={{ fontWeight: 600 }}>{s.supplier_code}</span> },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'contact', header: 'Contact', sortable: true, render: s => (
      <div style={styles.contactInfo}>
        <span style={styles.contactName}>{s.contact || '-'}</span>
        {s.email && <span style={styles.contactDetail}>{s.email}</span>}
      </div>
    )},
    { key: 'phone', header: 'Phone', sortable: true, width: '140px', render: s => <span style={{ color: '#64748b' }}>{s.phone || '-'}</span> },
    { key: 'is_active', header: 'Status', sortable: true, width: '100px', render: s => <StatusBadge isActive={s.is_active} /> },
  ];

  const FormFields = () => (
    <div style={styles.formGrid}>
      <div style={styles.formGroup}><label style={styles.label}>Supplier Code *</label><input style={styles.input} value={formData.supplier_code} onChange={e => handleInputChange('supplier_code', e.target.value.toUpperCase())} placeholder="ACME" />{formErrors.supplier_code && <span style={styles.error}>{formErrors.supplier_code}</span>}</div>
      <div style={styles.formGroup}><label style={styles.label}>Contact Name</label><input style={styles.input} value={formData.contact} onChange={e => handleInputChange('contact', e.target.value)} placeholder="John Smith" /></div>
      <div style={{...styles.formGroup, ...styles.formGroupFull}}><label style={styles.label}>Company Name *</label><input style={styles.input} value={formData.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="Acme Corporation" />{formErrors.name && <span style={styles.error}>{formErrors.name}</span>}</div>
      <div style={styles.formGroup}><label style={styles.label}>Phone</label><input style={styles.input} value={formData.phone} onChange={e => handleInputChange('phone', e.target.value)} placeholder="+1-555-0100" /></div>
      <div style={styles.formGroup}><label style={styles.label}>Email</label><input style={styles.input} type="email" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} placeholder="contact@acme.com" />{formErrors.email && <span style={styles.error}>{formErrors.email}</span>}</div>
      <div style={{...styles.formGroup, ...styles.formGroupFull}}><label style={styles.label}>Notes</label><textarea style={styles.textarea} value={formData.notes} onChange={e => handleInputChange('notes', e.target.value)} placeholder="Additional notes about this supplier..." /></div>
      {showEditDialog && <div style={styles.formGroup}><label style={styles.label}>Status</label><select style={styles.select} value={formData.is_active ? 'active' : 'inactive'} onChange={e => handleInputChange('is_active', e.target.value === 'active')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>}
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div><h1 style={styles.title}>Supplier Management</h1><p style={styles.subtitle}>Manage vendors and contractors</p></div>
        <button style={styles.primaryButton} onClick={() => { setFormData(initialFormData); setFormErrors({}); setShowCreateDialog(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Supplier
        </button>
      </div>

      <div style={styles.toolbar}>
        <SearchBar value={search} onChange={setSearch} placeholder="Search suppliers..." />
        <div style={styles.filters}>
          <select style={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div style={styles.tableCard}>
        <DataGrid data={suppliers} columns={columns} keyField="id" loading={loading} emptyMessage="No suppliers found"
          onEdit={handleEdit} onDelete={handleDelete} pagination={{ total, skip, limit: 20, onPageChange: setSkip }} />
      </div>

      <FormDialog open={showCreateDialog} title="Create Supplier" onClose={() => setShowCreateDialog(false)} onSubmit={handleCreate} loading={saving} submitLabel="Create">
        <FormFields />
      </FormDialog>

      <FormDialog open={showEditDialog} title="Edit Supplier" onClose={() => setShowEditDialog(false)} onSubmit={handleUpdate} loading={saving} submitLabel="Save">
        <FormFields />
      </FormDialog>

      <ConfirmDialog open={showDeleteDialog} title="Delete Supplier" message={`Delete "${selectedSupplier?.name}"?`} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} loading={saving} confirmLabel="Delete" danger />

      {toast && <div style={{...styles.toast, ...(toast.type === 'success' ? styles.toastSuccess : styles.toastError)}}>{toast.message}</div>}
    </div>
  );
}

export default SupplierManagement;
