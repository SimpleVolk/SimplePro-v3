'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../../lib/config';
import styles from './CustomerManagement.module.css';

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  type: 'residential' | 'commercial';
  status: 'lead' | 'prospect' | 'active' | 'inactive';
  source:
    | 'website'
    | 'referral'
    | 'advertising'
    | 'social_media'
    | 'partner'
    | 'other';
  companyName?: string;
  businessLicense?: string;
  preferredContactMethod: 'email' | 'phone' | 'text';
  communicationPreferences?: {
    allowMarketing: boolean;
    allowSms: boolean;
    allowEmail: boolean;
  };
  notes?: string;
  leadScore?: number;
  tags?: string[];
  assignedSalesRep?: string;
  referredBy?: {
    customerId?: string;
    partnerName?: string;
    source: string;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastContactDate?: string;
  estimates?: string[];
  jobs?: string[];
}

interface CreateCustomerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
  };
  type: 'residential' | 'commercial';
  source:
    | 'website'
    | 'referral'
    | 'advertising'
    | 'social_media'
    | 'partner'
    | 'other';
  companyName?: string;
  businessLicense?: string;
  preferredContactMethod: 'email' | 'phone' | 'text';
  communicationPreferences?: {
    allowMarketing: boolean;
    allowSms: boolean;
    allowEmail: boolean;
  };
  notes?: string;
  leadScore?: number;
  tags?: string[];
  assignedSalesRep?: string;
}

interface EditCustomerModalProps {
  customer: Customer;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Customer>) => Promise<void>;
}

interface ViewCustomerModalProps {
  customer: Customer;
  onClose: () => void;
}

interface RelatedEstimate {
  id: string;
  estimateNumber: string;
  totalCost: number;
  status: string;
  createdAt: string;
}

interface RelatedJob {
  id: string;
  jobNumber: string;
  title: string;
  status: string;
  scheduledDate: string;
}

interface ActivityRecord {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

function EditCustomerModal({
  customer,
  onClose,
  onUpdate,
}: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    alternatePhone: customer.alternatePhone || '',
    address: {
      street: customer.address.street,
      city: customer.address.city,
      state: customer.address.state,
      zipCode: customer.address.zipCode,
      country: customer.address.country || '',
    },
    type: customer.type,
    status: customer.status,
    source: customer.source,
    companyName: customer.companyName || '',
    businessLicense: customer.businessLicense || '',
    preferredContactMethod: customer.preferredContactMethod,
    communicationPreferences: customer.communicationPreferences || {
      allowMarketing: true,
      allowSms: true,
      allowEmail: true,
    },
    notes: customer.notes || '',
    leadScore: customer.leadScore || 0,
    tags: customer.tags?.join(', ') || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Fixed: XSS Protection - Sanitize user input to prevent script injection
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .trim();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic validation
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setValidationError('First name and last name are required');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setValidationError('Valid email is required');
      return;
    }

    if (!formData.phone.trim()) {
      setValidationError('Phone number is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData = {
        firstName: sanitizeInput(formData.firstName),
        lastName: sanitizeInput(formData.lastName),
        email: formData.email,
        phone: formData.phone,
        alternatePhone: formData.alternatePhone || undefined,
        address: {
          street: sanitizeInput(formData.address.street),
          city: sanitizeInput(formData.address.city),
          state: sanitizeInput(formData.address.state),
          zipCode: formData.address.zipCode,
          country: formData.address.country ? sanitizeInput(formData.address.country) : undefined,
        },
        type: formData.type,
        status: formData.status,
        source: formData.source,
        companyName: formData.companyName ? sanitizeInput(formData.companyName) : undefined,
        businessLicense: formData.businessLicense || undefined,
        preferredContactMethod: formData.preferredContactMethod,
        communicationPreferences: formData.communicationPreferences,
        notes: formData.notes ? sanitizeInput(formData.notes) : undefined,
        leadScore: formData.leadScore || undefined,
        tags: formData.tags
          ? formData.tags.split(',').map((tag) => sanitizeInput(tag))
          : undefined,
      };

      await onUpdate(customer.id, updateData);
    } catch (error) {
      setValidationError('Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3>Edit Customer</h3>
          <button onClick={onClose}>×</button>
        </div>

        {validationError && (
          <div className={styles.error} style={{ margin: '1rem 1.5rem 0' }}>
            {validationError}
            <button onClick={() => setValidationError(null)}>×</button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, lastName: e.target.value }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Phone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, phone: e.target.value }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Alternate Phone</label>
              <input
                type="tel"
                value={formData.alternatePhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    alternatePhone: e.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Status *</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: e.target.value as Customer['status'],
                  }))
                }
              >
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Street Address *</label>
              <input
                type="text"
                required
                value={formData.address.street}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, street: e.target.value },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>City *</label>
              <input
                type="text"
                required
                value={formData.address.city}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, city: e.target.value },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>State *</label>
              <input
                type="text"
                required
                value={formData.address.state}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, state: e.target.value },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>ZIP Code *</label>
              <input
                type="text"
                required
                value={formData.address.zipCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    address: { ...prev.address, zipCode: e.target.value },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Customer Type *</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as 'residential' | 'commercial',
                  }))
                }
              >
                <option value="residential">Residential</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Source *</label>
              <select
                value={formData.source}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    source: e.target.value as Customer['source'],
                  }))
                }
              >
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="advertising">Advertising</option>
                <option value="social_media">Social Media</option>
                <option value="partner">Partner</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Preferred Contact Method *</label>
              <select
                value={formData.preferredContactMethod}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    preferredContactMethod: e.target.value as
                      | 'email'
                      | 'phone'
                      | 'text',
                  }))
                }
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="text">Text</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Lead Score</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.leadScore}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    leadScore: parseInt(e.target.value) || 0,
                  }))
                }
              />
            </div>

            {formData.type === 'commercial' && (
              <>
                <div className={styles.formGroup}>
                  <label>Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        companyName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Business License</label>
                  <input
                    type="text"
                    value={formData.businessLicense}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        businessLicense: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}

            <div className={styles.formGroupFull}>
              <label>Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, tags: e.target.value }))
                }
                placeholder="VIP, Corporate, Repeat Customer"
              />
            </div>

            <div className={styles.formGroupFull}>
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className={styles.formGroupFull}>
              <div className={styles.checkboxGroup}>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.communicationPreferences.allowEmail}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        communicationPreferences: {
                          ...prev.communicationPreferences,
                          allowEmail: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>Allow Email</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.communicationPreferences.allowSms}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        communicationPreferences: {
                          ...prev.communicationPreferences,
                          allowSms: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>Allow SMS</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={formData.communicationPreferences.allowMarketing}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        communicationPreferences: {
                          ...prev.communicationPreferences,
                          allowMarketing: e.target.checked,
                        },
                      }))
                    }
                  />
                  <span>Allow Marketing</span>
                </label>
              </div>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onClose}
              className={styles.secondaryButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Updating...' : 'Update Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewCustomerModal({ customer, onClose }: ViewCustomerModalProps) {
  const [relatedEstimates, setRelatedEstimates] = useState<RelatedEstimate[]>(
    [],
  );
  const [relatedJobs, setRelatedJobs] = useState<RelatedJob[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'estimates' | 'jobs' | 'activity'>('details');

  useEffect(() => {
    fetchRelatedData();
  }, [customer.id]);

  const fetchRelatedData = async () => {
    setLoading(true);
    const token = localStorage.getItem('access_token');

    try {
      // Fetch estimates
      if (customer.estimates && customer.estimates.length > 0) {
        const estimatesPromises = customer.estimates.map(async (estimateId) => {
          try {
            const response = await fetch(getApiUrl(`estimates/${estimateId}`), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              const result = await response.json();
              return result.estimate;
            }
          } catch (error) {
            console.error(`Error fetching estimate ${estimateId}:`, error);
          }
          return null;
        });

        const estimates = (await Promise.all(estimatesPromises)).filter(
          Boolean,
        );
        setRelatedEstimates(estimates);
      }

      // Fetch jobs
      if (customer.jobs && customer.jobs.length > 0) {
        const jobsPromises = customer.jobs.map(async (jobId) => {
          try {
            const response = await fetch(getApiUrl(`jobs/${jobId}`), {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (response.ok) {
              const result = await response.json();
              return result.job;
            }
          } catch (error) {
            console.error(`Error fetching job ${jobId}:`, error);
          }
          return null;
        });

        const jobs = (await Promise.all(jobsPromises)).filter(Boolean);
        setRelatedJobs(jobs);
      }

      // Fetch activity history
      try {
        const response = await fetch(
          getApiUrl(`lead-activities?customerId=${customer.id}`),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (response.ok) {
          const result = await response.json();
          setActivities(result.activities || []);
        }
      } catch (error) {
        console.error('Error fetching activities:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lead':
        return '#f59e0b';
      case 'prospect':
        return '#3b82f6';
      case 'active':
        return '#10b981';
      case 'inactive':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div
        className={styles.modalContentLarge}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div>
            <h3>
              {customer.firstName} {customer.lastName}
            </h3>
            {customer.companyName && (
              <p style={{ margin: '0.25rem 0 0 0', color: '#9ca3af' }}>
                {customer.companyName}
              </p>
            )}
          </div>
          <button onClick={onClose}>×</button>
        </div>

        <div className={styles.tabContainer}>
          <div className={styles.tabs}>
            <button
              className={activeTab === 'details' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('details')}
            >
              Details
            </button>
            <button
              className={activeTab === 'estimates' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('estimates')}
            >
              Estimates ({customer.estimates?.length || 0})
            </button>
            <button
              className={activeTab === 'jobs' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('jobs')}
            >
              Jobs ({customer.jobs?.length || 0})
            </button>
            <button
              className={activeTab === 'activity' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('activity')}
            >
              Activity
            </button>
          </div>

          <div className={styles.tabContent}>
            {activeTab === 'details' && (
              <div className={styles.detailsGrid}>
                <div className={styles.detailSection}>
                  <h4>Contact Information</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Email:</span>
                    <span className={styles.detailValue}>{customer.email}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Phone:</span>
                    <span className={styles.detailValue}>{customer.phone}</span>
                  </div>
                  {customer.alternatePhone && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Alternate Phone:</span>
                      <span className={styles.detailValue}>
                        {customer.alternatePhone}
                      </span>
                    </div>
                  )}
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Preferred Contact:</span>
                    <span className={styles.detailValue}>
                      {customer.preferredContactMethod}
                    </span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h4>Address</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Street:</span>
                    <span className={styles.detailValue}>
                      {customer.address.street}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>City:</span>
                    <span className={styles.detailValue}>
                      {customer.address.city}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>State:</span>
                    <span className={styles.detailValue}>
                      {customer.address.state}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>ZIP:</span>
                    <span className={styles.detailValue}>
                      {customer.address.zipCode}
                    </span>
                  </div>
                </div>

                <div className={styles.detailSection}>
                  <h4>Customer Info</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Status:</span>
                    <span
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: getStatusColor(customer.status),
                        display: 'inline-block',
                      }}
                    >
                      {customer.status}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Type:</span>
                    <span className={styles.detailValue}>{customer.type}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Source:</span>
                    <span className={styles.detailValue}>{customer.source}</span>
                  </div>
                  {customer.leadScore !== undefined && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Lead Score:</span>
                      <span className={styles.detailValue}>
                        {customer.leadScore}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.detailSection}>
                  <h4>Dates</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Created:</span>
                    <span className={styles.detailValue}>
                      {new Date(customer.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Updated:</span>
                    <span className={styles.detailValue}>
                      {new Date(customer.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  {customer.lastContactDate && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Last Contact:</span>
                      <span className={styles.detailValue}>
                        {new Date(customer.lastContactDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {customer.notes && (
                  <div className={styles.detailSection} style={{ gridColumn: '1 / -1' }}>
                    <h4>Notes</h4>
                    <p className={styles.detailValue}>{customer.notes}</p>
                  </div>
                )}

                {customer.tags && customer.tags.length > 0 && (
                  <div className={styles.detailSection} style={{ gridColumn: '1 / -1' }}>
                    <h4>Tags</h4>
                    <div className={styles.tags}>
                      {customer.tags.map((tag, index) => (
                        <span key={index} className={styles.tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {customer.communicationPreferences && (
                  <div className={styles.detailSection} style={{ gridColumn: '1 / -1' }}>
                    <h4>Communication Preferences</h4>
                    <div className={styles.preferencesList}>
                      <div className={styles.preferenceItem}>
                        <span
                          className={
                            customer.communicationPreferences.allowEmail
                              ? styles.preferenceEnabled
                              : styles.preferenceDisabled
                          }
                        >
                          {customer.communicationPreferences.allowEmail ? '✓' : '✗'}
                        </span>
                        <span>Email</span>
                      </div>
                      <div className={styles.preferenceItem}>
                        <span
                          className={
                            customer.communicationPreferences.allowSms
                              ? styles.preferenceEnabled
                              : styles.preferenceDisabled
                          }
                        >
                          {customer.communicationPreferences.allowSms ? '✓' : '✗'}
                        </span>
                        <span>SMS</span>
                      </div>
                      <div className={styles.preferenceItem}>
                        <span
                          className={
                            customer.communicationPreferences.allowMarketing
                              ? styles.preferenceEnabled
                              : styles.preferenceDisabled
                          }
                        >
                          {customer.communicationPreferences.allowMarketing
                            ? '✓'
                            : '✗'}
                        </span>
                        <span>Marketing</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'estimates' && (
              <div className={styles.relatedList}>
                {loading ? (
                  <div className={styles.loadingInline}>Loading estimates...</div>
                ) : relatedEstimates.length > 0 ? (
                  relatedEstimates.map((estimate) => (
                    <div key={estimate.id} className={styles.relatedCard}>
                      <div className={styles.relatedCardHeader}>
                        <h4>Estimate #{estimate.estimateNumber}</h4>
                        <span
                          className={styles.statusBadge}
                          style={{
                            backgroundColor:
                              estimate.status === 'accepted'
                                ? '#10b981'
                                : estimate.status === 'rejected'
                                  ? '#ef4444'
                                  : '#f59e0b',
                          }}
                        >
                          {estimate.status}
                        </span>
                      </div>
                      <div className={styles.relatedCardBody}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Total Cost:</span>
                          <span className={styles.detailValue}>
                            ${estimate.totalCost.toLocaleString()}
                          </span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Created:</span>
                          <span className={styles.detailValue}>
                            {new Date(estimate.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    No estimates found for this customer.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'jobs' && (
              <div className={styles.relatedList}>
                {loading ? (
                  <div className={styles.loadingInline}>Loading jobs...</div>
                ) : relatedJobs.length > 0 ? (
                  relatedJobs.map((job) => (
                    <div key={job.id} className={styles.relatedCard}>
                      <div className={styles.relatedCardHeader}>
                        <h4>Job #{job.jobNumber}</h4>
                        <span
                          className={styles.statusBadge}
                          style={{
                            backgroundColor:
                              job.status === 'completed'
                                ? '#10b981'
                                : job.status === 'in_progress'
                                  ? '#3b82f6'
                                  : job.status === 'cancelled'
                                    ? '#ef4444'
                                    : '#f59e0b',
                          }}
                        >
                          {job.status}
                        </span>
                      </div>
                      <div className={styles.relatedCardBody}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Title:</span>
                          <span className={styles.detailValue}>{job.title}</span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Scheduled:</span>
                          <span className={styles.detailValue}>
                            {new Date(job.scheduledDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    No jobs found for this customer.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className={styles.activityList}>
                {loading ? (
                  <div className={styles.loadingInline}>Loading activity...</div>
                ) : activities.length > 0 ? (
                  activities.map((activity) => (
                    <div key={activity.id} className={styles.activityItem}>
                      <div className={styles.activityDot}></div>
                      <div className={styles.activityContent}>
                        <div className={styles.activityHeader}>
                          <span className={styles.activityType}>
                            {activity.type}
                          </span>
                          <span className={styles.activityDate}>
                            {new Date(activity.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={styles.activityDescription}>
                          {activity.description}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    No activity history found for this customer.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.primaryButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerManagement() {
  const { user: _user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(
    null,
  );
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(
    null,
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<CreateCustomerDto>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    type: 'residential',
    source: 'website',
    preferredContactMethod: 'email',
    communicationPreferences: {
      allowMarketing: true,
      allowSms: true,
      allowEmail: true,
    },
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  // Fixed: Memory leak - Clear success message timeout on unmount
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    if (successMessage) {
      timeoutId = setTimeout(() => setSuccessMessage(null), 3000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [successMessage]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl('customers'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCustomers(result.customers || []);
      } else {
        setError('Failed to fetch customers');
      }
    } catch (err) {
      setError('Error fetching customers');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async () => {
    // Fixed: Race condition - Prevent multiple simultaneous submissions
    if (isCreating) return;

    try {
      setIsCreating(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl('customers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setCustomers((prev) => [...prev, result.customer]);
        resetForm();
        setShowCreateForm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create customer');
      }
    } catch (err) {
      setError('Error creating customer');
      console.error('Error creating customer:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const updateLastContact = async (customerId: string) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(
        getApiUrl(`customers/${customerId}/contact`),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        const result = await response.json();
        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === customerId ? result.customer : customer,
          ),
        );
      } else {
        setError('Failed to update contact date');
      }
    } catch (err) {
      setError('Error updating contact date');
      console.error('Error updating contact date:', err);
    }
  };

  const updateCustomer = async (id: string, updateData: Partial<Customer>) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl(`customers/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
        setCustomers((prev) =>
          prev.map((customer) =>
            customer.id === id ? result.customer : customer,
          ),
        );
        setEditingCustomer(null);
        setSuccessMessage('Customer updated successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update customer');
      }
    } catch (err) {
      setError('Error updating customer');
      console.error('Error updating customer:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
      type: 'residential',
      source: 'website',
      preferredContactMethod: 'email',
      communicationPreferences: {
        allowMarketing: true,
        allowSms: true,
        allowEmail: true,
      },
    });
  };

  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch =
      !searchTerm ||
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.companyName &&
        customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || customer.status === statusFilter;
    const matchesType = typeFilter === 'all' || customer.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lead':
        return '#f59e0b';
      case 'prospect':
        return '#3b82f6';
      case 'active':
        return '#10b981';
      case 'inactive':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading customers...</p>
      </div>
    );
  }

  return (
    <div className={styles.customerManagement}>
      <div className={styles.header}>
        <h2>Customer Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className={styles.primaryButton}
        >
          Add New Customer
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          {error}
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {successMessage && (
        <div className={styles.success}>
          {successMessage}
          <button onClick={() => setSuccessMessage(null)}>×</button>
        </div>
      )}

      <div className={styles.filters}>
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Statuses</option>
          <option value="lead">Lead</option>
          <option value="prospect">Prospect</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="residential">Residential</option>
          <option value="commercial">Commercial</option>
        </select>
      </div>

      <div className={styles.customerGrid}>
        {filteredCustomers.map((customer) => (
          <div key={customer.id} className={styles.customerCard}>
            <div className={styles.customerHeader}>
              <div className={styles.customerName}>
                <h3>
                  {customer.firstName} {customer.lastName}
                </h3>
                {customer.companyName && (
                  <p className={styles.companyName}>{customer.companyName}</p>
                )}
              </div>
              <div className={styles.customerStatus}>
                <span
                  className={styles.statusBadge}
                  style={{ backgroundColor: getStatusColor(customer.status) }}
                >
                  {customer.status}
                </span>
                <span className={styles.typeBadge}>{customer.type}</span>
              </div>
            </div>

            <div className={styles.customerInfo}>
              <div className={styles.contactInfo}>
                <p>
                  <strong>Email:</strong> {customer.email}
                </p>
                <p>
                  <strong>Phone:</strong> {customer.phone}
                </p>
                <p>
                  <strong>Address:</strong> {customer.address.street},{' '}
                  {customer.address.city}, {customer.address.state}{' '}
                  {customer.address.zipCode}
                </p>
              </div>

              <div className={styles.metaInfo}>
                <p>
                  <strong>Source:</strong> {customer.source}
                </p>
                <p>
                  <strong>Contact Method:</strong>{' '}
                  {customer.preferredContactMethod}
                </p>
                {customer.leadScore && (
                  <p>
                    <strong>Lead Score:</strong> {customer.leadScore}
                  </p>
                )}
                {customer.lastContactDate && (
                  <p>
                    <strong>Last Contact:</strong>{' '}
                    {new Date(customer.lastContactDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {customer.notes && (
                <div className={styles.notes}>
                  <p>
                    <strong>Notes:</strong> {customer.notes}
                  </p>
                </div>
              )}

              {customer.tags && customer.tags.length > 0 && (
                <div className={styles.tags}>
                  {customer.tags.map((tag, index) => (
                    <span key={index} className={styles.tag}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.customerActions}>
              <button
                onClick={() => updateLastContact(customer.id)}
                className={styles.secondaryButton}
              >
                Update Contact
              </button>
              <button
                onClick={() => setEditingCustomer(customer)}
                className={styles.secondaryButton}
              >
                Edit
              </button>
              <button
                onClick={() => setViewingCustomer(customer)}
                className={styles.primaryButton}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredCustomers.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <p>No customers found matching your criteria.</p>
        </div>
      )}

      {editingCustomer && (
        <EditCustomerModal
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onUpdate={updateCustomer}
        />
      )}

      {viewingCustomer && (
        <ViewCustomerModal
          customer={viewingCustomer}
          onClose={() => setViewingCustomer(null)}
        />
      )}

      {showCreateForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Add New Customer</h3>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createCustomer();
              }}
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        firstName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        lastName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Street Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.street}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: { ...prev.address, street: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>City *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: { ...prev.address, city: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>State *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: { ...prev.address, state: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.zipCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: { ...prev.address, zipCode: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Customer Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value as 'residential' | 'commercial',
                      }))
                    }
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Source *</label>
                  <select
                    value={formData.source}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        source: e.target.value as any,
                      }))
                    }
                  >
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="advertising">Advertising</option>
                    <option value="social_media">Social Media</option>
                    <option value="partner">Partner</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Preferred Contact Method *</label>
                  <select
                    value={formData.preferredContactMethod}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        preferredContactMethod: e.target.value as
                          | 'email'
                          | 'phone'
                          | 'text',
                      }))
                    }
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="text">Text</option>
                  </select>
                </div>

                {formData.type === 'commercial' && (
                  <div className={styles.formGroup}>
                    <label>Company Name</label>
                    <input
                      type="text"
                      value={formData.companyName || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          companyName: e.target.value,
                        }))
                      }
                    />
                  </div>
                )}

                <div className={styles.formGroupFull}>
                  <label>Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    rows={3}
                  />
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
                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={isCreating}
                >
                  {isCreating ? 'Creating...' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
