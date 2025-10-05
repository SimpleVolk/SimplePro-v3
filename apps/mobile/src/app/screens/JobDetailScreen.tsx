import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
} from 'react-native';
import { useJobs } from '../contexts/JobContext';
import { useTheme } from '../contexts/ThemeContext';

const JobDetailScreen = ({ route, navigation }: any) => {
  const { jobId } = route.params;
  const { currentJob, updateJobStatus, updateNotes } = useJobs();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const [notes, setNotes] = useState(currentJob?.notes || '');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  if (!currentJob) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    Alert.alert(
      'Update Job Status',
      `Change status to ${newStatus.replace('_', ' ')}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsUpdatingStatus(true);
            try {
              await updateJobStatus(jobId, newStatus as any);
              Alert.alert('Success', 'Job status updated');
            } catch (error) {
              Alert.alert('Error', 'Failed to update job status');
            } finally {
              setIsUpdatingStatus(false);
            }
          },
        },
      ]
    );
  };

  const handleNotesUpdate = async () => {
    try {
      await updateNotes(jobId, notes);
      Alert.alert('Success', 'Notes updated');
    } catch (error) {
      Alert.alert('Error', 'Failed to update notes');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return colors.warning;
      case 'in_progress':
        return colors.info;
      case 'completed':
        return colors.success;
      case 'cancelled':
        return colors.error;
      default:
        return colors.textMuted;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: spacing.lg,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    customerName: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    statusContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    statusBadge: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    statusText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    serviceType: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.medium,
      color: colors.secondary,
      textTransform: 'uppercase',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.divider,
    },
    infoLabel: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
      flex: 1,
    },
    infoValue: {
      fontSize: fontSize.base,
      color: colors.textPrimary,
      flex: 2,
      textAlign: 'right',
    },
    addressContainer: {
      marginBottom: spacing.md,
    },
    addressLabel: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    addressText: {
      fontSize: fontSize.base,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    priceText: {
      fontSize: fontSize['2xl'],
      fontWeight: fontWeight.bold,
      color: colors.success,
      textAlign: 'center',
    },
    actionButtonsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.lg,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.secondary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      marginHorizontal: spacing.xs,
    },
    statusButton: {
      backgroundColor: colors.info,
    },
    checklistButton: {
      backgroundColor: colors.warning,
    },
    signatureButton: {
      backgroundColor: colors.success,
    },
    photoButton: {
      backgroundColor: colors.accent,
    },
    actionButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    statusActions: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginTop: spacing.lg,
    },
    statusActionButton: {
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      backgroundColor: colors.secondary,
    },
    statusActionText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
    notesInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: fontSize.base,
      color: colors.textPrimary,
      minHeight: 100,
      textAlignVertical: 'top',
    },
    notesButtonContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: spacing.md,
    },
    notesButton: {
      backgroundColor: colors.secondary,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.sm,
    },
    notesButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
    errorText: {
      fontSize: fontSize.lg,
      color: colors.error,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Customer Information */}
          <View style={styles.section}>
            <Text style={styles.customerName}>{currentJob.customerName}</Text>
            <View style={styles.statusContainer}>
              <Text style={styles.serviceType}>
                {currentJob.serviceType.replace('_', ' ')}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(currentJob.status) }]}>
                <Text style={styles.statusText}>{getStatusText(currentJob.status)}</Text>
              </View>
            </View>
          </View>

          {/* Job Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Scheduled Date:</Text>
              <Text style={styles.infoValue}>
                {new Date(currentJob.scheduledDate).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Duration:</Text>
              <Text style={styles.infoValue}>
                {currentJob.estimatedDuration} hours
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Crew ID:</Text>
              <Text style={styles.infoValue}>
                {currentJob.crewId || 'Not assigned'}
              </Text>
            </View>
          </View>

          {/* Addresses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Addresses</Text>
            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>Pickup Location</Text>
              <Text style={styles.addressText}>
                {currentJob.addresses.pickup.address}
              </Text>
              {currentJob.addresses.pickup.specialInstructions && (
                <Text style={[styles.addressText, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                  Instructions: {currentJob.addresses.pickup.specialInstructions}
                </Text>
              )}
            </View>
            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>Delivery Location</Text>
              <Text style={styles.addressText}>
                {currentJob.addresses.delivery.address}
              </Text>
              {currentJob.addresses.delivery.specialInstructions && (
                <Text style={[styles.addressText, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                  Instructions: {currentJob.addresses.delivery.specialInstructions}
                </Text>
              )}
            </View>
          </View>

          {/* Estimate */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estimate</Text>
            <Text style={styles.priceText}>
              ${currentJob.estimate.totalPrice.toLocaleString()}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.checklistButton]}
              onPress={() => navigation.navigate('Checklist', { jobId })}
            >
              <Text style={styles.actionButtonText}>Checklist</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.signatureButton]}
              onPress={() => navigation.navigate('Signature', { jobId })}
            >
              <Text style={styles.actionButtonText}>Signature</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.photoButton]}
              onPress={() => navigation.navigate('Photo', { jobId })}
            >
              <Text style={styles.actionButtonText}>Photos</Text>
            </TouchableOpacity>
          </View>

          {/* Status Actions */}
          {currentJob.status !== 'completed' && currentJob.status !== 'cancelled' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Update Status</Text>
              <View style={styles.statusActions}>
                {currentJob.status === 'pending' && (
                  <TouchableOpacity
                    style={styles.statusActionButton}
                    onPress={() => handleStatusChange('in_progress')}
                    disabled={isUpdatingStatus}
                  >
                    <Text style={styles.statusActionText}>Start Job</Text>
                  </TouchableOpacity>
                )}
                {currentJob.status === 'in_progress' && (
                  <TouchableOpacity
                    style={styles.statusActionButton}
                    onPress={() => handleStatusChange('completed')}
                    disabled={isUpdatingStatus}
                  >
                    <Text style={styles.statusActionText}>Complete Job</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add job notes..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.notesButtonContainer}>
              <TouchableOpacity style={styles.notesButton} onPress={handleNotesUpdate}>
                <Text style={styles.notesButtonText}>Save Notes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default JobDetailScreen;