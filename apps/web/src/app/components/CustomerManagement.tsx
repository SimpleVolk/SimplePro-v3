'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '@/lib/config';
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
  source: 'website' | 'referral' | 'advertising' | 'social_media' | 'partner' | 'other';
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
  source: 'website' | 'referral' | 'advertising' | 'social_media' | 'partner' | 'other';
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


export function CustomerManagement() {
  const { user: _user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [_editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

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
    try {
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
        setCustomers(prev => [...prev, result.customer]);
        resetForm();
        setShowCreateForm(false);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to create customer');
      }
    } catch (err) {
      setError('Error creating customer');
      console.error('Error creating customer:', err);
    }
  };


  const updateLastContact = async (customerId: string) => {
    try {
      const token = localStorage.getItem('access_token');

      const response = await fetch(getApiUrl(`customers/${customerId}/contact`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setCustomers(prev =>
          prev.map(customer =>
            customer.id === customerId ? result.customer : customer
          )
        );
      } else {
        setError('Failed to update contact date');
      }
    } catch (err) {
      setError('Error updating contact date');
      console.error('Error updating contact date:', err);
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

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm ||
      customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.companyName && customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    const matchesType = typeFilter === 'all' || customer.type === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'lead': return '#f59e0b';
      case 'prospect': return '#3b82f6';
      case 'active': return '#10b981';
      case 'inactive': return '#6b7280';
      default: return '#6b7280';
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
                <h3>{customer.firstName} {customer.lastName}</h3>
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
                <p><strong>Email:</strong> {customer.email}</p>
                <p><strong>Phone:</strong> {customer.phone}</p>
                <p><strong>Address:</strong> {customer.address.street}, {customer.address.city}, {customer.address.state} {customer.address.zipCode}</p>
              </div>

              <div className={styles.metaInfo}>
                <p><strong>Source:</strong> {customer.source}</p>
                <p><strong>Contact Method:</strong> {customer.preferredContactMethod}</p>
                {customer.leadScore && <p><strong>Lead Score:</strong> {customer.leadScore}</p>}
                {customer.lastContactDate && (
                  <p><strong>Last Contact:</strong> {new Date(customer.lastContactDate).toLocaleDateString()}</p>
                )}
              </div>

              {customer.notes && (
                <div className={styles.notes}>
                  <p><strong>Notes:</strong> {customer.notes}</p>
                </div>
              )}

              {customer.tags && customer.tags.length > 0 && (
                <div className={styles.tags}>
                  {customer.tags.map((tag, index) => (
                    <span key={index} className={styles.tag}>{tag}</span>
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
              <button className={styles.primaryButton}>
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

      {showCreateForm && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Add New Customer</h3>
              <button onClick={() => setShowCreateForm(false)}>×</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); createCustomer(); }}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>First Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Last Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Street Address *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.street}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, street: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>City *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.city}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, city: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>State *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.state}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, state: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>ZIP Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.address.zipCode}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      address: { ...prev.address, zipCode: e.target.value }
                    }))}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Customer Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as 'residential' | 'commercial' }))}
                  >
                    <option value="residential">Residential</option>
                    <option value="commercial">Commercial</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Source *</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData(prev => ({ ...prev, source: e.target.value as any }))}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, preferredContactMethod: e.target.value as 'email' | 'phone' | 'text' }))}
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
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    />
                  </div>
                )}

                <div className={styles.formGroupFull}>
                  <label>Notes</label>
                  <textarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setShowCreateForm(false)} className={styles.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Create Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}