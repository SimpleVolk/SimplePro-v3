'use client';

import { useState, useEffect } from 'react';
import styles from './PricingRulesAdmin.module.css';

// Types
interface PricingRule {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: number;
  conditions: RuleCondition[];
  actions: RuleAction[];
  isActive: boolean;
  applicableServices: string[];
  version: string;
  notes?: string;
  effectiveDate?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive' | 'expired' | 'pending' | 'deleted';
}

interface RuleCondition {
  field: string;
  operator: string;
  value?: any;
  values?: any[];
}

interface RuleAction {
  type: string;
  amount: number;
  description: string;
  targetField: string;
  condition?: string;
}

// Metadata interface for pricing rules configuration (for future use)
// interface Metadata {
//   categories: { value: string; label: string }[];
//   operators: { value: string; label: string }[];
//   actionTypes: { value: string; label: string }[];
// }


export function PricingRulesAdmin() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingRule, setIsTestingRule] = useState(false);

  // Metadata
  const [categories, setCategories] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [actionTypes, setActionTypes] = useState<any[]>([]);

  // Form state for create/edit
  const [formData, setFormData] = useState<Partial<PricingRule>>({
    name: '',
    description: '',
    category: '',
    priority: 50,
    conditions: [],
    actions: [],
    isActive: true,
    applicableServices: [],
    notes: ''
  });

  // Test state
  const [testInput, setTestInput] = useState({
    serviceType: 'local',
    weight: 5000,
    distance: 50,
    isWeekend: false,
    hasStairs: false
  });
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    loadRules();
    loadMetadata();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('access_token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('isActive', filterStatus === 'active' ? 'true' : 'false');

      const response = await fetch(`/api/pricing-rules?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load pricing rules');
      }

      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  const loadMetadata = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [categoriesRes, operatorsRes, actionTypesRes] = await Promise.all([
        fetch('/api/pricing-rules/metadata/categories', { headers }),
        fetch('/api/pricing-rules/metadata/operators', { headers }),
        fetch('/api/pricing-rules/metadata/action-types', { headers })
      ]);

      setCategories(await categoriesRes.json());
      setOperators(await operatorsRes.json());
      setActionTypes(await actionTypesRes.json());
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      priority: 50,
      conditions: [],
      actions: [],
      isActive: true,
      applicableServices: [],
      notes: ''
    });
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.name || formData.name.trim() === '') {
      errors.push('Rule name is required');
    }

    if (formData.priority === undefined || formData.priority < 0 || formData.priority > 100) {
      errors.push('Priority must be between 0 and 100');
    }

    if (!formData.applicableServices || formData.applicableServices.length === 0) {
      errors.push('At least one service type must be selected');
    }

    if (!formData.conditions || formData.conditions.length === 0) {
      errors.push('At least one condition is required');
    }

    if (!formData.actions || formData.actions.length === 0) {
      errors.push('At least one action is required');
    }

    if (errors.length > 0) {
      alert(errors.join('\n'));
      return false;
    }

    return true;
  };

  const handleCreateRule = () => {
    resetForm();
    setShowCreateModal(true);
  };

  const handleEditRule = (rule: PricingRule) => {
    setFormData({
      name: rule.name,
      description: rule.description,
      category: rule.category,
      priority: rule.priority,
      conditions: rule.conditions,
      actions: rule.actions,
      isActive: rule.isActive,
      applicableServices: rule.applicableServices,
      notes: rule.notes
    });
    setSelectedRule(rule);
    setShowEditModal(true);
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/pricing-rules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create rule');
      }

      const data = await response.json();
      setRules([...rules, data.data]);
      setShowCreateModal(false);
      resetForm();
      alert('Pricing rule created successfully');
    } catch (err) {
      console.error('Error creating rule:', err);
      alert('Failed to create pricing rule: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!validateForm() || !selectedRule) return;

    setIsSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/pricing-rules/${selectedRule.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update rule');
      }

      const data = await response.json();
      setRules(rules.map(r => r.id === data.data.id ? data.data : r));
      setShowEditModal(false);
      setSelectedRule(null);
      resetForm();
      alert('Pricing rule updated successfully');
    } catch (err) {
      console.error('Error updating rule:', err);
      alert('Failed to update pricing rule: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/pricing-rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const handleToggleRule = async (ruleId: string, isActive: boolean) => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/pricing-rules/${ruleId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update rule');
      }

      await loadRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    }
  };

  const handleTestRule = (rule: PricingRule) => {
    setSelectedRule(rule);
    setTestResult(null);
    setShowTestModal(true);
  };

  const runTest = async () => {
    if (!selectedRule || !testInput) return;

    setIsTestingRule(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/pricing-rules/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ruleId: selectedRule.id,
          testData: testInput
        })
      });

      if (!response.ok) {
        throw new Error('Test failed');
      }

      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      console.error('Error testing rule:', err);
      setTestResult({ success: false, error: 'Test failed' });
    } finally {
      setIsTestingRule(false);
    }
  };


  const exportRules = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/pricing-rules/export/json', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to export rules');
      }

      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pricing-rules-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export rules');
    }
  };

  // Helper functions for managing conditions and actions
  const addCondition = () => {
    setFormData({
      ...formData,
      conditions: [
        ...(formData.conditions || []),
        { field: '', operator: 'equals', value: '' }
      ]
    });
  };

  const removeCondition = (index: number) => {
    setFormData({
      ...formData,
      conditions: formData.conditions?.filter((_, i) => i !== index) || []
    });
  };

  const updateCondition = (index: number, field: string, value: any) => {
    const updatedConditions = [...(formData.conditions || [])];
    updatedConditions[index] = { ...updatedConditions[index], [field]: value };
    setFormData({ ...formData, conditions: updatedConditions });
  };

  const addAction = () => {
    setFormData({
      ...formData,
      actions: [
        ...(formData.actions || []),
        { type: 'add_fixed', amount: 0, description: '', targetField: 'price' }
      ]
    });
  };

  const removeAction = (index: number) => {
    setFormData({
      ...formData,
      actions: formData.actions?.filter((_, i) => i !== index) || []
    });
  };

  const updateAction = (index: number, field: string, value: any) => {
    const updatedActions = [...(formData.actions || [])];
    updatedActions[index] = { ...updatedActions[index], [field]: value };
    setFormData({ ...formData, actions: updatedActions });
  };

  const toggleService = (service: string) => {
    const currentServices = formData.applicableServices || [];
    const updated = currentServices.includes(service)
      ? currentServices.filter(s => s !== service)
      : [...currentServices, service];
    setFormData({ ...formData, applicableServices: updated });
  };

  const getStatusBadge = (rule: PricingRule) => {
    const statusClass = styles[`status${rule.status.charAt(0).toUpperCase()}${rule.status.slice(1)}`];
    return (
      <span className={`${styles.statusBadge} ${statusClass}`}>
        {rule.status}
      </span>
    );
  };

  const filteredRules = rules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !filterCategory || rule.category === filterCategory;
    const matchesStatus = !filterStatus ||
                         (filterStatus === 'active' && rule.isActive) ||
                         (filterStatus === 'inactive' && !rule.isActive);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Pricing Rules Administration</h1>
        <div className={styles.headerActions}>
          <button onClick={exportRules} className={styles.exportButton}>
            📥 Export Rules
          </button>
          <button onClick={handleCreateRule} className={styles.createButton}>
            ➕ Create New Rule
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <input
            type="text"
            placeholder="Search rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <button onClick={loadRules} className={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className={styles.errorAlert}>
          <strong>⚠️ Error:</strong> {error}
          <button onClick={() => setError(null)} className={styles.closeError}>×</button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          Loading pricing rules...
        </div>
      )}

      {/* Rules Table */}
      <div className={styles.tableContainer}>
        <table className={styles.rulesTable}>
          <thead>
            <tr>
              <th>Rule ID</th>
              <th>Name</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Services</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRules.map(rule => (
              <tr key={rule.id} className={!rule.isActive ? styles.inactiveRow : ''}>
                <td className={styles.ruleId}>{rule.id}</td>
                <td>
                  <div className={styles.ruleName}>{rule.name}</div>
                  <div className={styles.ruleDescription}>{rule.description}</div>
                </td>
                <td>
                  <span className={styles.categoryBadge}>
                    {rule.category.replace('_', ' ')}
                  </span>
                </td>
                <td className={styles.priority}>{rule.priority}</td>
                <td>{getStatusBadge(rule)}</td>
                <td>
                  <div className={styles.services}>
                    {rule.applicableServices.map(service => (
                      <span key={service} className={styles.serviceBadge}>
                        {service.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div className={styles.actions}>
                    <button
                      onClick={() => handleEditRule(rule)}
                      className={styles.editButton}
                      title="Edit Rule"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleTestRule(rule)}
                      className={styles.testButton}
                      title="Test Rule"
                    >
                      🧪
                    </button>
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.isActive)}
                      className={rule.isActive ? styles.deactivateButton : styles.activateButton}
                      title={rule.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {rule.isActive ? '⏸️' : '▶️'}
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className={styles.deleteButton}
                      title="Delete Rule"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRules.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <p>No pricing rules found matching your criteria.</p>
            <button onClick={handleCreateRule} className={styles.createButton}>
              Create Your First Rule
            </button>
          </div>
        )}
      </div>

      {/* Rule Summary Stats */}
      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h3>Total Rules</h3>
          <span className={styles.statNumber}>{rules.length}</span>
        </div>
        <div className={styles.statCard}>
          <h3>Active Rules</h3>
          <span className={styles.statNumber}>{rules.filter(r => r.isActive).length}</span>
        </div>
        <div className={styles.statCard}>
          <h3>Categories</h3>
          <span className={styles.statNumber}>{categories.length}</span>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowCreateModal(false);
            setShowEditModal(false);
          }
        }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>{showCreateModal ? 'Create New Pricing Rule' : 'Edit Pricing Rule'}</h2>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Rule Name *</label>
                <input
                  type="text"
                  className={styles.formInput}
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Weekend Surcharge"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description</label>
                <textarea
                  className={styles.formTextarea}
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this rule does..."
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Category *</label>
                <select
                  className={styles.formSelect}
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Priority (0-100) *</label>
                <input
                  type="number"
                  className={styles.formInput}
                  value={formData.priority || 50}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  min="0"
                  max="100"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Applicable Services *</label>
                <div className={styles.formCheckboxGroup}>
                  {['local', 'long_distance', 'storage', 'packing_only'].map(service => (
                    <div key={service} className={styles.formCheckbox}>
                      <input
                        type="checkbox"
                        id={`service-${service}`}
                        checked={formData.applicableServices?.includes(service) || false}
                        onChange={() => toggleService(service)}
                      />
                      <label htmlFor={`service-${service}`}>
                        {service.replace('_', ' ')}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Conditions *</label>
                <div className={styles.conditionsList}>
                  {formData.conditions?.map((condition, index) => (
                    <div key={index} className={styles.conditionItem}>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeCondition(index)}
                      >
                        Remove
                      </button>
                      <div className={styles.conditionFields}>
                        <div>
                          <input
                            type="text"
                            className={styles.formInput}
                            placeholder="Field (e.g., weight)"
                            value={condition.field}
                            onChange={(e) => updateCondition(index, 'field', e.target.value)}
                          />
                        </div>
                        <div>
                          <select
                            className={styles.formSelect}
                            value={condition.operator}
                            onChange={(e) => updateCondition(index, 'operator', e.target.value)}
                          >
                            {operators.map(op => (
                              <option key={op.value} value={op.value}>{op.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="text"
                            className={styles.formInput}
                            placeholder="Value"
                            value={condition.value || ''}
                            onChange={(e) => updateCondition(index, 'value', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className={styles.addButton} onClick={addCondition}>
                  + Add Condition
                </button>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Actions *</label>
                <div className={styles.actionsList}>
                  {formData.actions?.map((action, index) => (
                    <div key={index} className={styles.actionItem}>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeAction(index)}
                      >
                        Remove
                      </button>
                      <div className={styles.actionFields}>
                        <div>
                          <select
                            className={styles.formSelect}
                            value={action.type}
                            onChange={(e) => updateAction(index, 'type', e.target.value)}
                          >
                            {actionTypes.map(at => (
                              <option key={at.value} value={at.value}>{at.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            className={styles.formInput}
                            placeholder="Amount"
                            value={action.amount}
                            onChange={(e) => updateAction(index, 'amount', parseFloat(e.target.value))}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className={styles.formInput}
                            placeholder="Description"
                            value={action.description}
                            onChange={(e) => updateAction(index, 'description', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className={styles.addButton} onClick={addAction}>
                  + Add Action
                </button>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Notes</label>
                <textarea
                  className={styles.formTextarea}
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes about this rule..."
                />
              </div>

              <div className={styles.formGroup}>
                <div className={styles.formCheckbox}>
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive !== false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <label htmlFor="isActive">Active Rule</label>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className={styles.saveButton}
                onClick={showCreateModal ? handleCreate : handleEdit}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : showCreateModal ? 'Create Rule' : 'Update Rule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Modal */}
      {showTestModal && selectedRule && (
        <div className={styles.modalOverlay} onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowTestModal(false);
            setTestResult(null);
          }
        }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2>Test Rule: {selectedRule.name}</h2>
              <button
                className={styles.modalClose}
                onClick={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                }}
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              <p style={{ color: '#9ca3af', marginBottom: '1rem' }}>
                Test this rule with sample data to see if it applies and what its impact would be.
              </p>

              <div className={styles.testInputs}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Service Type</label>
                  <select
                    className={styles.formSelect}
                    value={testInput.serviceType}
                    onChange={(e) => setTestInput({ ...testInput, serviceType: e.target.value })}
                  >
                    <option value="local">Local</option>
                    <option value="long_distance">Long Distance</option>
                    <option value="storage">Storage</option>
                    <option value="packing_only">Packing Only</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Weight (lbs)</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={testInput.weight}
                    onChange={(e) => setTestInput({ ...testInput, weight: parseInt(e.target.value) })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Distance (miles)</label>
                  <input
                    type="number"
                    className={styles.formInput}
                    value={testInput.distance}
                    onChange={(e) => setTestInput({ ...testInput, distance: parseInt(e.target.value) })}
                  />
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.formCheckbox}>
                    <input
                      type="checkbox"
                      id="isWeekend"
                      checked={testInput.isWeekend}
                      onChange={(e) => setTestInput({ ...testInput, isWeekend: e.target.checked })}
                    />
                    <label htmlFor="isWeekend">Weekend Move</label>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.formCheckbox}>
                    <input
                      type="checkbox"
                      id="hasStairs"
                      checked={testInput.hasStairs}
                      onChange={(e) => setTestInput({ ...testInput, hasStairs: e.target.checked })}
                    />
                    <label htmlFor="hasStairs">Has Stairs</label>
                  </div>
                </div>
              </div>

              <button
                className={styles.saveButton}
                onClick={runTest}
                disabled={isTestingRule}
                style={{ width: '100%', marginTop: '1rem' }}
              >
                {isTestingRule ? 'Testing...' : 'Run Test'}
              </button>

              {testResult && (
                <div className={`${styles.testResult} ${testResult.success ? styles.testResultSuccess : styles.testResultError}`}>
                  <div className={styles.testResultTitle}>
                    {testResult.success ? '✓ Test Completed' : '✗ Test Failed'}
                  </div>
                  <div className={styles.testResultDetails}>
                    <pre>{JSON.stringify(testResult, null, 2)}</pre>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={() => {
                  setShowTestModal(false);
                  setTestResult(null);
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}