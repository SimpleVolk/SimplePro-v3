'use client';

import { useState } from 'react';
import styles from './InventoryItems.module.css';

interface InventoryItem {
  id: string;
  name: string;
  category: 'furniture' | 'appliances' | 'electronics' | 'boxes' | 'fragile';
  defaultWeight: number;
  defaultVolume: number;
  requiresSpecialHandling: boolean;
  isFragile: boolean;
  isHighValue: boolean;
  packingMaterialsRequired: string[];
  isActive: boolean;
}

export default function InventoryItems() {
  const [items, setItems] = useState<InventoryItem[]>([
    { id: '1', name: 'Sofa', category: 'furniture', defaultWeight: 200, defaultVolume: 50, requiresSpecialHandling: true, isFragile: false, isHighValue: false, packingMaterialsRequired: ['Blankets', 'Shrink Wrap'], isActive: true },
    { id: '2', name: 'Refrigerator', category: 'appliances', defaultWeight: 250, defaultVolume: 40, requiresSpecialHandling: true, isFragile: false, isHighValue: true, packingMaterialsRequired: ['Appliance Dolly', 'Straps'], isActive: true },
    { id: '3', name: 'TV (65")', category: 'electronics', defaultWeight: 75, defaultVolume: 15, requiresSpecialHandling: true, isFragile: true, isHighValue: true, packingMaterialsRequired: ['TV Box', 'Bubble Wrap'], isActive: true },
    { id: '4', name: 'Dining Table', category: 'furniture', defaultWeight: 150, defaultVolume: 35, requiresSpecialHandling: false, isFragile: false, isHighValue: false, packingMaterialsRequired: ['Blankets'], isActive: true },
    { id: '5', name: 'Washing Machine', category: 'appliances', defaultWeight: 200, defaultVolume: 30, requiresSpecialHandling: true, isFragile: false, isHighValue: true, packingMaterialsRequired: ['Appliance Dolly'], isActive: true },
    { id: '6', name: 'Medium Box', category: 'boxes', defaultWeight: 40, defaultVolume: 3, requiresSpecialHandling: false, isFragile: false, isHighValue: false, packingMaterialsRequired: [], isActive: true },
    { id: '7', name: 'Crystal Chandelier', category: 'fragile', defaultWeight: 50, defaultVolume: 10, requiresSpecialHandling: true, isFragile: true, isHighValue: true, packingMaterialsRequired: ['Custom Crate', 'Bubble Wrap', 'Packing Paper'], isActive: true }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = [
    { value: 'furniture', label: 'Furniture', icon: '🪑' },
    { value: 'appliances', label: 'Appliances', icon: '🔌' },
    { value: 'electronics', label: 'Electronics', icon: '📺' },
    { value: 'boxes', label: 'Boxes', icon: '📦' },
    { value: 'fragile', label: 'Fragile Items', icon: '🔴' }
  ];

  const packingMaterialOptions = ['Blankets', 'Shrink Wrap', 'Bubble Wrap', 'Packing Paper', 'Custom Crate', 'Appliance Dolly', 'Straps', 'TV Box', 'Foam Padding'];

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreate = () => {
    setFormData({ name: '', category: 'furniture', defaultWeight: 0, defaultVolume: 0, requiresSpecialHandling: false, isFragile: false, isHighValue: false, packingMaterialsRequired: [], isActive: true });
    setEditingItem(null);
    setShowCreateForm(true);
  };

  const handleEdit = (item: InventoryItem) => {
    setFormData(item);
    setEditingItem(item);
    setShowCreateForm(true);
  };

  const handleSave = () => {
    if (editingItem) {
      setItems(prev => prev.map(i => i.id === editingItem.id ? { ...formData as InventoryItem, id: editingItem.id } : i));
    } else {
      setItems(prev => [...prev, { ...formData as InventoryItem, id: Date.now().toString() }]);
    }
    setShowCreateForm(false);
    setEditingItem(null);
    setFormData({});
  };

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const togglePackingMaterial = (material: string) => {
    setFormData(prev => {
      const current = prev.packingMaterialsRequired || [];
      const updated = current.includes(material) ? current.filter(m => m !== material) : [...current, material];
      return { ...prev, packingMaterialsRequired: updated };
    });
  };

  if (showCreateForm) {
    return (
      <div className={styles.inventoryItems}>
        <div className={styles.header}>
          <h3>{editingItem ? 'Edit Item' : 'Create Item'}</h3>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Item Name *</label>
              <input type="text" value={formData.name || ''} onChange={(e) => updateFormData('name', e.target.value)} className={styles.input} placeholder="e.g., Sofa" />
            </div>
            <div className={styles.formGroup}>
              <label>Category *</label>
              <select value={formData.category || 'furniture'} onChange={(e) => updateFormData('category', e.target.value)} className={styles.select}>
                {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Default Weight (lbs) *</label>
              <input type="number" value={formData.defaultWeight || 0} onChange={(e) => updateFormData('defaultWeight', parseFloat(e.target.value))} className={styles.input} min="0" step="0.1" />
            </div>
            <div className={styles.formGroup}>
              <label>Default Volume (cu ft) *</label>
              <input type="number" value={formData.defaultVolume || 0} onChange={(e) => updateFormData('defaultVolume', parseFloat(e.target.value))} className={styles.input} min="0" step="0.1" />
            </div>
          </div>

          <div className={styles.formSection}>
            <h5>Item Characteristics</h5>
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={formData.requiresSpecialHandling || false} onChange={(e) => updateFormData('requiresSpecialHandling', e.target.checked)} />
                Requires Special Handling
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={formData.isFragile || false} onChange={(e) => updateFormData('isFragile', e.target.checked)} />
                Fragile Item
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={formData.isHighValue || false} onChange={(e) => updateFormData('isHighValue', e.target.checked)} />
                High Value Item
              </label>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" checked={formData.isActive !== false} onChange={(e) => updateFormData('isActive', e.target.checked)} />
                Active
              </label>
            </div>
          </div>

          <div className={styles.formSection}>
            <h5>Packing Materials Required</h5>
            <div className={styles.materialChips}>
              {packingMaterialOptions.map(material => {
                const isSelected = (formData.packingMaterialsRequired || []).includes(material);
                return (
                  <button key={material} onClick={() => togglePackingMaterial(material)} className={`${styles.materialChip} ${isSelected ? styles.selected : ''}`}>
                    {material}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.formActions}>
            <button onClick={() => { setShowCreateForm(false); setEditingItem(null); setFormData({}); }} className={styles.cancelButton}>Cancel</button>
            <button onClick={handleSave} className={styles.saveButton}>{editingItem ? 'Update' : 'Create'} Item</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.inventoryItems}>
      <div className={styles.header}>
        <div>
          <h3>Inventory Items</h3>
          <p>Manage master inventory item catalog</p>
        </div>
        <button onClick={handleCreate} className={styles.createButton}>+ Add Item</button>
      </div>

      <div className={styles.filters}>
        <input type="text" placeholder="Search items..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={styles.searchInput} />
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className={styles.filterSelect}>
          <option value="all">All Categories</option>
          {categories.map(cat => <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>)}
        </select>
      </div>

      <div className={styles.itemsTable}>
        <div className={styles.tableHeader}>
          <div>Item Name</div>
          <div>Category</div>
          <div>Weight</div>
          <div>Volume</div>
          <div>Flags</div>
          <div>Status</div>
          <div>Actions</div>
        </div>
        {filteredItems.map(item => {
          const cat = categories.find(c => c.value === item.category);
          return (
            <div key={item.id} className={styles.tableRow}>
              <div className={styles.itemName}>{item.name}</div>
              <div><span className={styles.categoryBadge}>{cat?.icon} {cat?.label}</span></div>
              <div>{item.defaultWeight} lbs</div>
              <div>{item.defaultVolume} cu ft</div>
              <div className={styles.flags}>
                {item.requiresSpecialHandling && <span className={styles.flag}>⚙️ Special</span>}
                {item.isFragile && <span className={styles.flag}>🔴 Fragile</span>}
                {item.isHighValue && <span className={styles.flag}>💎 High Value</span>}
              </div>
              <div><span className={`${styles.status} ${item.isActive ? styles.active : styles.inactive}`}>{item.isActive ? 'Active' : 'Inactive'}</span></div>
              <div className={styles.actions}>
                <button onClick={() => handleEdit(item)} className={styles.actionButton}>✏️</button>
                <button onClick={() => setItems(prev => prev.map(i => i.id === item.id ? { ...i, isActive: !i.isActive } : i))} className={styles.actionButton}>
                  {item.isActive ? '🚫' : '✅'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className={styles.emptyState}>
          <p>No items found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
