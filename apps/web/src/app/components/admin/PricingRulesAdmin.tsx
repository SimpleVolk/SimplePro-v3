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

interface TestResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  conditionsEvaluated: any[];
  actionsApplied?: RuleAction[];
  priceImpact?: number;
  errors?: string[];
}

export function PricingRulesAdmin() {
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedRule, setSelectedRule] = useState<PricingRule | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);

  // Metadata
  const [categories, setCategories] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [actionTypes, setActionTypes] = useState<any[]>([]);

  useEffect(() => {
    loadRules();
    loadMetadata();
  }, []);

  const loadRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterCategory) params.append('category', filterCategory);
      if (filterStatus) params.append('isActive', filterStatus === 'active' ? 'true' : 'false');

      const response = await fetch(`/api/pricing-rules?${params}`);
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
      const [categoriesRes, operatorsRes, actionTypesRes] = await Promise.all([
        fetch('/api/pricing-rules/metadata/categories'),
        fetch('/api/pricing-rules/metadata/operators'),
        fetch('/api/pricing-rules/metadata/action-types')
      ]);

      setCategories(await categoriesRes.json());
      setOperators(await operatorsRes.json());
      setActionTypes(await actionTypesRes.json());
    } catch (err) {
      console.error('Failed to load metadata:', err);
    }
  };

  const handleCreateRule = () => {
    setSelectedRule(null);
    setShowCreateModal(true);
  };

  const handleEditRule = (rule: PricingRule) => {
    setSelectedRule(rule);
    setShowCreateModal(true);
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      const response = await fetch(`/api/pricing-rules/${ruleId}`, {
        method: 'DELETE'
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
      const response = await fetch(`/api/pricing-rules/${ruleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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

  const handleTestRule = async (rule: PricingRule) => {
    setSelectedRule(rule);
    setShowTestModal(true);
  };

  const runTest = async (testData: any) => {
    if (!selectedRule) return;

    try {
      const response = await fetch('/api/pricing-rules/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rule: selectedRule,
          testData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to test rule');
      }

      const result = await response.json();
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test rule');
    }
  };

  const exportRules = async () => {
    try {
      const response = await fetch('/api/pricing-rules/export/json');
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

      {/* Modals would go here - RuleEditModal, TestModal etc. */}
      {/* These would be separate components for better organization */}
    </div>
  );
}