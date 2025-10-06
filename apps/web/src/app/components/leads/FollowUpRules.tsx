'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../../lib/config';
import styles from './FollowUpRules.module.css';

interface FollowUpRule {
  id: string;
  name: string;
  description?: string;
  trigger: 'quote_sent' | 'no_response' | 'initial_contact' | 'meeting_scheduled' | 'callback_requested';
  delayHours: number;
  action: 'create_task' | 'send_email' | 'schedule_call' | 'send_sms';
  emailTemplate?: string;
  taskTemplate?: {
    type: 'call' | 'email' | 'meeting' | 'follow_up';
    subject: string;
    description: string;
  };
  isActive: boolean;
  priority: number;
  conditions?: Record<string, unknown>;
  assignToSalesRep: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  executionStats?: {
    totalTriggered: number;
    totalSuccessful: number;
    lastTriggered?: string;
  };
}

interface CreateRuleDto {
  name: string;
  description?: string;
  trigger: 'quote_sent' | 'no_response' | 'initial_contact' | 'meeting_scheduled' | 'callback_requested';
  delayHours: number;
  action: 'create_task' | 'send_email' | 'schedule_call' | 'send_sms';
  emailTemplate?: string;
  taskTemplate?: {
    type: 'call' | 'email' | 'meeting' | 'follow_up';
    subject: string;
    description: string;
  };
  priority: number;
  assignToSalesRep: boolean;
}

export function FollowUpRules() {
  const { user: _user } = useAuth();
  const [rules, setRules] = useState<FollowUpRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState<FollowUpRule | null>(null);

  const [formData, setFormData] = useState<CreateRuleDto>({
    name: '',
    description: '',
    trigger: 'quote_sent',
    delayHours: 24,
    action: 'create_task',
    emailTemplate: '',
    taskTemplate: {
      type: 'follow_up',
      subject: '',
      description: '',
    },
    priority: 1,
    assignToSalesRep: true,
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/api/follow-up-rules`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch follow-up rules');
      }

      const data = await response.json();
      setRules(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: string, currentState: boolean) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/api/follow-up-rules/${ruleId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle rule');
      }

      // Optimistic update
      setRules(prev => prev.map(rule =>
        rule.id === ruleId ? { ...rule, isActive: !currentState } : rule
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle rule');
      await fetchRules();
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/api/follow-up-rules/${ruleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const handleCreateRule = () => {
    setEditingRule(null);
    setFormData({
      name: '',
      description: '',
      trigger: 'quote_sent',
      delayHours: 24,
      action: 'create_task',
      emailTemplate: '',
      taskTemplate: {
        type: 'follow_up',
        subject: '',
        description: '',
      },
      priority: 1,
      assignToSalesRep: true,
    });
    setShowCreateForm(true);
  };

  const handleEditRule = (rule: FollowUpRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description,
      trigger: rule.trigger,
      delayHours: rule.delayHours,
      action: rule.action,
      emailTemplate: rule.emailTemplate,
      taskTemplate: rule.taskTemplate,
      priority: rule.priority,
      assignToSalesRep: rule.assignToSalesRep,
    });
    setShowCreateForm(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Rule name is required';
    }

    if (formData.delayHours < 0) {
      errors.delayHours = 'Delay must be a positive number';
    }

    if (formData.action === 'create_task' && !formData.taskTemplate?.subject) {
      errors.taskSubject = 'Task subject is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/api/follow-up-rules`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create rule');
      }

      await fetchRules();
      setShowCreateForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTriggerLabel = (trigger: string) => {
    switch (trigger) {
      case 'quote_sent': return 'Quote Sent';
      case 'no_response': return 'No Response';
      case 'initial_contact': return 'Initial Contact';
      case 'meeting_scheduled': return 'Meeting Scheduled';
      case 'callback_requested': return 'Callback Requested';
      default: return trigger;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'create_task': return 'Create Task';
      case 'send_email': return 'Send Email';
      case 'schedule_call': return 'Schedule Call';
      case 'send_sms': return 'Send SMS';
      default: return action;
    }
  };

  const getDelayLabel = (hours: number) => {
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''}`;
    }
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  if (loading && rules.length === 0) {
    return (
      <div className={styles.followUpRules}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading automation rules...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.followUpRules}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2>Follow-up Automation Rules</h2>
          <p className={styles.headerDescription}>
            Automate follow-up tasks and emails based on customer interactions
          </p>
        </div>
        <button onClick={handleCreateRule} className={styles.primaryButton}>
          + Create Rule
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Statistics */}
      {rules.length > 0 && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Rules</div>
            <div className={styles.statValue}>{rules.length}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active Rules</div>
            <div className={styles.statValue}>
              {rules.filter(r => r.isActive).length}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Triggered</div>
            <div className={styles.statValue}>
              {rules.reduce((sum, r) => sum + (r.executionStats?.totalTriggered || 0), 0)}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Success Rate</div>
            <div className={styles.statValue}>
              {(() => {
                const total = rules.reduce((sum, r) => sum + (r.executionStats?.totalTriggered || 0), 0);
                const successful = rules.reduce((sum, r) => sum + (r.executionStats?.totalSuccessful || 0), 0);
                return total > 0 ? `${Math.round((successful / total) * 100)}%` : 'N/A';
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className={styles.rulesList}>
        {rules.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No automation rules configured</p>
            <button onClick={handleCreateRule} className={styles.primaryButton}>
              Create Your First Rule
            </button>
          </div>
        ) : (
          rules.map((rule) => (
            <div key={rule.id} className={`${styles.ruleCard} ${!rule.isActive ? styles.ruleInactive : ''}`}>
              <div className={styles.ruleHeader}>
                <div className={styles.ruleTitle}>
                  <h3>{rule.name}</h3>
                  {!rule.isActive && <span className={styles.inactiveBadge}>Inactive</span>}
                </div>
                <div className={styles.ruleToggle}>
                  <label className={styles.switch}>
                    <input
                      type="checkbox"
                      checked={rule.isActive}
                      onChange={() => handleToggleRule(rule.id, rule.isActive)}
                    />
                    <span className={styles.slider}></span>
                  </label>
                </div>
              </div>

              {rule.description && (
                <p className={styles.ruleDescription}>{rule.description}</p>
              )}

              <div className={styles.ruleFlow}>
                <div className={styles.flowItem}>
                  <div className={styles.flowLabel}>Trigger</div>
                  <div className={styles.flowValue}>
                    <span className={styles.flowIcon}>⚡</span>
                    {getTriggerLabel(rule.trigger)}
                  </div>
                </div>
                <div className={styles.flowArrow}>→</div>
                <div className={styles.flowItem}>
                  <div className={styles.flowLabel}>Delay</div>
                  <div className={styles.flowValue}>
                    <span className={styles.flowIcon}>⏱️</span>
                    {getDelayLabel(rule.delayHours)}
                  </div>
                </div>
                <div className={styles.flowArrow}>→</div>
                <div className={styles.flowItem}>
                  <div className={styles.flowLabel}>Action</div>
                  <div className={styles.flowValue}>
                    <span className={styles.flowIcon}>🎯</span>
                    {getActionLabel(rule.action)}
                  </div>
                </div>
              </div>

              {rule.taskTemplate && (
                <div className={styles.ruleTemplate}>
                  <strong>Task Template:</strong> {rule.taskTemplate.subject}
                </div>
              )}

              {rule.executionStats && rule.executionStats.totalTriggered > 0 && (
                <div className={styles.ruleStats}>
                  <span>
                    Triggered: {rule.executionStats.totalTriggered} times
                  </span>
                  <span>
                    Success: {rule.executionStats.totalSuccessful}
                  </span>
                  {rule.executionStats.lastTriggered && (
                    <span>
                      Last: {new Date(rule.executionStats.lastTriggered).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              <div className={styles.ruleActions}>
                <button onClick={() => handleEditRule(rule)} className={styles.editButton}>
                  Edit
                </button>
                <button onClick={() => handleDeleteRule(rule.id)} className={styles.deleteButton}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Rule Modal */}
      {showCreateForm && (
        <div className={styles.modal} onClick={() => setShowCreateForm(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>{editingRule ? 'Edit Rule' : 'Create Automation Rule'}</h3>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>

            <form onSubmit={handleSubmitRule}>
              <div className={styles.formBody}>
                <div className={styles.formGrid}>
                  <div className={styles.formGroupFull}>
                    <label htmlFor="name">Rule Name *</label>
                    <input
                      type="text"
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={validationErrors.name ? styles.inputError : ''}
                      placeholder="e.g., Follow-up 24 hours after quote"
                      required
                    />
                    {validationErrors.name && (
                      <span className={styles.errorText}>{validationErrors.name}</span>
                    )}
                  </div>

                  <div className={styles.formGroupFull}>
                    <label htmlFor="description">Description</label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Optional description of what this rule does"
                      rows={2}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="trigger">Trigger Event *</label>
                    <select
                      id="trigger"
                      value={formData.trigger}
                      onChange={(e) => setFormData({ ...formData, trigger: e.target.value as any })}
                      required
                    >
                      <option value="quote_sent">Quote Sent</option>
                      <option value="no_response">No Response</option>
                      <option value="initial_contact">Initial Contact</option>
                      <option value="meeting_scheduled">Meeting Scheduled</option>
                      <option value="callback_requested">Callback Requested</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="delayHours">Delay (hours) *</label>
                    <input
                      type="number"
                      id="delayHours"
                      value={formData.delayHours}
                      onChange={(e) => setFormData({ ...formData, delayHours: parseInt(e.target.value) || 0 })}
                      className={validationErrors.delayHours ? styles.inputError : ''}
                      min="0"
                      required
                    />
                    {validationErrors.delayHours && (
                      <span className={styles.errorText}>{validationErrors.delayHours}</span>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="action">Action *</label>
                    <select
                      id="action"
                      value={formData.action}
                      onChange={(e) => setFormData({ ...formData, action: e.target.value as any })}
                      required
                    >
                      <option value="create_task">Create Task</option>
                      <option value="send_email">Send Email</option>
                      <option value="schedule_call">Schedule Call</option>
                      <option value="send_sms">Send SMS</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="priority">Priority *</label>
                    <select
                      id="priority"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                      required
                    >
                      <option value="1">Low</option>
                      <option value="2">Medium</option>
                      <option value="3">High</option>
                    </select>
                  </div>

                  {formData.action === 'create_task' && (
                    <>
                      <div className={styles.formGroup}>
                        <label htmlFor="taskType">Task Type *</label>
                        <select
                          id="taskType"
                          value={formData.taskTemplate?.type || 'follow_up'}
                          onChange={(e) => setFormData({
                            ...formData,
                            taskTemplate: { ...formData.taskTemplate!, type: e.target.value as any }
                          })}
                          required
                        >
                          <option value="call">Call</option>
                          <option value="email">Email</option>
                          <option value="meeting">Meeting</option>
                          <option value="follow_up">Follow-up</option>
                        </select>
                      </div>

                      <div className={styles.formGroupFull}>
                        <label htmlFor="taskSubject">Task Subject *</label>
                        <input
                          type="text"
                          id="taskSubject"
                          value={formData.taskTemplate?.subject || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            taskTemplate: { ...formData.taskTemplate!, subject: e.target.value }
                          })}
                          className={validationErrors.taskSubject ? styles.inputError : ''}
                          placeholder="e.g., Follow-up on quote"
                          required
                        />
                        {validationErrors.taskSubject && (
                          <span className={styles.errorText}>{validationErrors.taskSubject}</span>
                        )}
                      </div>

                      <div className={styles.formGroupFull}>
                        <label htmlFor="taskDescription">Task Description</label>
                        <textarea
                          id="taskDescription"
                          value={formData.taskTemplate?.description || ''}
                          onChange={(e) => setFormData({
                            ...formData,
                            taskTemplate: { ...formData.taskTemplate!, description: e.target.value }
                          })}
                          placeholder="Task description"
                          rows={2}
                        />
                      </div>
                    </>
                  )}

                  {formData.action === 'send_email' && (
                    <div className={styles.formGroupFull}>
                      <label htmlFor="emailTemplate">Email Template</label>
                      <select
                        id="emailTemplate"
                        value={formData.emailTemplate || ''}
                        onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                      >
                        <option value="">-- Select template --</option>
                        <option value="follow_up">Follow-up Email</option>
                        <option value="quote_reminder">Quote Reminder</option>
                        <option value="thank_you">Thank You</option>
                      </select>
                    </div>
                  )}

                  <div className={styles.formGroupFull}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.assignToSalesRep}
                        onChange={(e) => setFormData({ ...formData, assignToSalesRep: e.target.checked })}
                      />
                      Assign to assigned sales rep
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton} disabled={loading}>
                  {loading ? 'Creating...' : editingRule ? 'Update Rule' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
