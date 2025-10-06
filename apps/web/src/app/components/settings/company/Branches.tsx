'use client';

import { useState } from 'react';
import styles from './Branches.module.css';

interface Branch {
  id: string;
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  managerName: string;
  isPrimary: boolean;
  operatingHours: {
    monday: { open: string; close: string; enabled: boolean };
    tuesday: { open: string; close: string; enabled: boolean };
    wednesday: { open: string; close: string; enabled: boolean };
    thursday: { open: string; close: string; enabled: boolean };
    friday: { open: string; close: string; enabled: boolean };
    saturday: { open: string; close: string; enabled: boolean };
    sunday: { open: string; close: string; enabled: boolean };
  };
  serviceRadius: number; // in miles
  isActive: boolean;
}

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([
    {
      id: '1',
      name: 'Downtown Branch',
      address: {
        street: '123 Main Street',
        city: 'Dallas',
        state: 'TX',
        zipCode: '75201',
      },
      contact: {
        phone: '(555) 123-4567',
        email: 'downtown@movecorp.com',
      },
      managerName: 'John Smith',
      isPrimary: true,
      operatingHours: {
        monday: { open: '08:00', close: '18:00', enabled: true },
        tuesday: { open: '08:00', close: '18:00', enabled: true },
        wednesday: { open: '08:00', close: '18:00', enabled: true },
        thursday: { open: '08:00', close: '18:00', enabled: true },
        friday: { open: '08:00', close: '18:00', enabled: true },
        saturday: { open: '09:00', close: '15:00', enabled: true },
        sunday: { open: '10:00', close: '14:00', enabled: false },
      },
      serviceRadius: 50,
      isActive: true,
    },
    {
      id: '2',
      name: 'North Branch',
      address: {
        street: '456 Oak Avenue',
        city: 'Plano',
        state: 'TX',
        zipCode: '75024',
      },
      contact: {
        phone: '(555) 234-5678',
        email: 'north@movecorp.com',
      },
      managerName: 'Sarah Johnson',
      isPrimary: false,
      operatingHours: {
        monday: { open: '08:00', close: '18:00', enabled: true },
        tuesday: { open: '08:00', close: '18:00', enabled: true },
        wednesday: { open: '08:00', close: '18:00', enabled: true },
        thursday: { open: '08:00', close: '18:00', enabled: true },
        friday: { open: '08:00', close: '18:00', enabled: true },
        saturday: { open: '09:00', close: '13:00', enabled: true },
        sunday: { open: '10:00', close: '14:00', enabled: false },
      },
      serviceRadius: 35,
      isActive: true,
    },
  ]);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<Partial<Branch>>({});
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list');

  const handleCreate = () => {
    setFormData({
      name: '',
      address: { street: '', city: '', state: '', zipCode: '' },
      contact: { phone: '', email: '' },
      managerName: '',
      isPrimary: false,
      operatingHours: {
        monday: { open: '08:00', close: '18:00', enabled: true },
        tuesday: { open: '08:00', close: '18:00', enabled: true },
        wednesday: { open: '08:00', close: '18:00', enabled: true },
        thursday: { open: '08:00', close: '18:00', enabled: true },
        friday: { open: '08:00', close: '18:00', enabled: true },
        saturday: { open: '09:00', close: '15:00', enabled: true },
        sunday: { open: '10:00', close: '14:00', enabled: false },
      },
      serviceRadius: 50,
      isActive: true,
    });
    setEditingBranch(null);
    setShowCreateForm(true);
    setActiveTab('form');
  };

  const handleEdit = (branch: Branch) => {
    setFormData(branch);
    setEditingBranch(branch);
    setShowCreateForm(true);
    setActiveTab('form');
  };

  const handleSave = () => {
    if (editingBranch) {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === editingBranch.id
            ? { ...(formData as Branch), id: editingBranch.id }
            : b,
        ),
      );
    } else {
      const newBranch: Branch = {
        ...(formData as Branch),
        id: Date.now().toString(),
      };
      setBranches((prev) => [...prev, newBranch]);
    }
    setShowCreateForm(false);
    setEditingBranch(null);
    setFormData({});
    setActiveTab('list');
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingBranch(null);
    setFormData({});
    setActiveTab('list');
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this branch?')) {
      setBranches((prev) => prev.filter((b) => b.id !== id));
    }
  };

  const togglePrimary = (id: string) => {
    setBranches((prev) =>
      prev.map((b) => ({
        ...b,
        isPrimary: b.id === id,
      })),
    );
  };

  const updateFormData = (path: string[], value: any) => {
    setFormData((prev) => {
      const updated = { ...prev } as any;
      let current = updated;

      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className={styles.branches}>
      <div className={styles.header}>
        <div>
          <h3>Branch Management</h3>
          <p>Manage company branches and locations</p>
        </div>
        {!showCreateForm && (
          <button onClick={handleCreate} className={styles.createButton}>
            + Add Branch
          </button>
        )}
      </div>

      {activeTab === 'list' && (
        <div className={styles.branchesGrid}>
          {branches.map((branch) => (
            <div key={branch.id} className={styles.branchCard}>
              <div className={styles.branchHeader}>
                <div>
                  <h4>{branch.name}</h4>
                  {branch.isPrimary && (
                    <span className={styles.primaryBadge}>Primary</span>
                  )}
                </div>
                <span
                  className={`${styles.status} ${branch.isActive ? styles.active : styles.inactive}`}
                >
                  {branch.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className={styles.branchDetails}>
                <div className={styles.detailRow}>
                  <span className={styles.icon}>📍</span>
                  <div>
                    <div>{branch.address.street}</div>
                    <div>
                      {branch.address.city}, {branch.address.state}{' '}
                      {branch.address.zipCode}
                    </div>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.icon}>📞</span>
                  <div>
                    <div>{branch.contact.phone}</div>
                    <div>{branch.contact.email}</div>
                  </div>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.icon}>👤</span>
                  <div>Manager: {branch.managerName}</div>
                </div>

                <div className={styles.detailRow}>
                  <span className={styles.icon}>📏</span>
                  <div>Service Radius: {branch.serviceRadius} miles</div>
                </div>
              </div>

              <div className={styles.branchActions}>
                <button
                  onClick={() => handleEdit(branch)}
                  className={styles.actionButton}
                >
                  ✏️ Edit
                </button>
                {!branch.isPrimary && (
                  <button
                    onClick={() => togglePrimary(branch.id)}
                    className={styles.actionButton}
                  >
                    ⭐ Set as Primary
                  </button>
                )}
                {!branch.isPrimary && (
                  <button
                    onClick={() => handleDelete(branch.id)}
                    className={styles.deleteButton}
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>
          ))}

          {branches.length === 0 && (
            <div className={styles.emptyState}>
              <p>No branches found. Create your first branch to get started.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'form' && showCreateForm && (
        <div className={styles.formContainer}>
          <h4>{editingBranch ? 'Edit Branch' : 'Create New Branch'}</h4>

          <div className={styles.formSection}>
            <h5>Basic Information</h5>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Branch Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => updateFormData(['name'], e.target.value)}
                  className={styles.input}
                  placeholder="e.g., Downtown Branch"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Manager Name *</label>
                <input
                  type="text"
                  value={formData.managerName || ''}
                  onChange={(e) =>
                    updateFormData(['managerName'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="e.g., John Smith"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Service Radius (miles) *</label>
                <input
                  type="number"
                  value={formData.serviceRadius || 0}
                  onChange={(e) =>
                    updateFormData(['serviceRadius'], parseInt(e.target.value))
                  }
                  className={styles.input}
                  placeholder="e.g., 50"
                  min="1"
                />
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <h5>Address</h5>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Street Address *</label>
                <input
                  type="text"
                  value={formData.address?.street || ''}
                  onChange={(e) =>
                    updateFormData(['address', 'street'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="e.g., 123 Main Street"
                />
              </div>

              <div className={styles.formGroup}>
                <label>City *</label>
                <input
                  type="text"
                  value={formData.address?.city || ''}
                  onChange={(e) =>
                    updateFormData(['address', 'city'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="e.g., Dallas"
                />
              </div>

              <div className={styles.formGroup}>
                <label>State *</label>
                <input
                  type="text"
                  value={formData.address?.state || ''}
                  onChange={(e) =>
                    updateFormData(['address', 'state'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="e.g., TX"
                  maxLength={2}
                />
              </div>

              <div className={styles.formGroup}>
                <label>ZIP Code *</label>
                <input
                  type="text"
                  value={formData.address?.zipCode || ''}
                  onChange={(e) =>
                    updateFormData(['address', 'zipCode'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="e.g., 75201"
                />
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <h5>Contact Information</h5>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={formData.contact?.phone || ''}
                  onChange={(e) =>
                    updateFormData(['contact', 'phone'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Email Address *</label>
                <input
                  type="email"
                  value={formData.contact?.email || ''}
                  onChange={(e) =>
                    updateFormData(['contact', 'email'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="branch@movecorp.com"
                />
              </div>
            </div>
          </div>

          <div className={styles.formSection}>
            <h5>Operating Hours</h5>
            <div className={styles.businessHours}>
              {formData.operatingHours &&
                Object.entries(formData.operatingHours).map(([day, hours]) => (
                  <div key={day} className={styles.businessHourRow}>
                    <div className={styles.dayName}>
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </div>
                    <div className={styles.hourInputs}>
                      <input
                        type="time"
                        value={hours.open}
                        onChange={(e) =>
                          updateFormData(
                            ['operatingHours', day, 'open'],
                            e.target.value,
                          )
                        }
                        className={styles.timeInput}
                        disabled={!hours.enabled}
                      />
                      <span>to</span>
                      <input
                        type="time"
                        value={hours.close}
                        onChange={(e) =>
                          updateFormData(
                            ['operatingHours', day, 'close'],
                            e.target.value,
                          )
                        }
                        className={styles.timeInput}
                        disabled={!hours.enabled}
                      />
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={hours.enabled}
                          onChange={(e) =>
                            updateFormData(
                              ['operatingHours', day, 'enabled'],
                              e.target.checked,
                            )
                          }
                        />
                        Open
                      </label>
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className={styles.formSection}>
            <h5>Settings</h5>
            <div className={styles.formGrid}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isPrimary || false}
                  onChange={(e) =>
                    updateFormData(['isPrimary'], e.target.checked)
                  }
                />
                Set as Primary Branch
              </label>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.isActive !== false}
                  onChange={(e) =>
                    updateFormData(['isActive'], e.target.checked)
                  }
                />
                Active
              </label>
            </div>
          </div>

          <div className={styles.formActions}>
            <button onClick={handleCancel} className={styles.cancelButton}>
              Cancel
            </button>
            <button onClick={handleSave} className={styles.saveButton}>
              {editingBranch ? 'Update Branch' : 'Create Branch'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
