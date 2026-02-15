/**
 * ConfigTables Component
 *
 * Admin page for managing configuration/lookup tables.
 * Connected to real backend API endpoints.
 */

import React, { useState, useEffect, useCallback } from 'react';
import DataGrid, { Column, StatusBadge } from '../../components/admin/DataGrid';
import FormDialog from '../../components/admin/FormDialog';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import {
  getConfigItems, createConfigItem, updateConfigItem, deleteConfigItem,
  ConfigItem, WeightedConfigItem, ConfigTableName, CONFIG_TABLE_INFO,
  ConfigItemCreate, WeightedConfigItemCreate, ConfigItemUpdate, WeightedConfigItemUpdate,
} from '../../api/admin';

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: '1400px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' },
  title: { fontSize: '28px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' },
  subtitle: { fontSize: '15px', color: '#64748b' },
  primaryButton: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' },
  toolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' },
  tableSelector: { display: 'flex', gap: '12px', alignItems: 'center' },
  tableSelect: { padding: '10px 16px', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '14px', fontWeight: 500, color: '#0f172a', backgroundColor: '#fff', cursor: 'pointer', minWidth: '220px' },
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
  tableInfo: { padding: '16px 20px', backgroundColor: '#fef3c7', borderBottom: '1px solid #fcd34d', display: 'flex', alignItems: 'center', gap: '12px' },
  tableInfoIcon: { color: '#d97706' },
  tableInfoText: { fontSize: '14px', color: '#92400e' },
  weightBadge: { padding: '4px 10px', backgroundColor: '#dbeafe', color: '#1e40af', borderRadius: '12px', fontSize: '13px', fontWeight: 500 },
};

// Build CONFIG_TABLES from the shared CONFIG_TABLE_INFO
const CONFIG_TABLES: { name: ConfigTableName; label: string; weighted: boolean }[] =
  (Object.keys(CONFIG_TABLE_INFO) as ConfigTableName[]).map(name => ({
    name,
    label: CONFIG_TABLE_INFO[name].description,
    weighted: CONFIG_TABLE_INFO[name].weighted,
  }));

interface FormData { code: string; description: string; weight: string; is_active: boolean; }
const initialFormData: FormData = { code: '', description: '', weight: '0', is_active: true };

function ConfigTables() {
  const [selectedTable, setSelectedTable] = useState<ConfigTableName>('cost-types');
  const [items, setItems] = useState<(ConfigItem | WeightedConfigItem)[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ConfigItem | WeightedConfigItem | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const isWeighted = CONFIG_TABLES.find(t => t.name === selectedTable)?.weighted || false;
  const tableLabel = CONFIG_TABLES.find(t => t.name === selectedTable)?.label || selectedTable;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getConfigItems(selectedTable);
      setItems(response.items);
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to load items', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedTable]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const showToast = (message: string, type: 'success' | 'error') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); };
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.code) errors.code = 'Required';
    if (!formData.description) errors.description = 'Required';
    if (isWeighted && (!formData.weight || isNaN(parseFloat(formData.weight)))) errors.weight = 'Valid weight required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload: ConfigItemCreate | WeightedConfigItemCreate = isWeighted
        ? { code: formData.code, description: formData.description, is_active: formData.is_active, weight: parseFloat(formData.weight) || 0 }
        : { code: formData.code, description: formData.description, is_active: formData.is_active };
      await createConfigItem(selectedTable, payload);
      showToast('Item created successfully', 'success');
      setShowCreateDialog(false);
      setFormData(initialFormData);
      loadItems();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to create item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: ConfigItem | WeightedConfigItem) => {
    setSelectedItem(item);
    setFormData({
      code: item.code,
      description: item.description,
      weight: 'weight' in item ? item.weight.toString() : '0',
      is_active: item.is_active,
    });
    setFormErrors({});
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!validateForm() || !selectedItem) return;
    setSaving(true);
    try {
      const payload: ConfigItemUpdate | WeightedConfigItemUpdate = isWeighted
        ? { code: formData.code, description: formData.description, is_active: formData.is_active, weight: parseFloat(formData.weight) || 0 }
        : { code: formData.code, description: formData.description, is_active: formData.is_active };
      await updateConfigItem(selectedTable, selectedItem.id, payload);
      showToast('Item updated successfully', 'success');
      setShowEditDialog(false);
      setSelectedItem(null);
      loadItems();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to update item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item: ConfigItem | WeightedConfigItem) => { setSelectedItem(item); setShowDeleteDialog(true); };
  const confirmDelete = async () => {
    if (!selectedItem) return;
    setSaving(true);
    try {
      await deleteConfigItem(selectedTable, selectedItem.id);
      showToast('Item deleted successfully', 'success');
      setShowDeleteDialog(false);
      setSelectedItem(null);
      loadItems();
    } catch (error: any) {
      showToast(error.response?.data?.detail || 'Failed to delete item', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => { setFormData(p => ({ ...p, [field]: value })); if (formErrors[field]) setFormErrors(p => ({ ...p, [field]: '' })); };

  const columns: Column<ConfigItem | WeightedConfigItem>[] = [
    { key: 'code', header: 'Code', sortable: true, width: '150px', render: item => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{item.code}</span> },
    { key: 'description', header: 'Description', sortable: true },
    ...(isWeighted ? [{ key: 'weight' as const, header: 'Weight', sortable: true, width: '100px', render: (item: WeightedConfigItem) => <span style={styles.weightBadge}>{item.weight}</span> }] : []),
    { key: 'is_active', header: 'Status', sortable: true, width: '100px', render: item => <StatusBadge isActive={item.is_active} /> },
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div><h1 style={styles.title}>Configuration Tables</h1><p style={styles.subtitle}>Manage system lookup values</p></div>
        <button style={styles.primaryButton} onClick={() => { setFormData(initialFormData); setFormErrors({}); setShowCreateDialog(true); }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Item
        </button>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.tableSelector}>
          <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Table:</label>
          <select style={styles.tableSelect} value={selectedTable} onChange={e => setSelectedTable(e.target.value as ConfigTableName)}>
            {CONFIG_TABLES.map(t => <option key={t.name} value={t.name}>{t.label}{t.weighted ? ' (Weighted)' : ''}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.tableCard}>
        {isWeighted && (
          <div style={styles.tableInfo}>
            <span style={styles.tableInfoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </span>
            <span style={styles.tableInfoText}>This is a weighted table. Each item has a weight value used in calculations.</span>
          </div>
        )}
        <DataGrid data={items} columns={columns as Column<ConfigItem>[]} keyField="id" loading={loading} emptyMessage="No items found"
          onEdit={handleEdit} onDelete={handleDelete} />
      </div>

      <FormDialog open={showCreateDialog} title={`Add ${tableLabel} Item`} onClose={() => setShowCreateDialog(false)} onSubmit={handleCreate} loading={saving} submitLabel="Create">
        <div style={styles.formGrid}>
          <div style={styles.formGroup}><label style={styles.label}>Code *</label><input style={styles.input} value={formData.code} onChange={e => handleInputChange('code', e.target.value.toUpperCase())} placeholder="CODE" />{formErrors.code && <span style={styles.error}>{formErrors.code}</span>}</div>
          {isWeighted && <div style={styles.formGroup}><label style={styles.label}>Weight *</label><input style={styles.input} type="number" step="0.01" min="0" max="1" value={formData.weight} onChange={e => handleInputChange('weight', e.target.value)} placeholder="0.50" />{formErrors.weight && <span style={styles.error}>{formErrors.weight}</span>}</div>}
          <div style={{...styles.formGroup, ...(!isWeighted ? styles.formGroupFull : {})}}><label style={styles.label}>Description *</label><input style={styles.input} value={formData.description} onChange={e => handleInputChange('description', e.target.value)} placeholder="Description" />{formErrors.description && <span style={styles.error}>{formErrors.description}</span>}</div>
        </div>
      </FormDialog>

      <FormDialog open={showEditDialog} title={`Edit ${tableLabel} Item`} onClose={() => setShowEditDialog(false)} onSubmit={handleUpdate} loading={saving} submitLabel="Save">
        <div style={styles.formGrid}>
          <div style={styles.formGroup}><label style={styles.label}>Code *</label><input style={styles.input} value={formData.code} onChange={e => handleInputChange('code', e.target.value.toUpperCase())} />{formErrors.code && <span style={styles.error}>{formErrors.code}</span>}</div>
          {isWeighted && <div style={styles.formGroup}><label style={styles.label}>Weight *</label><input style={styles.input} type="number" step="0.01" min="0" max="1" value={formData.weight} onChange={e => handleInputChange('weight', e.target.value)} />{formErrors.weight && <span style={styles.error}>{formErrors.weight}</span>}</div>}
          <div style={{...styles.formGroup, ...(!isWeighted ? styles.formGroupFull : {})}}><label style={styles.label}>Description *</label><input style={styles.input} value={formData.description} onChange={e => handleInputChange('description', e.target.value)} />{formErrors.description && <span style={styles.error}>{formErrors.description}</span>}</div>
          <div style={styles.formGroup}><label style={styles.label}>Status</label><select style={styles.select} value={formData.is_active ? 'active' : 'inactive'} onChange={e => handleInputChange('is_active', e.target.value === 'active')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
        </div>
      </FormDialog>

      <ConfirmDialog open={showDeleteDialog} title="Delete Item" message={`Delete "${selectedItem?.code}"?`} onClose={() => setShowDeleteDialog(false)} onConfirm={confirmDelete} loading={saving} confirmLabel="Delete" danger />

      {toast && <div style={{...styles.toast, ...(toast.type === 'success' ? styles.toastSuccess : styles.toastError)}}>{toast.message}</div>}
    </div>
  );
}

export default ConfigTables;
