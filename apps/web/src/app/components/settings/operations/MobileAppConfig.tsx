'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '../../../../lib/config';
import styles from '../company/CompanySettings.module.css';

interface MobileAppConfig {
  features: {
    gpsTracking: boolean;
    photoUpload: boolean;
    signatureCapture: boolean;
    inventoryChecklist: boolean;
    timeTracking: boolean;
    customerCommunication: boolean;
    offlineMode: boolean;
  };
  gpsSettings: {
    trackingFrequencyMinutes: number;
    requireLocationPermission: boolean;
    showRouteOnMap: boolean;
  };
  photoSettings: {
    uploadQuality: 'low' | 'medium' | 'high';
    maxPhotosPerJob: number;
    requireBeforeAfterPhotos: boolean;
    compressPhotos: boolean;
  };
  offlineSettings: {
    syncFrequencyMinutes: number;
    maxOfflineHours: number;
    autoSyncOnConnection: boolean;
  };
  checkInCheckOut: {
    requirePhotoOnCheckIn: boolean;
    requireLocationOnCheckIn: boolean;
    requireSignatureOnCheckOut: boolean;
    allowEarlyCheckIn: boolean;
    earlyCheckInMinutes: number;
  };
  signatureSettings: {
    requireCustomerName: boolean;
    requireEmail: boolean;
    sendCopyToCustomer: boolean;
  };
}

export default function MobileAppConfig() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<MobileAppConfig>({
    features: {
      gpsTracking: true,
      photoUpload: true,
      signatureCapture: true,
      inventoryChecklist: true,
      timeTracking: true,
      customerCommunication: true,
      offlineMode: true,
    },
    gpsSettings: {
      trackingFrequencyMinutes: 15,
      requireLocationPermission: true,
      showRouteOnMap: true,
    },
    photoSettings: {
      uploadQuality: 'medium',
      maxPhotosPerJob: 50,
      requireBeforeAfterPhotos: true,
      compressPhotos: true,
    },
    offlineSettings: {
      syncFrequencyMinutes: 30,
      maxOfflineHours: 24,
      autoSyncOnConnection: true,
    },
    checkInCheckOut: {
      requirePhotoOnCheckIn: true,
      requireLocationOnCheckIn: true,
      requireSignatureOnCheckOut: true,
      allowEarlyCheckIn: true,
      earlyCheckInMinutes: 15,
    },
    signatureSettings: {
      requireCustomerName: true,
      requireEmail: false,
      sendCopyToCustomer: true,
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/mobile-app'), {
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
        throw new Error('Failed to fetch mobile app settings');
      }

      const result = await response.json();
      if (result.data) {
        setFormData(result.data);
      }
    } catch (err) {
      console.error('Error fetching mobile app settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('settings/mobile-app'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update settings');
      }

      setSuccess('Mobile app settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving mobile app settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const updateFormData = (path: string[], value: any) => {
    setFormData(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      let current = updated;

      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className={styles.companySettings}>
      <div className={styles.header}>
        <h3>Mobile App Configuration</h3>
        <p>Configure crew mobile app features and behavior</p>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <span>{error}</span>
          <button onClick={() => setError(null)} className={styles.closeError}>×</button>
        </div>
      )}

      {success && (
        <div className={styles.successMessage}>
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className={styles.closeSuccess}>×</button>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingMessage}>Loading mobile app settings...</div>
      ) : (
        <form className={styles.formSection} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <h4>Feature Toggles</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.features.gpsTracking}
                  onChange={(e) => updateFormData(['features', 'gpsTracking'], e.target.checked)}
                />
                GPS Tracking
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.features.photoUpload}
                  onChange={(e) => updateFormData(['features', 'photoUpload'], e.target.checked)}
                />
                Photo Upload
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.features.signatureCapture}
                  onChange={(e) => updateFormData(['features', 'signatureCapture'], e.target.checked)}
                />
                Signature Capture
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.features.inventoryChecklist}
                  onChange={(e) => updateFormData(['features', 'inventoryChecklist'], e.target.checked)}
                />
                Inventory Checklist
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.features.timeTracking}
                  onChange={(e) => updateFormData(['features', 'timeTracking'], e.target.checked)}
                />
                Time Tracking
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.features.customerCommunication}
                  onChange={(e) => updateFormData(['features', 'customerCommunication'], e.target.checked)}
                />
                Customer Communication
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.features.offlineMode}
                  onChange={(e) => updateFormData(['features', 'offlineMode'], e.target.checked)}
                />
                Offline Mode
              </label>
            </div>
          </div>

          {formData.features.gpsTracking && (
            <>
              <h4>GPS Settings</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="trackingFrequencyMinutes">Tracking Frequency (minutes)</label>
                  <input
                    id="trackingFrequencyMinutes"
                    type="number"
                    min="1"
                    value={formData.gpsSettings.trackingFrequencyMinutes}
                    onChange={(e) => updateFormData(['gpsSettings', 'trackingFrequencyMinutes'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.gpsSettings.requireLocationPermission}
                      onChange={(e) => updateFormData(['gpsSettings', 'requireLocationPermission'], e.target.checked)}
                    />
                    Require Location Permission
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.gpsSettings.showRouteOnMap}
                      onChange={(e) => updateFormData(['gpsSettings', 'showRouteOnMap'], e.target.checked)}
                    />
                    Show Route on Map
                  </label>
                </div>
              </div>
            </>
          )}

          {formData.features.photoUpload && (
            <>
              <h4>Photo Settings</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="uploadQuality">Upload Quality</label>
                  <select
                    id="uploadQuality"
                    value={formData.photoSettings.uploadQuality}
                    onChange={(e) => updateFormData(['photoSettings', 'uploadQuality'], e.target.value)}
                    className={styles.select}
                  >
                    <option value="low">Low (Faster Upload)</option>
                    <option value="medium">Medium (Balanced)</option>
                    <option value="high">High (Best Quality)</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="maxPhotosPerJob">Max Photos Per Job</label>
                  <input
                    id="maxPhotosPerJob"
                    type="number"
                    min="1"
                    value={formData.photoSettings.maxPhotosPerJob}
                    onChange={(e) => updateFormData(['photoSettings', 'maxPhotosPerJob'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.photoSettings.requireBeforeAfterPhotos}
                      onChange={(e) => updateFormData(['photoSettings', 'requireBeforeAfterPhotos'], e.target.checked)}
                    />
                    Require Before/After Photos
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.photoSettings.compressPhotos}
                      onChange={(e) => updateFormData(['photoSettings', 'compressPhotos'], e.target.checked)}
                    />
                    Compress Photos
                  </label>
                </div>
              </div>
            </>
          )}

          {formData.features.offlineMode && (
            <>
              <h4>Offline Mode Settings</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="syncFrequencyMinutes">Sync Frequency (minutes)</label>
                  <input
                    id="syncFrequencyMinutes"
                    type="number"
                    min="5"
                    value={formData.offlineSettings.syncFrequencyMinutes}
                    onChange={(e) => updateFormData(['offlineSettings', 'syncFrequencyMinutes'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="maxOfflineHours">Max Offline Hours</label>
                  <input
                    id="maxOfflineHours"
                    type="number"
                    min="1"
                    value={formData.offlineSettings.maxOfflineHours}
                    onChange={(e) => updateFormData(['offlineSettings', 'maxOfflineHours'], parseInt(e.target.value))}
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.offlineSettings.autoSyncOnConnection}
                      onChange={(e) => updateFormData(['offlineSettings', 'autoSyncOnConnection'], e.target.checked)}
                    />
                    Auto-Sync on Connection
                  </label>
                </div>
              </div>
            </>
          )}

          <h4>Check-In/Check-Out</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.checkInCheckOut.requirePhotoOnCheckIn}
                  onChange={(e) => updateFormData(['checkInCheckOut', 'requirePhotoOnCheckIn'], e.target.checked)}
                />
                Require Photo on Check-In
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.checkInCheckOut.requireLocationOnCheckIn}
                  onChange={(e) => updateFormData(['checkInCheckOut', 'requireLocationOnCheckIn'], e.target.checked)}
                />
                Require Location on Check-In
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.checkInCheckOut.requireSignatureOnCheckOut}
                  onChange={(e) => updateFormData(['checkInCheckOut', 'requireSignatureOnCheckOut'], e.target.checked)}
                />
                Require Signature on Check-Out
              </label>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.checkInCheckOut.allowEarlyCheckIn}
                  onChange={(e) => updateFormData(['checkInCheckOut', 'allowEarlyCheckIn'], e.target.checked)}
                />
                Allow Early Check-In
              </label>
            </div>

            {formData.checkInCheckOut.allowEarlyCheckIn && (
              <div className={styles.formGroup}>
                <label htmlFor="earlyCheckInMinutes">Early Check-In Window (minutes)</label>
                <input
                  id="earlyCheckInMinutes"
                  type="number"
                  min="0"
                  value={formData.checkInCheckOut.earlyCheckInMinutes}
                  onChange={(e) => updateFormData(['checkInCheckOut', 'earlyCheckInMinutes'], parseInt(e.target.value))}
                  className={styles.input}
                />
              </div>
            )}
          </div>

          {formData.features.signatureCapture && (
            <>
              <h4>Signature Settings</h4>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.signatureSettings.requireCustomerName}
                      onChange={(e) => updateFormData(['signatureSettings', 'requireCustomerName'], e.target.checked)}
                    />
                    Require Customer Name
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.signatureSettings.requireEmail}
                      onChange={(e) => updateFormData(['signatureSettings', 'requireEmail'], e.target.checked)}
                    />
                    Require Email Address
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formData.signatureSettings.sendCopyToCustomer}
                      onChange={(e) => updateFormData(['signatureSettings', 'sendCopyToCustomer'], e.target.checked)}
                    />
                    Send Copy to Customer
                  </label>
                </div>
              </div>
            </>
          )}

          <div className={styles.footer}>
            <button
              type="submit"
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
