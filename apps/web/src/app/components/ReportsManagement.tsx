'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../../lib/config';
import styles from './ReportsManagement.module.css';

interface Report {
  id: string;
  name: string;
  description: string;
  type: string;
  period: string;
  startDate: string;
  endDate: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress?: number;
  error?: string;
  createdBy: string;
  visibility: string;
  fileUrl?: string;
  fileFormat?: string;
  createdAt: string;
  lastGenerated?: string;
}

interface ReportType {
  id: string;
  name: string;
  description: string;
}


export function ReportsManagement() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'list' | 'create' | 'generate'>('list');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'revenue',
    period: 'monthly',
    startDate: '',
    endDate: '',
    visibility: 'private',
    fileFormat: 'json'
  });

  useEffect(() => {
    if (user) {
      fetchReports();
      fetchReportTypes();
    }
  }, [user]);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(getApiUrl('analytics/reports'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch reports');

      const data = await response.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('Reports fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    }
  };

  const fetchReportTypes = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(getApiUrl('analytics/metadata/report-types'), {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch report types');

      const data = await response.json();
      setReportTypes(data.reportTypes || []);
    } catch (err) {
      console.error('Report types fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const createReport = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No authentication token');

      const response = await fetch(getApiUrl('analytics/reports'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate),
          endDate: new Date(formData.endDate),
        }),
      });

      if (!response.ok) throw new Error('Failed to create report');

      const newReport = await response.json();
      setReports(prev => [newReport, ...prev]);
      setActiveTab('list');

      // Reset form
      setFormData({
        name: '',
        description: '',
        type: 'revenue',
        period: 'monthly',
        startDate: '',
        endDate: '',
        visibility: 'private',
        fileFormat: 'json'
      });

    } catch (err) {
      console.error('Create report error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create report');
    }
  };

  const generateQuickReport = async (type: 'revenue' | 'performance') => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) throw new Error('No authentication token');

      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);

      const response = await fetch(getApiUrl(`analytics/reports/${type}`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) throw new Error(`Failed to generate ${type} report`);

      const reportData = await response.json();
      console.log(`${type} report generated:`, reportData);

      // For now, we'll just show the data in console
      // In production, this would likely trigger a download or display
      alert(`${type} report generated successfully! Check console for data.`);

    } catch (err) {
      console.error(`Generate ${type} report error:`, err);
      setError(err instanceof Error ? err.message : `Failed to generate ${type} report`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'generating': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading reports...</p>
      </div>
    );
  }

  return (
    <div className={styles.reportsManagement}>
      {error && (
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button
          onClick={() => setActiveTab('list')}
          className={`${styles.tab} ${activeTab === 'list' ? styles.tabActive : ''}`}
        >
          Reports ({reports.length})
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`${styles.tab} ${activeTab === 'create' ? styles.tabActive : ''}`}
        >
          Create Report
        </button>
        <button
          onClick={() => setActiveTab('generate')}
          className={`${styles.tab} ${activeTab === 'generate' ? styles.tabActive : ''}`}
        >
          Quick Generate
        </button>
      </div>

      {/* Reports List */}
      {activeTab === 'list' && (
        <div className={styles.tabContent}>
          {reports.length === 0 ? (
            <div className={styles.emptyState}>
              <h3>No Reports Yet</h3>
              <p>Create your first report to get started with analytics insights.</p>
              <button onClick={() => setActiveTab('create')} className={styles.primaryButton}>
                Create Report
              </button>
            </div>
          ) : (
            <div className={styles.reportsList}>
              {reports.map((report) => (
                <div key={report.id} className={styles.reportCard}>
                  <div className={styles.reportHeader}>
                    <div className={styles.reportInfo}>
                      <h3>{report.name}</h3>
                      <p>{report.description}</p>
                    </div>
                    <div
                      className={styles.statusBadge}
                      style={{ backgroundColor: getStatusColor(report.status) }}
                    >
                      {report.status}
                    </div>
                  </div>

                  <div className={styles.reportDetails}>
                    <div className={styles.reportMeta}>
                      <span>Type: {report.type}</span>
                      <span>Period: {formatDate(report.startDate)} - {formatDate(report.endDate)}</span>
                      <span>Created: {formatDate(report.createdAt)}</span>
                    </div>

                    {report.status === 'generating' && report.progress !== undefined && (
                      <div className={styles.progressBar}>
                        <div
                          className={styles.progressFill}
                          style={{ width: `${report.progress}%` }}
                        ></div>
                        <span>{report.progress}%</span>
                      </div>
                    )}

                    {report.status === 'failed' && report.error && (
                      <div className={styles.errorMessage}>
                        Error: {report.error}
                      </div>
                    )}

                    {report.status === 'completed' && (
                      <div className={styles.reportActions}>
                        <span>Generated: {report.lastGenerated ? formatDate(report.lastGenerated) : 'N/A'}</span>
                        {report.fileUrl && (
                          <button className={styles.downloadButton}>
                            Download {report.fileFormat?.toUpperCase()}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Report */}
      {activeTab === 'create' && (
        <div className={styles.tabContent}>
          <div className={styles.createForm}>
            <h3>Create New Report</h3>
            <form onSubmit={createReport}>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Report Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    placeholder="Monthly Revenue Analysis"
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed analysis of revenue trends and performance metrics"
                    rows={3}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Report Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  >
                    {reportTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Period</label>
                  <select
                    value={formData.period}
                    onChange={(e) => setFormData(prev => ({ ...prev, period: e.target.value }))}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.formGroup}>
                  <label>Visibility</label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value }))}
                  >
                    <option value="private">Private</option>
                    <option value="team">Team</option>
                    <option value="company">Company</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>File Format</label>
                  <select
                    value={formData.fileFormat}
                    onChange={(e) => setFormData(prev => ({ ...prev, fileFormat: e.target.value }))}
                  >
                    <option value="json">JSON</option>
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
              </div>

              <div className={styles.formActions}>
                <button type="button" onClick={() => setActiveTab('list')} className={styles.secondaryButton}>
                  Cancel
                </button>
                <button type="submit" className={styles.primaryButton}>
                  Create Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Generate */}
      {activeTab === 'generate' && (
        <div className={styles.tabContent}>
          <div className={styles.quickGenerate}>
            <h3>Quick Report Generation</h3>
            <p>Generate instant reports for the last 30 days</p>

            <div className={styles.quickReports}>
              <div className={styles.quickReportCard}>
                <h4>Revenue Report</h4>
                <p>Financial performance, revenue trends, and profitability analysis</p>
                <button
                  onClick={() => generateQuickReport('revenue')}
                  className={styles.primaryButton}
                >
                  Generate Revenue Report
                </button>
              </div>

              <div className={styles.quickReportCard}>
                <h4>Performance Report</h4>
                <p>Operational efficiency, job completion rates, and crew performance</p>
                <button
                  onClick={() => generateQuickReport('performance')}
                  className={styles.primaryButton}
                >
                  Generate Performance Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}