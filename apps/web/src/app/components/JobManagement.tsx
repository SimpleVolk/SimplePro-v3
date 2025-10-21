'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../../lib/config';
import styles from './JobManagement.module.css';

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  description?: string;
  type: 'local' | 'long_distance' | 'storage' | 'packing_only';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customerId: string;
  estimateId?: string;
  invoiceId?: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  estimatedDuration: number;
  actualStartTime?: string;
  actualEndTime?: string;
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };
  assignedCrew: CrewAssignment[];
  leadCrew?: string;
  crewNotes?: string;
  estimatedCost: number;
  actualCost?: number;
  laborCost?: number;
  materialsCost?: number;
  transportationCost?: number;
  specialInstructions?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
}

interface CrewAssignment {
  crewMemberId: string;
  role: 'lead' | 'mover' | 'driver' | 'specialist';
  hourlyRate?: number;
  assignedAt: string;
  status: 'assigned' | 'confirmed' | 'checked_in' | 'checked_out' | 'absent';
  checkInTime?: string;
  checkOutTime?: string;
  hoursWorked?: number;
}

interface CreateJobDto {
  title: string;
  description?: string;
  type: 'local' | 'long_distance' | 'storage' | 'packing_only';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  customerId: string;
  estimateId?: string;
  scheduledDate: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  estimatedDuration: number;
  pickupAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country?: string;
    accessNotes?: string;
    contactPerson?: string;
    contactPhone?: string;
  };
  estimatedCost: number;
  specialInstructions?: string;
}

interface EditJobModalProps {
  job: Job;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<Job>) => Promise<void>;
}

interface ViewJobModalProps {
  job: Job;
  onClose: () => void;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName?: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

// interface CrewMember {
//   id: string;
//   firstName: string;
//   lastName: string;
//   role: string;
//   skills: string[];
// }

interface Document {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface ActivityRecord {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  createdBy: string;
}

function EditJobModal({ job, onClose, onUpdate }: EditJobModalProps) {
  const [formData, setFormData] = useState({
    title: job.title,
    description: job.description || '',
    type: job.type,
    priority: job.priority,
    customerId: job.customerId,
    scheduledDate: job.scheduledDate.split('T')[0],
    scheduledStartTime: job.scheduledStartTime,
    scheduledEndTime: job.scheduledEndTime,
    estimatedDuration: job.estimatedDuration,
    pickupAddress: {
      street: job.pickupAddress.street,
      city: job.pickupAddress.city,
      state: job.pickupAddress.state,
      zipCode: job.pickupAddress.zipCode,
      country: job.pickupAddress.country || '',
      accessNotes: job.pickupAddress.accessNotes || '',
      contactPerson: job.pickupAddress.contactPerson || '',
      contactPhone: job.pickupAddress.contactPhone || '',
    },
    deliveryAddress: {
      street: job.deliveryAddress.street,
      city: job.deliveryAddress.city,
      state: job.deliveryAddress.state,
      zipCode: job.deliveryAddress.zipCode,
      country: job.deliveryAddress.country || '',
      accessNotes: job.deliveryAddress.accessNotes || '',
      contactPerson: job.deliveryAddress.contactPerson || '',
      contactPhone: job.deliveryAddress.contactPhone || '',
    },
    estimatedCost: job.estimatedCost,
    actualCost: job.actualCost || 0,
    laborCost: job.laborCost || 0,
    materialsCost: job.materialsCost || 0,
    transportationCost: job.transportationCost || 0,
    specialInstructions: job.specialInstructions || '',
    crewNotes: job.crewNotes || '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);

  // Fixed: XSS Protection - Sanitize user input to prevent script injection
  const sanitizeInput = (input: string): string => {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .trim();
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('customers'), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const result = await response.json();
        setCustomers(result.customers || []);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Basic validation
    if (!formData.title.trim()) {
      setValidationError('Job title is required');
      return;
    }

    if (!formData.customerId) {
      setValidationError('Customer is required');
      return;
    }

    if (!formData.scheduledDate) {
      setValidationError('Scheduled date is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData = {
        title: sanitizeInput(formData.title),
        description: formData.description ? sanitizeInput(formData.description) : undefined,
        type: formData.type,
        priority: formData.priority,
        customerId: formData.customerId,
        scheduledDate: formData.scheduledDate,
        scheduledStartTime: formData.scheduledStartTime,
        scheduledEndTime: formData.scheduledEndTime,
        estimatedDuration: formData.estimatedDuration,
        pickupAddress: {
          street: sanitizeInput(formData.pickupAddress.street),
          city: sanitizeInput(formData.pickupAddress.city),
          state: sanitizeInput(formData.pickupAddress.state),
          zipCode: formData.pickupAddress.zipCode,
          country: formData.pickupAddress.country ? sanitizeInput(formData.pickupAddress.country) : undefined,
          accessNotes: formData.pickupAddress.accessNotes ? sanitizeInput(formData.pickupAddress.accessNotes) : undefined,
          contactPerson: formData.pickupAddress.contactPerson ? sanitizeInput(formData.pickupAddress.contactPerson) : undefined,
          contactPhone: formData.pickupAddress.contactPhone || undefined,
        },
        deliveryAddress: {
          street: sanitizeInput(formData.deliveryAddress.street),
          city: sanitizeInput(formData.deliveryAddress.city),
          state: sanitizeInput(formData.deliveryAddress.state),
          zipCode: formData.deliveryAddress.zipCode,
          country: formData.deliveryAddress.country ? sanitizeInput(formData.deliveryAddress.country) : undefined,
          accessNotes: formData.deliveryAddress.accessNotes ? sanitizeInput(formData.deliveryAddress.accessNotes) : undefined,
          contactPerson: formData.deliveryAddress.contactPerson ? sanitizeInput(formData.deliveryAddress.contactPerson) : undefined,
          contactPhone: formData.deliveryAddress.contactPhone || undefined,
        },
        estimatedCost: formData.estimatedCost,
        actualCost: formData.actualCost || undefined,
        laborCost: formData.laborCost || undefined,
        materialsCost: formData.materialsCost || undefined,
        transportationCost: formData.transportationCost || undefined,
        specialInstructions: formData.specialInstructions ? sanitizeInput(formData.specialInstructions) : undefined,
        crewNotes: formData.crewNotes ? sanitizeInput(formData.crewNotes) : undefined,
      };

      await onUpdate(job.id, updateData);
    } catch (error) {
      setValidationError('Failed to update job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modal} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        <div className={styles.modalHeader}>
          <h3>Edit Job - {job.jobNumber}</h3>
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
              <label>Job Title *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Customer *</label>
              <select
                required
                value={formData.customerId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }))
                }
                disabled={loadingCustomers}
              >
                <option value="">Select Customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.firstName} {customer.lastName}
                    {customer.companyName ? ` - ${customer.companyName}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Job Type *</label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    type: e.target.value as Job['type'],
                  }))
                }
              >
                <option value="local">Local</option>
                <option value="long_distance">Long Distance</option>
                <option value="storage">Storage</option>
                <option value="packing_only">Packing Only</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Priority *</label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    priority: e.target.value as Job['priority'],
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div className={styles.formGroup}>
              <label>Scheduled Date *</label>
              <input
                type="date"
                required
                value={formData.scheduledDate}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    scheduledDate: e.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Start Time *</label>
              <input
                type="time"
                required
                value={formData.scheduledStartTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    scheduledStartTime: e.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>End Time *</label>
              <input
                type="time"
                required
                value={formData.scheduledEndTime}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    scheduledEndTime: e.target.value,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Estimated Duration (hours) *</label>
              <input
                type="number"
                required
                min="0"
                step="0.5"
                value={formData.estimatedDuration}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    estimatedDuration: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className={styles.formGroupFull}>
              <label>Description</label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={2}
              />
            </div>

            <div className={styles.formGroupFull}>
              <h4>Pickup Address</h4>
            </div>

            <div className={styles.formGroup}>
              <label>Street *</label>
              <input
                type="text"
                required
                value={formData.pickupAddress.street}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickupAddress: {
                      ...prev.pickupAddress,
                      street: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>City *</label>
              <input
                type="text"
                required
                value={formData.pickupAddress.city}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickupAddress: {
                      ...prev.pickupAddress,
                      city: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>State *</label>
              <input
                type="text"
                required
                value={formData.pickupAddress.state}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickupAddress: {
                      ...prev.pickupAddress,
                      state: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>ZIP Code *</label>
              <input
                type="text"
                required
                value={formData.pickupAddress.zipCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickupAddress: {
                      ...prev.pickupAddress,
                      zipCode: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Contact Person</label>
              <input
                type="text"
                value={formData.pickupAddress.contactPerson}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickupAddress: {
                      ...prev.pickupAddress,
                      contactPerson: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Contact Phone</label>
              <input
                type="tel"
                value={formData.pickupAddress.contactPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickupAddress: {
                      ...prev.pickupAddress,
                      contactPhone: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroupFull}>
              <label>Access Notes</label>
              <textarea
                value={formData.pickupAddress.accessNotes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    pickupAddress: {
                      ...prev.pickupAddress,
                      accessNotes: e.target.value,
                    },
                  }))
                }
                rows={2}
              />
            </div>

            <div className={styles.formGroupFull}>
              <h4>Delivery Address</h4>
            </div>

            <div className={styles.formGroup}>
              <label>Street *</label>
              <input
                type="text"
                required
                value={formData.deliveryAddress.street}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: {
                      ...prev.deliveryAddress,
                      street: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>City *</label>
              <input
                type="text"
                required
                value={formData.deliveryAddress.city}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: {
                      ...prev.deliveryAddress,
                      city: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>State *</label>
              <input
                type="text"
                required
                value={formData.deliveryAddress.state}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: {
                      ...prev.deliveryAddress,
                      state: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>ZIP Code *</label>
              <input
                type="text"
                required
                value={formData.deliveryAddress.zipCode}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: {
                      ...prev.deliveryAddress,
                      zipCode: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Contact Person</label>
              <input
                type="text"
                value={formData.deliveryAddress.contactPerson}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: {
                      ...prev.deliveryAddress,
                      contactPerson: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Contact Phone</label>
              <input
                type="tel"
                value={formData.deliveryAddress.contactPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: {
                      ...prev.deliveryAddress,
                      contactPhone: e.target.value,
                    },
                  }))
                }
              />
            </div>

            <div className={styles.formGroupFull}>
              <label>Access Notes</label>
              <textarea
                value={formData.deliveryAddress.accessNotes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryAddress: {
                      ...prev.deliveryAddress,
                      accessNotes: e.target.value,
                    },
                  }))
                }
                rows={2}
              />
            </div>

            <div className={styles.formGroupFull}>
              <h4>Financial Information</h4>
            </div>

            <div className={styles.formGroup}>
              <label>Estimated Cost *</label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.estimatedCost}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    estimatedCost: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Actual Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.actualCost}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    actualCost: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Labor Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.laborCost}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    laborCost: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Materials Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.materialsCost}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    materialsCost: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className={styles.formGroup}>
              <label>Transportation Cost</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.transportationCost}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    transportationCost: parseFloat(e.target.value) || 0,
                  }))
                }
              />
            </div>

            <div className={styles.formGroupFull}>
              <label>Special Instructions</label>
              <textarea
                value={formData.specialInstructions}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    specialInstructions: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>

            <div className={styles.formGroupFull}>
              <label>Crew Notes</label>
              <textarea
                value={formData.crewNotes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    crewNotes: e.target.value,
                  }))
                }
                rows={3}
              />
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
              {isSubmitting ? 'Updating...' : 'Update Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ViewJobModal({ job, onClose }: ViewJobModalProps) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    'details' | 'crew' | 'financial' | 'documents' | 'activity'
  >('details');

  useEffect(() => {
    fetchRelatedData();
  }, [job.id]);

  const fetchRelatedData = async () => {
    setLoading(true);
    const token = localStorage.getItem('access_token');

    try {
      // Fetch customer details
      try {
        const customerResponse = await fetch(
          getApiUrl(`customers/${job.customerId}`),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (customerResponse.ok) {
          const result = await customerResponse.json();
          setCustomer(result.customer);
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
      }

      // Fetch job documents
      try {
        const docsResponse = await fetch(
          getApiUrl(`documents?jobId=${job.id}`),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (docsResponse.ok) {
          const result = await docsResponse.json();
          setDocuments(result.documents || []);
        }
      } catch (error) {
        console.error('Error fetching documents:', error);
      }

      // Fetch activity history
      try {
        const activityResponse = await fetch(
          getApiUrl(`lead-activities?jobId=${job.id}`),
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );
        if (activityResponse.ok) {
          const result = await activityResponse.json();
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
      case 'scheduled':
        return '#3b82f6';
      case 'in_progress':
        return '#f59e0b';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      case 'on_hold':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return '#10b981';
      case 'normal':
        return '#3b82f6';
      case 'high':
        return '#f59e0b';
      case 'urgent':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getCrewStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return '#6b7280';
      case 'confirmed':
        return '#3b82f6';
      case 'checked_in':
        return '#10b981';
      case 'checked_out':
        return '#8b5cf6';
      case 'absent':
        return '#ef4444';
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
            <h3>Job Details - {job.jobNumber}</h3>
            <p style={{ margin: '0.25rem 0 0 0', color: '#9ca3af' }}>
              {job.title}
            </p>
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
              className={activeTab === 'crew' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('crew')}
            >
              Crew ({job.assignedCrew?.length || 0})
            </button>
            <button
              className={activeTab === 'financial' ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab('financial')}
            >
              Financial
            </button>
            <button
              className={
                activeTab === 'documents' ? styles.tabActive : styles.tab
              }
              onClick={() => setActiveTab('documents')}
            >
              Documents ({documents.length})
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
                  <h4>Job Information</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Job Number:</span>
                    <span className={styles.detailValue}>{job.jobNumber}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Status:</span>
                    <span
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: getStatusColor(job.status),
                        display: 'inline-block',
                      }}
                    >
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Priority:</span>
                    <span
                      className={styles.statusBadge}
                      style={{
                        backgroundColor: getPriorityColor(job.priority),
                        display: 'inline-block',
                      }}
                    >
                      {job.priority}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Type:</span>
                    <span className={styles.detailValue}>
                      {job.type.replace('_', ' ')}
                    </span>
                  </div>
                  {job.description && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Description:</span>
                      <span className={styles.detailValue}>
                        {job.description}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.detailSection}>
                  <h4>Customer Information</h4>
                  {loading ? (
                    <div className={styles.loadingInline}>
                      Loading customer...
                    </div>
                  ) : customer ? (
                    <>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Name:</span>
                        <span className={styles.detailValue}>
                          {customer.firstName} {customer.lastName}
                        </span>
                      </div>
                      {customer.companyName && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Company:</span>
                          <span className={styles.detailValue}>
                            {customer.companyName}
                          </span>
                        </div>
                      )}
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Email:</span>
                        <span className={styles.detailValue}>
                          {customer.email}
                        </span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Phone:</span>
                        <span className={styles.detailValue}>
                          {customer.phone}
                        </span>
                      </div>
                    </>
                  ) : (
                    <p>Customer information not available</p>
                  )}
                </div>

                <div className={styles.detailSection}>
                  <h4>Schedule</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Date:</span>
                    <span className={styles.detailValue}>
                      {new Date(job.scheduledDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Time:</span>
                    <span className={styles.detailValue}>
                      {job.scheduledStartTime} - {job.scheduledEndTime}
                    </span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Duration:</span>
                    <span className={styles.detailValue}>
                      {job.estimatedDuration} hours
                    </span>
                  </div>
                  {job.actualStartTime && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Actual Start:</span>
                      <span className={styles.detailValue}>
                        {new Date(job.actualStartTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {job.actualEndTime && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Actual End:</span>
                      <span className={styles.detailValue}>
                        {new Date(job.actualEndTime).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.detailSection}>
                  <h4>Pickup Address</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Address:</span>
                    <span className={styles.detailValue}>
                      {job.pickupAddress.street}
                      <br />
                      {job.pickupAddress.city}, {job.pickupAddress.state}{' '}
                      {job.pickupAddress.zipCode}
                    </span>
                  </div>
                  {job.pickupAddress.contactPerson && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Contact:</span>
                      <span className={styles.detailValue}>
                        {job.pickupAddress.contactPerson}
                        {job.pickupAddress.contactPhone &&
                          ` - ${job.pickupAddress.contactPhone}`}
                      </span>
                    </div>
                  )}
                  {job.pickupAddress.accessNotes && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Access Notes:</span>
                      <span className={styles.detailValue}>
                        {job.pickupAddress.accessNotes}
                      </span>
                    </div>
                  )}
                </div>

                <div className={styles.detailSection}>
                  <h4>Delivery Address</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Address:</span>
                    <span className={styles.detailValue}>
                      {job.deliveryAddress.street}
                      <br />
                      {job.deliveryAddress.city}, {job.deliveryAddress.state}{' '}
                      {job.deliveryAddress.zipCode}
                    </span>
                  </div>
                  {job.deliveryAddress.contactPerson && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Contact:</span>
                      <span className={styles.detailValue}>
                        {job.deliveryAddress.contactPerson}
                        {job.deliveryAddress.contactPhone &&
                          ` - ${job.deliveryAddress.contactPhone}`}
                      </span>
                    </div>
                  )}
                  {job.deliveryAddress.accessNotes && (
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Access Notes:</span>
                      <span className={styles.detailValue}>
                        {job.deliveryAddress.accessNotes}
                      </span>
                    </div>
                  )}
                </div>

                {job.specialInstructions && (
                  <div
                    className={styles.detailSection}
                    style={{ gridColumn: '1 / -1' }}
                  >
                    <h4>Special Instructions</h4>
                    <p className={styles.detailValue}>
                      {job.specialInstructions}
                    </p>
                  </div>
                )}

                {job.crewNotes && (
                  <div
                    className={styles.detailSection}
                    style={{ gridColumn: '1 / -1' }}
                  >
                    <h4>Crew Notes</h4>
                    <p className={styles.detailValue}>{job.crewNotes}</p>
                  </div>
                )}

                <div
                  className={styles.detailSection}
                  style={{ gridColumn: '1 / -1' }}
                >
                  <h4>Metadata</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Created:</span>
                      <span className={styles.detailValue}>
                        {new Date(job.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Updated:</span>
                      <span className={styles.detailValue}>
                        {new Date(job.updatedAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'crew' && (
              <div className={styles.relatedList}>
                {job.assignedCrew && job.assignedCrew.length > 0 ? (
                  job.assignedCrew.map((crew, index) => (
                    <div key={index} className={styles.relatedCard}>
                      <div className={styles.relatedCardHeader}>
                        <h4>Crew Member {index + 1}</h4>
                        <span
                          className={styles.statusBadge}
                          style={{
                            backgroundColor: getCrewStatusColor(crew.status),
                          }}
                        >
                          {crew.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className={styles.relatedCardBody}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Role:</span>
                          <span className={styles.detailValue}>
                            {crew.role}
                          </span>
                        </div>
                        {crew.hourlyRate && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>
                              Hourly Rate:
                            </span>
                            <span className={styles.detailValue}>
                              ${crew.hourlyRate.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Assigned:</span>
                          <span className={styles.detailValue}>
                            {new Date(crew.assignedAt).toLocaleString()}
                          </span>
                        </div>
                        {crew.checkInTime && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>
                              Check In:
                            </span>
                            <span className={styles.detailValue}>
                              {new Date(crew.checkInTime).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {crew.checkOutTime && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>
                              Check Out:
                            </span>
                            <span className={styles.detailValue}>
                              {new Date(crew.checkOutTime).toLocaleString()}
                            </span>
                          </div>
                        )}
                        {crew.hoursWorked !== undefined && (
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>
                              Hours Worked:
                            </span>
                            <span className={styles.detailValue}>
                              {crew.hoursWorked.toFixed(2)} hrs
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    No crew members assigned to this job yet.
                  </div>
                )}
              </div>
            )}

            {activeTab === 'financial' && (
              <div className={styles.detailsGrid}>
                <div className={styles.detailSection}>
                  <h4>Estimated Costs</h4>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Total Estimate:</span>
                    <span className={styles.detailValue}>
                      ${job.estimatedCost.toLocaleString()}
                    </span>
                  </div>
                </div>

                {(job.actualCost || job.laborCost || job.materialsCost || job.transportationCost) && (
                  <div className={styles.detailSection}>
                    <h4>Actual Costs</h4>
                    {job.actualCost !== undefined && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Total Actual:</span>
                        <span className={styles.detailValue}>
                          ${job.actualCost.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {job.laborCost !== undefined && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Labor:</span>
                        <span className={styles.detailValue}>
                          ${job.laborCost.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {job.materialsCost !== undefined && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Materials:</span>
                        <span className={styles.detailValue}>
                          ${job.materialsCost.toLocaleString()}
                        </span>
                      </div>
                    )}
                    {job.transportationCost !== undefined && (
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>
                          Transportation:
                        </span>
                        <span className={styles.detailValue}>
                          ${job.transportationCost.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {job.actualCost && (
                  <div className={styles.detailSection}>
                    <h4>Variance</h4>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Difference:</span>
                      <span
                        className={styles.detailValue}
                        style={{
                          color:
                            job.actualCost > job.estimatedCost
                              ? '#ef4444'
                              : '#10b981',
                        }}
                      >
                        {job.actualCost > job.estimatedCost ? '+' : ''}$
                        {(job.actualCost - job.estimatedCost).toLocaleString()}
                      </span>
                    </div>
                    <div className={styles.detailRow}>
                      <span className={styles.detailLabel}>Percentage:</span>
                      <span
                        className={styles.detailValue}
                        style={{
                          color:
                            job.actualCost > job.estimatedCost
                              ? '#ef4444'
                              : '#10b981',
                        }}
                      >
                        {(
                          ((job.actualCost - job.estimatedCost) /
                            job.estimatedCost) *
                          100
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className={styles.relatedList}>
                {loading ? (
                  <div className={styles.loadingInline}>
                    Loading documents...
                  </div>
                ) : documents.length > 0 ? (
                  documents.map((doc) => (
                    <div key={doc.id} className={styles.relatedCard}>
                      <div className={styles.relatedCardHeader}>
                        <h4>{doc.fileName}</h4>
                        <span className={styles.typeBadge}>{doc.fileType}</span>
                      </div>
                      <div className={styles.relatedCardBody}>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Uploaded:</span>
                          <span className={styles.detailValue}>
                            {new Date(doc.uploadedAt).toLocaleString()}
                          </span>
                        </div>
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>By:</span>
                          <span className={styles.detailValue}>
                            {doc.uploadedBy}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    No documents found for this job.
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
                            {new Date(activity.createdAt).toLocaleString()}
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
                    No activity history found for this job.
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

export function JobManagement() {
  const { user: _user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState<CreateJobDto>({
    title: '',
    type: 'local',
    priority: 'normal',
    customerId: '',
    scheduledDate: '',
    scheduledStartTime: '08:00',
    scheduledEndTime: '17:00',
    estimatedDuration: 8,
    pickupAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    deliveryAddress: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
    },
    estimatedCost: 0,
  });

  useEffect(() => {
    fetchJobs();
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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl('jobs'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setJobs(result.jobs || []);
      } else {
        setError('Failed to fetch jobs');
      }
    } catch (err) {
      setError('Error fetching jobs');
      console.error('Error fetching jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  const createJob = async () => {
    // Fixed: Race condition - Prevent multiple simultaneous submissions
    if (isCreating) return;

    try {
      setIsCreating(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl('jobs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setJobs((prev) => [...prev, result.job]);
        resetForm();
        setShowCreateForm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create job');
      }
    } catch (err) {
      setError('Error creating job');
      console.error('Error creating job:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl(`jobs/${jobId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const result = await response.json();
        setJobs((prev) =>
          prev.map((job) => (job.id === jobId ? result.job : job)),
        );
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update job status');
      }
    } catch (err) {
      setError('Error updating job status');
      console.error('Error updating job status:', err);
    }
  };

  const updateJob = async (id: string, updateData: Partial<Job>) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl(`jobs/${id}`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        const result = await response.json();
        setJobs((prev) =>
          prev.map((job) => (job.id === id ? result.job : job)),
        );
        setEditingJob(null);
        setSuccessMessage('Job updated successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to update job');
      }
    } catch (err) {
      setError('Error updating job');
      console.error('Error updating job:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      type: 'local',
      priority: 'normal',
      customerId: '',
      scheduledDate: '',
      scheduledStartTime: '08:00',
      scheduledEndTime: '17:00',
      estimatedDuration: 8,
      pickupAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
      deliveryAddress: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
      estimatedCost: 0,
    });
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchTerm ||
      job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customerId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesType = typeFilter === 'all' || job.type === typeFilter;
    const matchesPriority =
      priorityFilter === 'all' || job.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#3b82f6';
      case 'in_progress':
        return '#f59e0b';
      case 'completed':
        return '#10b981';
      case 'cancelled':
        return '#ef4444';
      case 'on_hold':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return '#10b981';
      case 'normal':
        return '#3b82f6';
      case 'high':
        return '#f59e0b';
      case 'urgent':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading jobs...</p>
      </div>
    );
  }

  return (
    <div className={styles.jobManagement}>
      <div className={styles.header}>
        <h2>Job Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className={styles.primaryButton}
        >
          Create New Job
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
          placeholder="Search jobs..."
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
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="on_hold">On Hold</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Types</option>
          <option value="local">Local</option>
          <option value="long_distance">Long Distance</option>
          <option value="storage">Storage</option>
          <option value="packing_only">Packing Only</option>
        </select>

        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className={styles.filterSelect}
        >
          <option value="all">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div className={styles.jobGrid}>
        {filteredJobs.map((job) => (
          <div key={job.id} className={styles.jobCard}>
            <div className={styles.jobHeader}>
              <div className={styles.jobIdentifier}>
                <h3>{job.jobNumber}</h3>
                <p className={styles.jobTitle}>{job.title}</p>
              </div>
              <div className={styles.jobBadges}>
                <span
                  className={styles.statusBadge}
                  style={{ backgroundColor: getStatusColor(job.status) }}
                >
                  {job.status.replace('_', ' ')}
                </span>
                <span
                  className={styles.priorityBadge}
                  style={{ backgroundColor: getPriorityColor(job.priority) }}
                >
                  {job.priority}
                </span>
                <span className={styles.typeBadge}>
                  {job.type.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className={styles.jobInfo}>
              <div className={styles.scheduleInfo}>
                <p>
                  <strong>Scheduled:</strong> {formatDate(job.scheduledDate)}
                </p>
                <p>
                  <strong>Time:</strong> {job.scheduledStartTime} -{' '}
                  {job.scheduledEndTime}
                </p>
                <p>
                  <strong>Duration:</strong> {job.estimatedDuration} hours
                </p>
              </div>

              <div className={styles.addressInfo}>
                <div className={styles.address}>
                  <h4>Pickup</h4>
                  <p>{job.pickupAddress.street}</p>
                  <p>
                    {job.pickupAddress.city}, {job.pickupAddress.state}{' '}
                    {job.pickupAddress.zipCode}
                  </p>
                  {job.pickupAddress.contactPerson && (
                    <p>
                      <strong>Contact:</strong>{' '}
                      {job.pickupAddress.contactPerson}
                    </p>
                  )}
                </div>
                <div className={styles.address}>
                  <h4>Delivery</h4>
                  <p>{job.deliveryAddress.street}</p>
                  <p>
                    {job.deliveryAddress.city}, {job.deliveryAddress.state}{' '}
                    {job.deliveryAddress.zipCode}
                  </p>
                  {job.deliveryAddress.contactPerson && (
                    <p>
                      <strong>Contact:</strong>{' '}
                      {job.deliveryAddress.contactPerson}
                    </p>
                  )}
                </div>
              </div>

              <div className={styles.financialInfo}>
                <p>
                  <strong>Estimated Cost:</strong> $
                  {job.estimatedCost.toLocaleString()}
                </p>
                {job.actualCost && (
                  <p>
                    <strong>Actual Cost:</strong> $
                    {job.actualCost.toLocaleString()}
                  </p>
                )}
              </div>

              {job.assignedCrew && job.assignedCrew.length > 0 && (
                <div className={styles.crewInfo}>
                  <h4>Assigned Crew ({job.assignedCrew.length})</h4>
                  <div className={styles.crewList}>
                    {job.assignedCrew.map((crew, index) => (
                      <span key={index} className={styles.crewMember}>
                        {crew.role} - {crew.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {job.specialInstructions && (
                <div className={styles.instructions}>
                  <p>
                    <strong>Special Instructions:</strong>{' '}
                    {job.specialInstructions}
                  </p>
                </div>
              )}
            </div>

            <div className={styles.jobActions}>
              {job.status === 'scheduled' && (
                <button
                  onClick={() => updateJobStatus(job.id, 'in_progress')}
                  className={styles.primaryButton}
                >
                  Start Job
                </button>
              )}
              {job.status === 'in_progress' && (
                <button
                  onClick={() => updateJobStatus(job.id, 'completed')}
                  className={styles.successButton}
                >
                  Complete Job
                </button>
              )}
              {(job.status === 'scheduled' || job.status === 'in_progress') && (
                <button
                  onClick={() => updateJobStatus(job.id, 'on_hold')}
                  className={styles.warningButton}
                >
                  Put on Hold
                </button>
              )}
              <button
                onClick={() => setEditingJob(job)}
                className={styles.secondaryButton}
              >
                Edit
              </button>
              <button
                onClick={() => setViewingJob(job)}
                className={styles.secondaryButton}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredJobs.length === 0 && !loading && (
        <div className={styles.emptyState}>
          <p>No jobs found matching your criteria.</p>
        </div>
      )}

      {editingJob && (
        <EditJobModal
          job={editingJob}
          onClose={() => setEditingJob(null)}
          onUpdate={updateJob}
        />
      )}

      {viewingJob && (
        <ViewJobModal
          job={viewingJob}
          onClose={() => setViewingJob(null)}
        />
      )}

      {showCreateForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Create New Job</h3>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                createJob();
              }}
            >
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Customer ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerId}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        customerId: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Job Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value as any,
                      }))
                    }
                  >
                    <option value="local">Local</option>
                    <option value="long_distance">Long Distance</option>
                    <option value="storage">Storage</option>
                    <option value="packing_only">Packing Only</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Priority *</label>
                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        priority: e.target.value as any,
                      }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.scheduledDate}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduledDate: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.scheduledStartTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduledStartTime: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.scheduledEndTime}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        scheduledEndTime: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Estimated Cost *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.estimatedCost}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        estimatedCost: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <h4>Pickup Address</h4>
                </div>

                <div className={styles.formGroup}>
                  <label>Street *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupAddress.street}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pickupAddress: {
                          ...prev.pickupAddress,
                          street: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>City *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupAddress.city}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pickupAddress: {
                          ...prev.pickupAddress,
                          city: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>State *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupAddress.state}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pickupAddress: {
                          ...prev.pickupAddress,
                          state: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupAddress.zipCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        pickupAddress: {
                          ...prev.pickupAddress,
                          zipCode: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <h4>Delivery Address</h4>
                </div>

                <div className={styles.formGroup}>
                  <label>Street *</label>
                  <input
                    type="text"
                    required
                    value={formData.deliveryAddress.street}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryAddress: {
                          ...prev.deliveryAddress,
                          street: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>City *</label>
                  <input
                    type="text"
                    required
                    value={formData.deliveryAddress.city}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryAddress: {
                          ...prev.deliveryAddress,
                          city: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>State *</label>
                  <input
                    type="text"
                    required
                    value={formData.deliveryAddress.state}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryAddress: {
                          ...prev.deliveryAddress,
                          state: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.deliveryAddress.zipCode}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        deliveryAddress: {
                          ...prev.deliveryAddress,
                          zipCode: e.target.value,
                        },
                      }))
                    }
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label>Special Instructions</label>
                  <textarea
                    value={formData.specialInstructions || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        specialInstructions: e.target.value,
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
                  {isCreating ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
