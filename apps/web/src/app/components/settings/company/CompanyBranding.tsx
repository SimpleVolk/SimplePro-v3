'use client';

import { useState } from 'react';
import styles from './CompanyBranding.module.css';

interface BrandingSettings {
  logos: {
    companyLogo: string | null;
    favicon: string | null;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  companyInfo: {
    tagline: string;
    slogan: string;
  };
  socialMedia: {
    facebook: string;
    twitter: string;
    linkedin: string;
    instagram: string;
  };
  templates: {
    emailSignature: string;
    businessCardTemplate: string;
    invoiceHeader: string;
  };
}

export default function CompanyBranding() {
  const [branding, setBranding] = useState<BrandingSettings>({
    logos: {
      companyLogo: null,
      favicon: null,
    },
    colors: {
      primary: '#3B82F6',
      secondary: '#8B5CF6',
      accent: '#10B981',
    },
    companyInfo: {
      tagline: 'Your Trusted Moving Partner',
      slogan: 'Moving Made Simple',
    },
    socialMedia: {
      facebook: 'https://facebook.com/movecorp',
      twitter: 'https://twitter.com/movecorp',
      linkedin: 'https://linkedin.com/company/movecorp',
      instagram: 'https://instagram.com/movecorp',
    },
    templates: {
      emailSignature: `Best regards,
{name}
{title}
MoveCorp Professional Moving Services
Phone: {phone}
Email: {email}`,
      businessCardTemplate: 'Standard Template',
      invoiceHeader: 'MoveCorp - Professional Moving Services',
    },
  });

  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    'logos' | 'colors' | 'info' | 'social' | 'templates'
  >('logos');

  const handleLogoUpload = (type: 'companyLogo' | 'favicon') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          setBranding((prev) => ({
            ...prev,
            logos: {
              ...prev.logos,
              [type]: reader.result as string,
            },
          }));
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleRemoveLogo = (type: 'companyLogo' | 'favicon') => {
    setBranding((prev) => ({
      ...prev,
      logos: {
        ...prev.logos,
        [type]: null,
      },
    }));
  };

  const updateBranding = (path: string[], value: any) => {
    setBranding((prev) => {
      const updated = { ...prev } as any;
      let current = updated;

      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }

      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSuccessMessage(null);

    // Simulate API call
    setTimeout(() => {
      setSuccessMessage('Branding settings saved successfully');
      setIsSaving(false);

      setTimeout(() => setSuccessMessage(null), 3000);
    }, 1000);
  };

  return (
    <div className={styles.companyBranding}>
      <div className={styles.header}>
        <div>
          <h3>Company Branding</h3>
          <p>Configure company logos, colors, and branding elements</p>
        </div>
      </div>

      {successMessage && (
        <div className={styles.successMessage}>
          <span>✅ {successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className={styles.closeSuccess}
          >
            ×
          </button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          className={`${styles.tab} ${activeTab === 'logos' ? styles.active : ''}`}
          onClick={() => setActiveTab('logos')}
        >
          🖼️ Logos
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'colors' ? styles.active : ''}`}
          onClick={() => setActiveTab('colors')}
        >
          🎨 Brand Colors
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'info' ? styles.active : ''}`}
          onClick={() => setActiveTab('info')}
        >
          📝 Company Info
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'social' ? styles.active : ''}`}
          onClick={() => setActiveTab('social')}
        >
          🌐 Social Media
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'templates' ? styles.active : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          📄 Templates
        </button>
      </div>

      <div className={styles.tabContent}>
        {/* Logos Tab */}
        {activeTab === 'logos' && (
          <div className={styles.formSection}>
            <h4>Logo Management</h4>
            <div className={styles.logosGrid}>
              <div className={styles.logoCard}>
                <h5>Company Logo</h5>
                <p>Recommended: 512x512px, PNG with transparent background</p>
                <div className={styles.logoPreview}>
                  {branding.logos.companyLogo ? (
                    <img src={branding.logos.companyLogo} alt="Company Logo" />
                  ) : (
                    <div className={styles.placeholderLogo}>
                      No logo uploaded
                    </div>
                  )}
                </div>
                <div className={styles.logoActions}>
                  <button
                    onClick={() => handleLogoUpload('companyLogo')}
                    className={styles.uploadButton}
                  >
                    📤 Upload Logo
                  </button>
                  {branding.logos.companyLogo && (
                    <button
                      onClick={() => handleRemoveLogo('companyLogo')}
                      className={styles.removeButton}
                    >
                      🗑️ Remove
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.logoCard}>
                <h5>Favicon</h5>
                <p>Recommended: 32x32px or 64x64px, PNG or ICO format</p>
                <div className={styles.logoPreview}>
                  {branding.logos.favicon ? (
                    <img src={branding.logos.favicon} alt="Favicon" />
                  ) : (
                    <div className={styles.placeholderLogo}>
                      No favicon uploaded
                    </div>
                  )}
                </div>
                <div className={styles.logoActions}>
                  <button
                    onClick={() => handleLogoUpload('favicon')}
                    className={styles.uploadButton}
                  >
                    📤 Upload Favicon
                  </button>
                  {branding.logos.favicon && (
                    <button
                      onClick={() => handleRemoveLogo('favicon')}
                      className={styles.removeButton}
                    >
                      🗑️ Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Brand Colors Tab */}
        {activeTab === 'colors' && (
          <div className={styles.formSection}>
            <h4>Brand Colors</h4>
            <p className={styles.sectionDescription}>
              Define your brand colors that will be used throughout the
              application
            </p>
            <div className={styles.colorsGrid}>
              <div className={styles.colorCard}>
                <label>Primary Color</label>
                <div className={styles.colorPickerGroup}>
                  <input
                    type="color"
                    value={branding.colors.primary}
                    onChange={(e) =>
                      updateBranding(['colors', 'primary'], e.target.value)
                    }
                    className={styles.colorPicker}
                  />
                  <input
                    type="text"
                    value={branding.colors.primary}
                    onChange={(e) =>
                      updateBranding(['colors', 'primary'], e.target.value)
                    }
                    className={styles.colorInput}
                    placeholder="#3B82F6"
                  />
                </div>
                <div
                  className={styles.colorPreview}
                  style={{ backgroundColor: branding.colors.primary }}
                >
                  <span>Primary</span>
                </div>
              </div>

              <div className={styles.colorCard}>
                <label>Secondary Color</label>
                <div className={styles.colorPickerGroup}>
                  <input
                    type="color"
                    value={branding.colors.secondary}
                    onChange={(e) =>
                      updateBranding(['colors', 'secondary'], e.target.value)
                    }
                    className={styles.colorPicker}
                  />
                  <input
                    type="text"
                    value={branding.colors.secondary}
                    onChange={(e) =>
                      updateBranding(['colors', 'secondary'], e.target.value)
                    }
                    className={styles.colorInput}
                    placeholder="#8B5CF6"
                  />
                </div>
                <div
                  className={styles.colorPreview}
                  style={{ backgroundColor: branding.colors.secondary }}
                >
                  <span>Secondary</span>
                </div>
              </div>

              <div className={styles.colorCard}>
                <label>Accent Color</label>
                <div className={styles.colorPickerGroup}>
                  <input
                    type="color"
                    value={branding.colors.accent}
                    onChange={(e) =>
                      updateBranding(['colors', 'accent'], e.target.value)
                    }
                    className={styles.colorPicker}
                  />
                  <input
                    type="text"
                    value={branding.colors.accent}
                    onChange={(e) =>
                      updateBranding(['colors', 'accent'], e.target.value)
                    }
                    className={styles.colorInput}
                    placeholder="#10B981"
                  />
                </div>
                <div
                  className={styles.colorPreview}
                  style={{ backgroundColor: branding.colors.accent }}
                >
                  <span>Accent</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Company Info Tab */}
        {activeTab === 'info' && (
          <div className={styles.formSection}>
            <h4>Company Information</h4>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Company Tagline</label>
                <input
                  type="text"
                  value={branding.companyInfo.tagline}
                  onChange={(e) =>
                    updateBranding(['companyInfo', 'tagline'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="e.g., Your Trusted Moving Partner"
                />
                <span className={styles.helpText}>
                  Short phrase that appears on marketing materials
                </span>
              </div>

              <div className={styles.formGroup}>
                <label>Company Slogan</label>
                <input
                  type="text"
                  value={branding.companyInfo.slogan}
                  onChange={(e) =>
                    updateBranding(['companyInfo', 'slogan'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="e.g., Moving Made Simple"
                />
                <span className={styles.helpText}>
                  Memorable phrase for brand recognition
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Social Media Tab */}
        {activeTab === 'social' && (
          <div className={styles.formSection}>
            <h4>Social Media Links</h4>
            <p className={styles.sectionDescription}>
              Connect your social media profiles to appear on your website and
              marketing materials
            </p>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>📘 Facebook</label>
                <input
                  type="url"
                  value={branding.socialMedia.facebook}
                  onChange={(e) =>
                    updateBranding(['socialMedia', 'facebook'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="https://facebook.com/yourcompany"
                />
              </div>

              <div className={styles.formGroup}>
                <label>🐦 Twitter</label>
                <input
                  type="url"
                  value={branding.socialMedia.twitter}
                  onChange={(e) =>
                    updateBranding(['socialMedia', 'twitter'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="https://twitter.com/yourcompany"
                />
              </div>

              <div className={styles.formGroup}>
                <label>💼 LinkedIn</label>
                <input
                  type="url"
                  value={branding.socialMedia.linkedin}
                  onChange={(e) =>
                    updateBranding(['socialMedia', 'linkedin'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="https://linkedin.com/company/yourcompany"
                />
              </div>

              <div className={styles.formGroup}>
                <label>📷 Instagram</label>
                <input
                  type="url"
                  value={branding.socialMedia.instagram}
                  onChange={(e) =>
                    updateBranding(['socialMedia', 'instagram'], e.target.value)
                  }
                  className={styles.input}
                  placeholder="https://instagram.com/yourcompany"
                />
              </div>
            </div>
          </div>
        )}

        {/* Templates Tab */}
        {activeTab === 'templates' && (
          <div className={styles.formSection}>
            <h4>Document Templates</h4>
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Email Signature Template</label>
                <textarea
                  value={branding.templates.emailSignature}
                  onChange={(e) =>
                    updateBranding(
                      ['templates', 'emailSignature'],
                      e.target.value,
                    )
                  }
                  className={styles.textarea}
                  rows={6}
                  placeholder="Email signature template with placeholders"
                />
                <span className={styles.helpText}>
                  Available placeholders: {'{name}'}, {'{title}'}, {'{phone}'},{' '}
                  {'{email}'}
                </span>
              </div>

              <div className={styles.formGroup}>
                <label>Invoice Header</label>
                <input
                  type="text"
                  value={branding.templates.invoiceHeader}
                  onChange={(e) =>
                    updateBranding(
                      ['templates', 'invoiceHeader'],
                      e.target.value,
                    )
                  }
                  className={styles.input}
                  placeholder="Invoice header text"
                />
                <span className={styles.helpText}>
                  Text that appears at the top of invoices
                </span>
              </div>

              <div className={styles.formGroup}>
                <label>Business Card Template</label>
                <select
                  value={branding.templates.businessCardTemplate}
                  onChange={(e) =>
                    updateBranding(
                      ['templates', 'businessCardTemplate'],
                      e.target.value,
                    )
                  }
                  className={styles.select}
                >
                  <option value="Standard Template">Standard Template</option>
                  <option value="Modern Template">Modern Template</option>
                  <option value="Classic Template">Classic Template</option>
                  <option value="Minimal Template">Minimal Template</option>
                </select>
                <span className={styles.helpText}>
                  Choose a template for business card design
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className={styles.footer}>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={styles.saveButton}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
