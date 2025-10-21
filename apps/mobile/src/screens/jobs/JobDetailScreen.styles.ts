/**
 * Job Detail Screen Styles
 *
 * Styling for the job detail screen with production-ready design
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },

  // Loading & Error States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Offline Banner
  offlineBanner: {
    backgroundColor: '#f59e0b',
    padding: 10,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

  // Header Card
  headerCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e5e5e5',
  },

  // Status Badges
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  statusScheduled: {
    backgroundColor: '#3b82f6',
  },
  statusInProgress: {
    backgroundColor: '#f59e0b',
  },
  statusCompleted: {
    backgroundColor: '#10b981',
  },
  statusCancelled: {
    backgroundColor: '#ef4444',
  },
  statusOnHold: {
    backgroundColor: '#6b7280',
  },
  statusDefault: {
    backgroundColor: '#6b7280',
  },

  // Meta Row
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  priorityUrgent: {
    backgroundColor: '#dc2626',
  },
  priorityHigh: {
    backgroundColor: '#f59e0b',
  },
  priorityNormal: {
    backgroundColor: '#3b82f6',
  },
  priorityLow: {
    backgroundColor: '#6b7280',
  },
  priorityDefault: {
    backgroundColor: '#6b7280',
  },
  serviceType: {
    fontSize: 14,
    color: '#999',
    textTransform: 'capitalize',
  },

  // Sections
  section: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e5e5',
    marginBottom: 12,
  },

  // Info Rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#e5e5e5',
  },
  infoValueHighlight: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },

  // Location Cards
  locationCard: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  navigateButton: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  addressText: {
    fontSize: 14,
    color: '#e5e5e5',
    marginBottom: 4,
  },

  // Crew Cards
  crewCard: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  crewLeadCard: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  crewInfo: {
    flex: 1,
  },
  crewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e5e5',
    marginBottom: 4,
  },
  crewRole: {
    fontSize: 12,
    color: '#999',
  },
  crewStatusBadge: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  crewStatusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // Instructions
  instructionsCard: {
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  instructionsText: {
    fontSize: 14,
    color: '#e5e5e5',
    lineHeight: 20,
  },

  // Checked In Banner
  checkedInBanner: {
    backgroundColor: '#10b981',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkedInText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Footer Actions
  footer: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  checkInButton: {
    backgroundColor: '#3b82f6',
  },
  photosButton: {
    backgroundColor: '#8b5cf6',
  },
  signatureButton: {
    backgroundColor: '#10b981',
  },
  callButton: {
    backgroundColor: '#f59e0b',
  },
  buttonDisabled: {
    backgroundColor: '#4a5568',
    opacity: 0.6,
  },
});
