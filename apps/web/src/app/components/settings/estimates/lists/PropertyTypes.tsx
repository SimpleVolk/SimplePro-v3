'use client';

import { useState } from 'react';
import styles from './PropertyTypes.module.css';

interface PropertyType {
  id: string;
  name: string;
  description: string;
  defaultAccessDifficulty: 'easy' | 'moderate' | 'difficult' | 'very_difficult';
  squareFootageRange: {
    min: number;
    max: number;
  };
  typicalRoomCount: {
    min: number;
    max: number;
  };
  category: 'residential' | 'commercial' | 'storage';
  isActive: boolean;
}

export default function PropertyTypes() {
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([
    {
      id: '1',
      name: 'Single Family House',
      description: 'Standalone residential home',
      defaultAccessDifficulty: 'easy',
      squareFootageRange: { min: 1000, max: 5000 },
      typicalRoomCount: { min: 2, max: 6 },
      category: 'residential',
      isActive: true
    },
    {
      id: '2',
      name: 'Apartment',
      description: 'Multi-unit residential building',
      defaultAccessDifficulty: 'moderate',
      squareFootageRange: { min: 500, max: 2000 },
      typicalRoomCount: { min: 1, max: 4 },
      category: 'residential',
      isActive: true
    },
    {
      id: '3',
      name: 'Condo',
      description: 'Condominium unit',
      defaultAccessDifficulty: 'moderate',
      squareFootageRange: { min: 600, max: 2500 },
      typicalRoomCount: { min: 1, max: 4 },
      category: 'residential',
      isActive: true
    },
    {
      id: '4',
      name: 'Townhouse',
      description: 'Multi-story attached home',
      defaultAccessDifficulty: 'moderate',
      squareFootageRange: { min: 1200, max: 3000 },
      typicalRoomCount: { min: 2, max: 5 },
      category: 'residential',
      isActive: true
    },
    {
      id: '5',
      name: 'Office',
      description: 'Commercial office space',
      defaultAccessDifficulty: 'easy',
      squareFootageRange: { min: 500, max: 10000 },
      typicalRoomCount: { min: 1, max: 20 },
      category: 'commercial',
      isActive: true
    },
    {
      id: '6',
      name: 'Warehouse',
      description: 'Large commercial storage facility',
      defaultAccessDifficulty: 'easy',
      squareFootageRange: { min: 5000, max: 50000 },
      typicalRoomCount: { min: 1, max: 10 },
      category: 'commercial',
      isActive: true
    },
    {
      id: '7',
      name: 'Storage Unit',
      description: 'Self-storage facility',
      defaultAccessDifficulty: 'easy',
      squareFootageRange: { min: 50, max: 500 },
      typicalRoomCount: { min: 1, max: 1 },
      category: 'storage',
      isActive: true
    }
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingType, setEditingType] = useState<PropertyType | null>(null);
  const [formData, setFormData] = useState<Partial<PropertyType>>({});

  const categories = [
    { value: 'residential', label: 'Residential', icon: '🏠' },
    { value: 'commercial', label: 'Commercial', icon: '🏢' },
    { value: 'storage', label: 'Storage', icon: '🏪' }
  ];

  const accessDifficultyOptions = [
    { value: 'easy', label: 'Easy', color: '#10B981' },
    { value: 'moderate', label: 'Moderate', color: '#F59E0B' },
    { value: 'difficult', label: 'Difficult', color: '#EF4444' },
    { value: 'very_difficult', label: 'Very Difficult', color: '#991B1B' }
  ];

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      defaultAccessDifficulty: 'easy',
      squareFootageRange: { min: 0, max: 0 },
      typicalRoomCount: { min: 0, max: 0 },
      category: 'residential',
      isActive: true
    });
    setEditingType(null);
    setShowCreateForm(true);
  };

  const handleEdit = (type: PropertyType) => {
    setFormData(type);
    setEditingType(type);
    setShowCreateForm(true);
  };

  const handleSave = () => {
    if (editingType) {
      setPropertyTypes(prev => prev.map(t => t.id === editingType.id ? { ...formData as PropertyType, id: editingType.id } : t));
    } else {
      const newType: PropertyType = {
        ...formData as PropertyType,
        id: Date.now().toString()
      };
      setPropertyTypes(prev => [...prev, newType]);
    }
    setShowCreateForm(false);
    setEditingType(null);
    setFormData({});
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingType(null);
    setFormData({});
  };

  const updateFormData = (path: string[], value: any) => {
    setFormData(prev => {
      const updated = { ...prev } as any;
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  if (showCreateForm) {
    return (
      <div className={styles.propertyTypes}>
        <div className={styles.header}>
          <h3>{editingType ? 'Edit Property Type' : 'Create Property Type'}</h3>
        </div>

        <div className={styles.formContainer}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Property Type Name *</label>
              <input
                type="text"
                value={formData.name || ''}
                onChange={(e) => updateFormData(['name'], e.target.value)}
                className={styles.input}
                placeholder="e.g., Single Family House"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Category *</label>
              <select
                value={formData.category || 'residential'}
                onChange={(e) => updateFormData(['category'], e.target.value)}
                className={styles.select}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Description</label>
              <input
                type="text"
                value={formData.description || ''}
                onChange={(e) => updateFormData(['description'], e.target.value)}
                className={styles.input}
                placeholder="Brief description"
              />
            </div>

            <div className={styles.formGroup}>
              <label>Default Access Difficulty</label>
              <select
                value={formData.defaultAccessDifficulty || 'easy'}
                onChange={(e) => updateFormData(['defaultAccessDifficulty'], e.target.value)}
                className={styles.select}
              >
                {accessDifficultyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Square Footage Range</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  value={formData.squareFootageRange?.min || 0}
                  onChange={(e) => updateFormData(['squareFootageRange', 'min'], parseInt(e.target.value))}
                  className={styles.input}
                  placeholder="Min"
                  min="0"
                />
                <span>to</span>
                <input
                  type="number"
                  value={formData.squareFootageRange?.max || 0}
                  onChange={(e) => updateFormData(['squareFootageRange', 'max'], parseInt(e.target.value))}
                  className={styles.input}
                  placeholder="Max"
                  min="0"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Typical Room Count Range</label>
              <div className={styles.rangeInputs}>
                <input
                  type="number"
                  value={formData.typicalRoomCount?.min || 0}
                  onChange={(e) => updateFormData(['typicalRoomCount', 'min'], parseInt(e.target.value))}
                  className={styles.input}
                  placeholder="Min"
                  min="0"
                />
                <span>to</span>
                <input
                  type="number"
                  value={formData.typicalRoomCount?.max || 0}
                  onChange={(e) => updateFormData(['typicalRoomCount', 'max'], parseInt(e.target.value))}
                  className={styles.input}
                  placeholder="Max"
                  min="0"
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isActive !== false}
                  onChange={(e) => updateFormData(['isActive'], e.target.checked)}
                />
                Active
              </label>
            </div>
          </div>

          <div className={styles.formActions}>
            <button onClick={handleCancel} className={styles.cancelButton}>Cancel</button>
            <button onClick={handleSave} className={styles.saveButton}>
              {editingType ? 'Update' : 'Create'} Property Type
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.propertyTypes}>
      <div className={styles.header}>
        <div>
          <h3>Property Types</h3>
          <p>Manage property type classifications</p>
        </div>
        <button onClick={handleCreate} className={styles.createButton}>
          + Add Property Type
        </button>
      </div>

      <div className={styles.categoriesGrid}>
        {categories.map(category => {
          const categoryTypes = propertyTypes.filter(type => type.category === category.value);
          return (
            <div key={category.value} className={styles.categorySection}>
              <div className={styles.categoryHeader}>
                <span className={styles.categoryIcon}>{category.icon}</span>
                <h4>{category.label}</h4>
                <span className={styles.typeCount}>{categoryTypes.length} types</span>
              </div>

              <div className={styles.typesList}>
                {categoryTypes.map(type => {
                  const difficultyOption = accessDifficultyOptions.find(opt => opt.value === type.defaultAccessDifficulty);
                  return (
                    <div key={type.id} className={styles.typeCard}>
                      <div className={styles.typeInfo}>
                        <h5>{type.name}</h5>
                        <p>{type.description}</p>
                        <div className={styles.typeDetails}>
                          <span className={styles.badge}>
                            {type.squareFootageRange.min}-{type.squareFootageRange.max} sq ft
                          </span>
                          <span className={styles.badge}>
                            {type.typicalRoomCount.min}-{type.typicalRoomCount.max} rooms
                          </span>
                          <span className={styles.badge} style={{ backgroundColor: difficultyOption?.color + '20', color: difficultyOption?.color }}>
                            {difficultyOption?.label}
                          </span>
                          <span className={`${styles.status} ${type.isActive ? styles.active : styles.inactive}`}>
                            {type.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className={styles.typeActions}>
                        <button onClick={() => handleEdit(type)} className={styles.actionButton}>✏️</button>
                        <button
                          onClick={() => setPropertyTypes(prev => prev.map(t => t.id === type.id ? { ...t, isActive: !t.isActive } : t))}
                          className={styles.actionButton}
                        >
                          {type.isActive ? '🚫' : '✅'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
