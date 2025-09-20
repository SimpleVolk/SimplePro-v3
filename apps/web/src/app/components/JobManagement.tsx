'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
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

const API_BASE_URL = 'http://localhost:4000/api';

export function JobManagement() {
  const { user: _user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${API_BASE_URL}/jobs`, {
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
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const result = await response.json();
        setJobs(prev => [...prev, result.job]);
        resetForm();
        setShowCreateForm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create job');
      }
    } catch (err) {
      setError('Error creating job');
      console.error('Error creating job:', err);
    }
  };

  const updateJobStatus = async (jobId: string, status: string) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const result = await response.json();
        setJobs(prev =>
          prev.map(job =>
            job.id === jobId ? result.job : job
          )
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

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = !searchTerm ||
      job.jobNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.customerId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    const matchesType = typeFilter === 'all' || job.type === typeFilter;
    const matchesPriority = priorityFilter === 'all' || job.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesType && matchesPriority;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'in_progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      case 'on_hold': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return '#10b981';
      case 'normal': return '#3b82f6';
      case 'high': return '#f59e0b';
      case 'urgent': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
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
                <span className={styles.typeBadge}>{job.type.replace('_', ' ')}</span>
              </div>
            </div>

            <div className={styles.jobInfo}>
              <div className={styles.scheduleInfo}>
                <p><strong>Scheduled:</strong> {formatDate(job.scheduledDate)}</p>
                <p><strong>Time:</strong> {job.scheduledStartTime} - {job.scheduledEndTime}</p>
                <p><strong>Duration:</strong> {job.estimatedDuration} hours</p>
              </div>

              <div className={styles.addressInfo}>
                <div className={styles.address}>
                  <h4>Pickup</h4>
                  <p>{job.pickupAddress.street}</p>
                  <p>{job.pickupAddress.city}, {job.pickupAddress.state} {job.pickupAddress.zipCode}</p>
                  {job.pickupAddress.contactPerson && (
                    <p><strong>Contact:</strong> {job.pickupAddress.contactPerson}</p>
                  )}
                </div>
                <div className={styles.address}>
                  <h4>Delivery</h4>
                  <p>{job.deliveryAddress.street}</p>
                  <p>{job.deliveryAddress.city}, {job.deliveryAddress.state} {job.deliveryAddress.zipCode}</p>
                  {job.deliveryAddress.contactPerson && (
                    <p><strong>Contact:</strong> {job.deliveryAddress.contactPerson}</p>
                  )}
                </div>
              </div>

              <div className={styles.financialInfo}>
                <p><strong>Estimated Cost:</strong> ${job.estimatedCost.toLocaleString()}</p>
                {job.actualCost && (
                  <p><strong>Actual Cost:</strong> ${job.actualCost.toLocaleString()}</p>
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
                  <p><strong>Special Instructions:</strong> {job.specialInstructions}</p>
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
                onClick={() => setSelectedJob(job)}
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

      {showCreateForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Create New Job</h3>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createJob(); }}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Job Title *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Customer ID *</label>
                  <input
                    type="text"
                    required
                    value={formData.customerId}
                    onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Job Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.scheduledStartTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledStartTime: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.scheduledEndTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, scheduledEndTime: e.target.value }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) || 0 }))}
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
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      pickupAddress: { ...prev.pickupAddress, street: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>City *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupAddress.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      pickupAddress: { ...prev.pickupAddress, city: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>State *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupAddress.state}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      pickupAddress: { ...prev.pickupAddress, state: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.pickupAddress.zipCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      pickupAddress: { ...prev.pickupAddress, zipCode: e.target.value }
                    }))}
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
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, street: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>City *</label>
                  <input
                    type="text"
                    required
                    value={formData.deliveryAddress.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, city: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>State *</label>
                  <input
                    type="text"
                    required
                    value={formData.deliveryAddress.state}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, state: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.deliveryAddress.zipCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      deliveryAddress: { ...prev.deliveryAddress, zipCode: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroupFull}>
                  <label>Special Instructions</label>
                  <textarea
                    value={formData.specialInstructions || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowCreateForm(false)} className={styles.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Create Job
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}