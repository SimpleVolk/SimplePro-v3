'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '@/lib/config';
import { LeadActivity } from './LeadActivities';
import styles from './ActivityForm.module.css';

interface ActivityFormProps {
  activity?: LeadActivity | null;
  onClose: () => void;
  onSave: () => void;
}

interface CreateActivityDto {
  type: 'call' | 'email' | 'meeting' | 'quote_sent' | 'follow_up';
  opportunityId: string;
  customerId?: string;
  subject: string;
  description?: string;
  outcome?: 'successful' | 'no_answer' | 'voicemail' | 'scheduled' | 'not_interested' | 'callback_requested';
  scheduledDate?: string;
  dueDate?: string;
  assignedTo: string;
  notes?: string;
  emailTemplate?: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface ActivityTemplate {
  name: string;
  type: 'call' | 'email' | 'meeting' | 'quote_sent' | 'follow_up';
  subject: string;
  description: string;
}

const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    name: 'Initial Contact Call',
    type: 'call',
    subject: 'Initial contact with prospect',
    description: 'Introduce our services and understand customer needs'
  },
  {
    name: 'Quote Follow-up',
    type: 'follow_up',
    subject: 'Follow-up on sent quote',
    description: 'Check if customer has reviewed the quote and answer questions'
  },
  {
    name: 'Pre-move Confirmation',
    type: 'call',
    subject: 'Pre-move confirmation call',
    description: 'Confirm move details, crew arrival time, and final requirements'
  },
  {
    name: 'Post-move Follow-up',
    type: 'email',
    subject: 'Post-move satisfaction check',
    description: 'Thank customer and request feedback on moving experience'
  },
  {
    name: 'Referral Request',
    type: 'email',
    subject: 'Request for referral',
    description: 'Ask satisfied customer for referrals or online review'
  },
];

export function ActivityForm({ activity, onClose, onSave }: ActivityFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [formData, setFormData] = useState<CreateActivityDto>({
    type: 'call',
    opportunityId: activity?.opportunityId || '',
    customerId: activity?.customerId || '',
    subject: activity?.subject || '',
    description: activity?.description || '',
    outcome: activity?.outcome,
    scheduledDate: activity?.scheduledDate ? new Date(activity.scheduledDate).toISOString().slice(0, 16) : '',
    dueDate: activity?.dueDate ? new Date(activity.dueDate).toISOString().slice(0, 16) : '',
    assignedTo: activity?.assignedTo || user?.id || '',
    notes: activity?.notes || '',
    emailTemplate: activity?.emailTemplate || '',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiUrl()}/api/customers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
    }
  };

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName);
    const template = ACTIVITY_TEMPLATES.find(t => t.name === templateName);
    if (template) {
      setFormData(prev => ({
        ...prev,
        type: template.type,
        subject: template.subject,
        description: template.description,
      }));
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.type) {
      errors.type = 'Activity type is required';
    }

    if (!formData.subject.trim()) {
      errors.subject = 'Subject is required';
    }

    if (!formData.opportunityId && !formData.customerId) {
      errors.opportunityId = 'Either opportunity ID or customer is required';
    }

    if (formData.type === 'follow_up' && !formData.dueDate) {
      errors.dueDate = 'Due date is required for follow-ups';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('accessToken');
      const url = activity
        ? `${getApiUrl()}/api/lead-activities/${activity.id}`
        : `${getApiUrl()}/api/lead-activities`;

      const method = activity ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          scheduledDate: formData.scheduledDate ? new Date(formData.scheduledDate).toISOString() : undefined,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save activity');
      }

      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateActivityDto, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      customer.firstName.toLowerCase().includes(term) ||
      customer.lastName.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term)
    );
  });

  return (
    <div className={styles.modal} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{activity ? 'Edit Activity' : 'Create New Activity'}</h3>
          <button onClick={onClose} type="button">×</button>
        </div>

        {error && (
          <div className={styles.error}>
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formBody}>
            {/* Template Selection */}
            {!activity && (
              <div className={styles.formGroupFull}>
                <label>Quick Templates (Optional)</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  className={styles.select}
                >
                  <option value="">-- Select a template --</option>
                  {ACTIVITY_TEMPLATES.map(template => (
                    <option key={template.name} value={template.name}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={styles.formGrid}>
              {/* Activity Type */}
              <div className={styles.formGroup}>
                <label htmlFor="type">Activity Type *</label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  className={validationErrors.type ? styles.inputError : ''}
                  required
                >
                  <option value="call">📞 Call</option>
                  <option value="email">✉️ Email</option>
                  <option value="meeting">🤝 Meeting</option>
                  <option value="quote_sent">📋 Quote Sent</option>
                  <option value="follow_up">🔔 Follow-up</option>
                </select>
                {validationErrors.type && (
                  <span className={styles.errorText}>{validationErrors.type}</span>
                )}
              </div>

              {/* Outcome (for completed activities) */}
              <div className={styles.formGroup}>
                <label htmlFor="outcome">Outcome</label>
                <select
                  id="outcome"
                  value={formData.outcome || ''}
                  onChange={(e) => handleInputChange('outcome', e.target.value)}
                >
                  <option value="">-- Not completed yet --</option>
                  <option value="successful">Successful</option>
                  <option value="no_answer">No Answer</option>
                  <option value="voicemail">Voicemail</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="not_interested">Not Interested</option>
                  <option value="callback_requested">Callback Requested</option>
                </select>
              </div>

              {/* Subject */}
              <div className={styles.formGroupFull}>
                <label htmlFor="subject">Subject *</label>
                <input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  className={validationErrors.subject ? styles.inputError : ''}
                  placeholder="Brief description of the activity"
                  required
                />
                {validationErrors.subject && (
                  <span className={styles.errorText}>{validationErrors.subject}</span>
                )}
              </div>

              {/* Customer Selection */}
              <div className={styles.formGroupFull}>
                <label htmlFor="customerId">Customer</label>
                <input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={styles.searchInput}
                />
                <select
                  id="customerId"
                  value={formData.customerId}
                  onChange={(e) => handleInputChange('customerId', e.target.value)}
                  className={validationErrors.customerId ? styles.inputError : ''}
                  size={5}
                >
                  <option value="">-- Select customer --</option>
                  {filteredCustomers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName} ({customer.email})
                    </option>
                  ))}
                </select>
                {validationErrors.customerId && (
                  <span className={styles.errorText}>{validationErrors.customerId}</span>
                )}
              </div>

              {/* Opportunity ID */}
              <div className={styles.formGroup}>
                <label htmlFor="opportunityId">Opportunity ID</label>
                <input
                  type="text"
                  id="opportunityId"
                  value={formData.opportunityId}
                  onChange={(e) => handleInputChange('opportunityId', e.target.value)}
                  placeholder="Opportunity identifier"
                />
              </div>

              {/* Scheduled Date */}
              <div className={styles.formGroup}>
                <label htmlFor="scheduledDate">Scheduled Date/Time</label>
                <input
                  type="datetime-local"
                  id="scheduledDate"
                  value={formData.scheduledDate}
                  onChange={(e) => handleInputChange('scheduledDate', e.target.value)}
                />
              </div>

              {/* Due Date */}
              <div className={styles.formGroup}>
                <label htmlFor="dueDate">Due Date/Time {formData.type === 'follow_up' && '*'}</label>
                <input
                  type="datetime-local"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e) => handleInputChange('dueDate', e.target.value)}
                  className={validationErrors.dueDate ? styles.inputError : ''}
                  required={formData.type === 'follow_up'}
                />
                {validationErrors.dueDate && (
                  <span className={styles.errorText}>{validationErrors.dueDate}</span>
                )}
              </div>

              {/* Description */}
              <div className={styles.formGroupFull}>
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Detailed activity description"
                  rows={3}
                />
              </div>

              {/* Notes */}
              <div className={styles.formGroupFull}>
                <label htmlFor="notes">Notes</label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  placeholder="Internal notes and observations"
                  rows={3}
                />
              </div>

              {/* Email Template (for email type) */}
              {formData.type === 'email' && (
                <div className={styles.formGroupFull}>
                  <label htmlFor="emailTemplate">Email Template</label>
                  <select
                    id="emailTemplate"
                    value={formData.emailTemplate}
                    onChange={(e) => handleInputChange('emailTemplate', e.target.value)}
                  >
                    <option value="">-- No template --</option>
                    <option value="initial_contact">Initial Contact</option>
                    <option value="quote_sent">Quote Sent</option>
                    <option value="follow_up">Follow-up</option>
                    <option value="thank_you">Thank You</option>
                    <option value="referral_request">Referral Request</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.secondaryButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : activity ? 'Update Activity' : 'Create Activity'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
