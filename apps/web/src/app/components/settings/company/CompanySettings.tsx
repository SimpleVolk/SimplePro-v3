'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from './CompanySettings.module.css';

interface CompanyInfo {
  name: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website: string;
  };
  business: {
    licenseNumber: string;
    insuranceInfo: string;
    dotNumber: string;
    mcNumber: string;
  };
  settings: {
    timezone: string;
    currency: string;
    dateFormat: string;
    businessHours: {
      monday: { open: string; close: string; enabled: boolean };
      tuesday: { open: string; close: string; enabled: boolean };
      wednesday: { open: string; close: string; enabled: boolean };
      thursday: { open: string; close: string; enabled: boolean };
      friday: { open: string; close: string; enabled: boolean };
      saturday: { open: string; close: string; enabled: boolean };
      sunday: { open: string; close: string; enabled: boolean };
    };
  };
}

export default function CompanySettings() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: 'MoveCorp Professional Moving Services',
    address: {
      street: '123 Moving Street',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75201',
      country: 'United States'
    },
    contact: {
      phone: '(555) 123-4567',
      email: 'info@movecorp.com',
      website: 'https://www.movecorp.com'
    },
    business: {
      licenseNumber: 'TX-MOV-123456',
      insuranceInfo: 'Policy #INS-789012',
      dotNumber: 'DOT-345678',
      mcNumber: 'MC-901234'
    },
    settings: {
      timezone: 'America/Chicago',
      currency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      businessHours: {
        monday: { open: '08:00', close: '18:00', enabled: true },
        tuesday: { open: '08:00', close: '18:00', enabled: true },
        wednesday: { open: '08:00', close: '18:00', enabled: true },
        thursday: { open: '08:00', close: '18:00', enabled: true },
        friday: { open: '08:00', close: '18:00', enabled: true },
        saturday: { open: '09:00', close: '15:00', enabled: true },
        sunday: { open: '10:00', close: '14:00', enabled: false }
      }
    }
  });

  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'basic' | 'contact' | 'business' | 'settings'>('basic');

  // Fetch company settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(getApiUrl('company/settings'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            setError('Session expired. Please log in again.');
            return;
          }
          throw new Error('Failed to fetch company settings');
        }

        const result = await response.json();
        if (result.data) {
          // Transform API data structure to match frontend format
          const apiData = result.data;

          setCompanyInfo(prev => ({
            ...prev,
            name: apiData.companyName || prev.name,
            address: apiData.address || prev.address,
            contact: {
              phone: apiData.phone || prev.contact.phone,
              email: apiData.email || prev.contact.email,
              website: apiData.website || prev.contact.website
            },
            business: prev.business, // Keep frontend business data (not in API yet)
            settings: {
              timezone: apiData.preferences?.timezone || prev.settings.timezone,
              currency: apiData.preferences?.currency || prev.settings.currency,
              dateFormat: apiData.preferences?.dateFormat || prev.settings.dateFormat,
              businessHours: apiData.businessHours
                ? Object.fromEntries(
                    Object.entries(apiData.businessHours).map(([day, hours]: [string, any]) => [
                      day,
                      {
                        enabled: hours.isOpen ?? true,
                        open: hours.openTime || '08:00',
                        close: hours.closeTime || '18:00'
                      }
                    ])
                  ) as CompanyInfo['settings']['businessHours']
                : prev.settings.businessHours
            }
          }));
        }
      } catch (err) {
        console.error('Error fetching company settings:', err);
        setError(err instanceof Error ? err.message : 'Failed to load company settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem('access_token');

      // Transform frontend data structure to match API schema
      const apiPayload = {
        companyName: companyInfo.name,
        email: companyInfo.contact.email,
        phone: companyInfo.contact.phone,
        website: companyInfo.contact.website,
        address: {
          street: companyInfo.address.street,
          city: companyInfo.address.city,
          state: companyInfo.address.state,
          zipCode: companyInfo.address.zipCode,
          country: companyInfo.address.country || 'USA'
        },
        businessHours: Object.fromEntries(
          Object.entries(companyInfo.settings.businessHours).map(([day, hours]) => [
            day,
            {
              isOpen: hours.enabled,
              openTime: hours.open,
              closeTime: hours.close
            }
          ])
        ),
        preferences: {
          timezone: companyInfo.settings.timezone,
          currency: companyInfo.settings.currency,
          dateFormat: companyInfo.settings.dateFormat
        }
      };

      const response = await fetch(getApiUrl('company/settings'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(apiPayload),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update settings');
      }

      const result = await response.json();
      if (result.data) {
        // Transform API response to match frontend format
        const apiData = result.data;

        setCompanyInfo(prev => ({
          ...prev,
          name: apiData.companyName || prev.name,
          address: apiData.address || prev.address,
          contact: {
            phone: apiData.phone || prev.contact.phone,
            email: apiData.email || prev.contact.email,
            website: apiData.website || prev.contact.website
          },
          business: prev.business,
          settings: {
            timezone: apiData.preferences?.timezone || prev.settings.timezone,
            currency: apiData.preferences?.currency || prev.settings.currency,
            dateFormat: apiData.preferences?.dateFormat || prev.settings.dateFormat,
            businessHours: apiData.businessHours
              ? Object.fromEntries(
                  Object.entries(apiData.businessHours).map(([day, hours]: [string, any]) => [
                    day,
                    {
                      enabled: hours.isOpen ?? true,
                      open: hours.openTime || '08:00',
                      close: hours.closeTime || '18:00'
                    }
                  ])
                ) as CompanyInfo['settings']['businessHours']
              : prev.settings.businessHours
          }
        }));
      }

      setSuccessMessage('Company settings updated successfully');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving company settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateCompanyInfo = (path: string[], value: any) => {
    setCompanyInfo(prev => {
      const updated = { ...prev };
      let current = updated as any;

      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className={styles.companySettings}>
      <div className={styles.header}>
        <h3>Company Settings</h3>
        <p>Configure your company information and business settings</p>
      </div>

      {loading && (
        <div className={styles.loadingMessage}>
          Loading company settings...
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)} className={styles.closeError}>×</button>
        </div>
      )}

      {successMessage && (
        <div className={styles.successMessage}>
          <span>✅ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className={styles.closeSuccess}>×</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'basic' ? styles.active : ''}`}
          onClick={() => setActiveTab('basic')}
        >
          📋 Basic Info
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'contact' ? styles.active : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          📞 Contact
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'business' ? styles.active : ''}`}
          onClick={() => setActiveTab('business')}
        >
          🏢 Business
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
      </div>

      <div className={styles.tabContent}>
        {/* Basic Information Tab */}
        {activeTab === 'basic' && (
          <div className={styles.formSection}>
            <h4>Company Information</h4>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="companyName">Company Name</label>
                <input
                  id="companyName"
                  type="text"
                  value={companyInfo.name || ''}
                  onChange={(e) => updateCompanyInfo(['name'], e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>

            <h4>Address</h4>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="street">Street Address</label>
                <input
                  id="street"
                  type="text"
                  value={companyInfo.address.street || ''}
                  onChange={(e) => updateCompanyInfo(['address', 'street'], e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  type="text"
                  value={companyInfo.address.city || ''}
                  onChange={(e) => updateCompanyInfo(['address', 'city'], e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="state">State</label>
                <input
                  id="state"
                  type="text"
                  value={companyInfo.address.state || ''}
                  onChange={(e) => updateCompanyInfo(['address', 'state'], e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="zipCode">ZIP Code</label>
                <input
                  id="zipCode"
                  type="text"
                  value={companyInfo.address.zipCode || ''}
                  onChange={(e) => updateCompanyInfo(['address', 'zipCode'], e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        )}

        {/* Contact Information Tab */}
        {activeTab === 'contact' && (
          <div className={styles.formSection}>
            <h4>Contact Information</h4>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  value={companyInfo.contact.phone || ''}
                  onChange={(e) => updateCompanyInfo(['contact', 'phone'], e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  id="email"
                  type="email"
                  value={companyInfo.contact.email || ''}
                  onChange={(e) => updateCompanyInfo(['contact', 'email'], e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  type="url"
                  value={companyInfo.contact.website || ''}
                  onChange={(e) => updateCompanyInfo(['contact', 'website'], e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        )}

        {/* Business Information Tab */}
        {activeTab === 'business' && (
          <div className={styles.formSection}>
            <h4>Business Licensing & Insurance</h4>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="licenseNumber">License Number</label>
                <input
                  id="licenseNumber"
                  type="text"
                  value={companyInfo.business.licenseNumber || ''}
                  onChange={(e) => updateCompanyInfo(['business', 'licenseNumber'], e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="insuranceInfo">Insurance Information</label>
                <input
                  id="insuranceInfo"
                  type="text"
                  value={companyInfo.business.insuranceInfo || ''}
                  onChange={(e) => updateCompanyInfo(['business', 'insuranceInfo'], e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="dotNumber">DOT Number</label>
                <input
                  id="dotNumber"
                  type="text"
                  value={companyInfo.business.dotNumber || ''}
                  onChange={(e) => updateCompanyInfo(['business', 'dotNumber'], e.target.value)}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="mcNumber">MC Number</label>
                <input
                  id="mcNumber"
                  type="text"
                  value={companyInfo.business.mcNumber || ''}
                  onChange={(e) => updateCompanyInfo(['business', 'mcNumber'], e.target.value)}
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className={styles.formSection}>
            <h4>System Settings</h4>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="timezone">Timezone</label>
                <select
                  id="timezone"
                  value={companyInfo.settings.timezone || 'America/Chicago'}
                  onChange={(e) => updateCompanyInfo(['settings', 'timezone'], e.target.value)}
                  className={styles.select}
                >
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="currency">Currency</label>
                <select
                  id="currency"
                  value={companyInfo.settings.currency || 'USD'}
                  onChange={(e) => updateCompanyInfo(['settings', 'currency'], e.target.value)}
                  className={styles.select}
                >
                  <option value="USD">US Dollar (USD)</option>
                  <option value="CAD">Canadian Dollar (CAD)</option>
                  <option value="EUR">Euro (EUR)</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="dateFormat">Date Format</label>
                <select
                  id="dateFormat"
                  value={companyInfo.settings.dateFormat || 'MM/DD/YYYY'}
                  onChange={(e) => updateCompanyInfo(['settings', 'dateFormat'], e.target.value)}
                  className={styles.select}
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>
            </div>

            <h4>Business Hours</h4>
            <div className={styles.businessHours}>
              {Object.entries(companyInfo.settings.businessHours).map(([day, hours]) => (
                <div key={day} className={styles.businessHourRow}>
                  <div className={styles.dayName}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </div>
                  <div className={styles.hourInputs}>
                    <input
                      type="time"
                      value={hours.open || '08:00'}
                      onChange={(e) => updateCompanyInfo(['settings', 'businessHours', day, 'open'], e.target.value)}
                      className={styles.timeInput}
                      disabled={!hours.enabled}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={hours.close || '18:00'}
                      onChange={(e) => updateCompanyInfo(['settings', 'businessHours', day, 'close'], e.target.value)}
                      className={styles.timeInput}
                      disabled={!hours.enabled}
                    />
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={!!hours.enabled}
                        onChange={(e) => updateCompanyInfo(['settings', 'businessHours', day, 'enabled'], e.target.checked)}
                      />
                      Open
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className={styles.footer}>
        <button
          onClick={handleSave}
          disabled={isSaving || loading}
          className={styles.saveButton}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}