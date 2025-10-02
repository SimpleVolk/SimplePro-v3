'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/config';
import styles from './SmsCampaigns.module.css';

interface SmsCampaign {
  id: string;
  name: string;
  template: string;
  schedule: string;
  active: boolean;
  sendCount: number;
}

interface SmsSettings {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioPhoneNumber: string;
  monthlyBudget: number;
  usageThisMonth: number;
  optInMessage: string;
  optOutKeywords: string[];
  complianceEnabled: boolean;
}

export default function SmsCampaigns() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'campaigns' | 'templates'>('settings');

  const [smsSettings, setSmsSettings] = useState<SmsSettings>({
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioPhoneNumber: '',
    monthlyBudget: 500,
    usageThisMonth: 0,
    optInMessage: 'Reply YES to receive SMS updates from our moving company.',
    optOutKeywords: ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'],
    complianceEnabled: true,
  });

  const [campaigns, setCampaigns] = useState<SmsCampaign[]>([
    {
      id: '1',
      name: 'Move Reminder (24h before)',
      template: 'Hi {customer_name}, this is a reminder that your move is scheduled for tomorrow at {move_time}. Reply READY to confirm.',
      schedule: '24 hours before move',
      active: true,
      sendCount: 45,
    },
    {
      id: '2',
      name: 'Follow-up Survey',
      template: 'Thanks for choosing us! How was your moving experience? Rate us: {survey_link}',
      schedule: '2 hours after completion',
      active: true,
      sendCount: 38,
    },
  ]);

  const [newCampaign, setNewCampaign] = useState<Partial<SmsCampaign>>({
    name: '',
    template: '',
    schedule: '',
    active: true,
  });

  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('company/sms-campaigns'), {
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
        throw new Error('Failed to fetch SMS settings');
      }

      const result = await response.json();
      if (result.data) {
        setSmsSettings(result.data.settings || smsSettings);
        setCampaigns(result.data.campaigns || campaigns);
      }
    } catch (err) {
      console.error('Error fetching SMS settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(getApiUrl('company/sms-campaigns'), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: smsSettings, campaigns }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Session expired. Please log in again.');
          return;
        }
        throw new Error('Failed to update SMS settings');
      }

      setSuccess('SMS settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error saving SMS settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddCampaign = () => {
    if (!newCampaign.name || !newCampaign.template) {
      setError('Campaign name and template are required');
      return;
    }

    const campaign: SmsCampaign = {
      id: Date.now().toString(),
      name: newCampaign.name!,
      template: newCampaign.template!,
      schedule: newCampaign.schedule || 'Manual',
      active: newCampaign.active ?? true,
      sendCount: 0,
    };

    setCampaigns([...campaigns, campaign]);
    setNewCampaign({ name: '', template: '', schedule: '', active: true });
    setShowAddForm(false);
    setSuccess('Campaign added successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleDeleteCampaign = (id: string) => {
    if (confirm('Are you sure you want to delete this campaign?')) {
      setCampaigns(campaigns.filter(c => c.id !== id));
      setSuccess('Campaign deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const maskToken = (token: string) => {
    if (!token || token.length < 8) return token;
    return token.substring(0, 4) + '****' + token.substring(token.length - 4);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>SMS Campaigns</h2>
        <p>Manage SMS notifications and marketing campaigns</p>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          {error}
          <button onClick={() => setError(null)}>✕</button>
        </div>
      )}

      {success && (
        <div className={styles.successBanner}>
          {success}
          <button onClick={() => setSuccess(null)}>✕</button>
        </div>
      )}

      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'settings' ? styles.active : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Settings
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'campaigns' ? styles.active : ''}`}
          onClick={() => setActiveTab('campaigns')}
        >
          Campaigns
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'templates' ? styles.active : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading SMS settings...</div>
      ) : (
        <>
          {activeTab === 'settings' && (
            <form className={styles.form} onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }}>
              <div className={styles.section}>
                <h3>Twilio Integration</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="twilioAccountSid">Account SID</label>
                    <input
                      id="twilioAccountSid"
                      type="text"
                      value={smsSettings.twilioAccountSid}
                      onChange={(e) => setSmsSettings({ ...smsSettings, twilioAccountSid: e.target.value })}
                      className={styles.input}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    />
                    {smsSettings.twilioAccountSid && (
                      <small className={styles.helpText}>
                        Masked: {maskToken(smsSettings.twilioAccountSid)}
                      </small>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="twilioAuthToken">Auth Token</label>
                    <input
                      id="twilioAuthToken"
                      type="password"
                      value={smsSettings.twilioAuthToken}
                      onChange={(e) => setSmsSettings({ ...smsSettings, twilioAuthToken: e.target.value })}
                      className={styles.input}
                      placeholder="Your Twilio auth token"
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="twilioPhoneNumber">Twilio Phone Number</label>
                    <input
                      id="twilioPhoneNumber"
                      type="tel"
                      value={smsSettings.twilioPhoneNumber}
                      onChange={(e) => setSmsSettings({ ...smsSettings, twilioPhoneNumber: e.target.value })}
                      className={styles.input}
                      placeholder="+1234567890"
                    />
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3>Budget & Usage</h3>
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label htmlFor="monthlyBudget">Monthly Budget ($)</label>
                    <input
                      id="monthlyBudget"
                      type="number"
                      min="0"
                      value={smsSettings.monthlyBudget}
                      onChange={(e) => setSmsSettings({ ...smsSettings, monthlyBudget: parseFloat(e.target.value) })}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Usage This Month</label>
                    <div className={styles.usageDisplay}>
                      ${smsSettings.usageThisMonth.toFixed(2)} / ${smsSettings.monthlyBudget.toFixed(2)}
                    </div>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${(smsSettings.usageThisMonth / smsSettings.monthlyBudget) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.section}>
                <h3>Compliance Settings (TCPA)</h3>
                <div className={styles.formGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={smsSettings.complianceEnabled}
                      onChange={(e) => setSmsSettings({ ...smsSettings, complianceEnabled: e.target.checked })}
                    />
                    Enable TCPA Compliance
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="optInMessage">Opt-In Message</label>
                  <textarea
                    id="optInMessage"
                    value={smsSettings.optInMessage}
                    onChange={(e) => setSmsSettings({ ...smsSettings, optInMessage: e.target.value })}
                    className={styles.textarea}
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="optOutKeywords">Opt-Out Keywords (comma-separated)</label>
                  <input
                    id="optOutKeywords"
                    type="text"
                    value={smsSettings.optOutKeywords.join(', ')}
                    onChange={(e) => setSmsSettings({
                      ...smsSettings,
                      optOutKeywords: e.target.value.split(',').map(k => k.trim())
                    })}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.saveButton} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'campaigns' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h3>Active Campaigns</h3>
                <button
                  className={styles.addButton}
                  onClick={() => setShowAddForm(!showAddForm)}
                >
                  {showAddForm ? 'Cancel' : '+ Add Campaign'}
                </button>
              </div>

              {showAddForm && (
                <div className={styles.addForm}>
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label htmlFor="campaignName">Campaign Name</label>
                      <input
                        id="campaignName"
                        type="text"
                        value={newCampaign.name || ''}
                        onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                        className={styles.input}
                        placeholder="e.g., Move Reminder"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label htmlFor="campaignSchedule">Schedule</label>
                      <input
                        id="campaignSchedule"
                        type="text"
                        value={newCampaign.schedule || ''}
                        onChange={(e) => setNewCampaign({ ...newCampaign, schedule: e.target.value })}
                        className={styles.input}
                        placeholder="e.g., 24 hours before move"
                      />
                    </div>
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="campaignTemplate">Message Template</label>
                    <textarea
                      id="campaignTemplate"
                      value={newCampaign.template || ''}
                      onChange={(e) => setNewCampaign({ ...newCampaign, template: e.target.value })}
                      className={styles.textarea}
                      rows={3}
                      placeholder="Use {customer_name}, {move_date}, {move_time} as variables"
                    />
                  </div>

                  <button
                    className={styles.saveButton}
                    onClick={handleAddCampaign}
                  >
                    Add Campaign
                  </button>
                </div>
              )}

              <div className={styles.campaignsList}>
                {campaigns.map(campaign => (
                  <div key={campaign.id} className={styles.campaignCard}>
                    <div className={styles.campaignHeader}>
                      <h4>{campaign.name}</h4>
                      <div className={styles.campaignActions}>
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={campaign.active}
                            onChange={(e) => {
                              setCampaigns(campaigns.map(c =>
                                c.id === campaign.id ? { ...c, active: e.target.checked } : c
                              ));
                            }}
                          />
                          Active
                        </label>
                        <button
                          className={styles.deleteButton}
                          onClick={() => handleDeleteCampaign(campaign.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className={styles.campaignTemplate}>{campaign.template}</p>
                    <div className={styles.campaignMeta}>
                      <span>Schedule: {campaign.schedule}</span>
                      <span>Sent: {campaign.sendCount} times</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className={styles.section}>
              <h3>Available Variables</h3>
              <p className={styles.helpText}>
                Use these variables in your SMS templates. They will be automatically replaced with actual values.
              </p>
              <div className={styles.variablesList}>
                <code>{'{customer_name}'}</code> - Customer's full name
                <code>{'{move_date}'}</code> - Move date
                <code>{'{move_time}'}</code> - Move time
                <code>{'{crew_lead}'}</code> - Crew lead name
                <code>{'{pickup_address}'}</code> - Pickup location
                <code>{'{delivery_address}'}</code> - Delivery location
                <code>{'{total_cost}'}</code> - Total move cost
                <code>{'{survey_link}'}</code> - Feedback survey link
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
