/**
 * Job Detail Screen
 *
 * Complete job information with crew details and action buttons
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchJobDetails } from '../../store/slices/jobsSlice';
import { styles } from './JobDetailScreen.styles';

interface CrewMember {
  userId: string;
  name: string;
  role: string;
  status?: string;
}

export const JobDetailScreen = ({ route, navigation }: any) => {
  const { jobId } = route.params;
  const dispatch = useAppDispatch();
  const { currentJob, loading, checkInStatus } = useAppSelector(
    (state) => state.jobs,
  );
  const { isOnline } = useAppSelector((state) => state.offline);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      await dispatch(fetchJobDetails(jobId)).unwrap();
    } catch (error: any) {
      if (!isOnline) {
        // In offline mode, show cached data if available
        console.log('Offline - showing cached job data');
      } else {
        Alert.alert('Error', error.message || 'Failed to load job details');
      }
    }
  };

  const onRefresh = async () => {
    if (isOnline) {
      setRefreshing(true);
      await loadJobDetails();
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return styles.statusScheduled;
      case 'in_progress':
        return styles.statusInProgress;
      case 'completed':
        return styles.statusCompleted;
      case 'cancelled':
        return styles.statusCancelled;
      case 'on_hold':
        return styles.statusOnHold;
      default:
        return styles.statusDefault;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return styles.priorityUrgent;
      case 'high':
        return styles.priorityHigh;
      case 'normal':
        return styles.priorityNormal;
      case 'low':
        return styles.priorityLow;
      default:
        return styles.priorityDefault;
    }
  };

  const handleCallCustomer = (phoneNumber?: string) => {
    if (!phoneNumber) {
      Alert.alert('Error', 'No phone number available');
      return;
    }

    const phoneUrl = Platform.OS === 'ios' ? `telprompt:${phoneNumber}` : `tel:${phoneNumber}`;

    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Phone dialer not available');
        }
      })
      .catch((err) => Alert.alert('Error', 'Failed to open dialer'));
  };

  const handleNavigate = (address: string, city: string, state: string, zipCode: string) => {
    const fullAddress = `${address}, ${city}, ${state} ${zipCode}`;
    const encodedAddress = encodeURIComponent(fullAddress);

    const url = Platform.select({
      ios: `maps://app?daddr=${encodedAddress}`,
      android: `google.navigation:q=${encodedAddress}`,
    }) as string;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        } else {
          // Fallback to web maps
          const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
          return Linking.openURL(webUrl);
        }
      })
      .catch((err) => Alert.alert('Error', 'Failed to open maps'));
  };

  const handleCheckIn = () => {
    if (!currentJob) return;

    const jobLocation = currentJob.pickupLocation?.latitude
      ? {
          latitude: currentJob.pickupLocation.latitude,
          longitude: currentJob.pickupLocation.longitude,
        }
      : null;

    navigation.navigate('CheckIn', {
      jobId: currentJob.jobId,
      jobLocation,
    });
  };

  const handleAddPhotos = () => {
    if (!currentJob) return;

    Alert.alert(
      'Select Photo Type',
      'What type of photos are you taking?',
      [
        {
          text: 'Before Move',
          onPress: () =>
            navigation.navigate('PhotoCapture', {
              jobId: currentJob.jobId,
              photoType: 'before_move',
              jobNumber: currentJob.jobNumber,
            }),
        },
        {
          text: 'During Move',
          onPress: () =>
            navigation.navigate('PhotoCapture', {
              jobId: currentJob.jobId,
              photoType: 'during_move',
              jobNumber: currentJob.jobNumber,
            }),
        },
        {
          text: 'After Move',
          onPress: () =>
            navigation.navigate('PhotoCapture', {
              jobId: currentJob.jobId,
              photoType: 'after_move',
              jobNumber: currentJob.jobNumber,
            }),
        },
        {
          text: 'Damage',
          onPress: () =>
            navigation.navigate('PhotoCapture', {
              jobId: currentJob.jobId,
              photoType: 'damage',
              jobNumber: currentJob.jobNumber,
            }),
        },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const handleAddSignature = () => {
    if (!currentJob) return;

    navigation.navigate('SignatureCapture', {
      jobId: currentJob.jobId,
      jobNumber: currentJob.jobNumber,
      customerName: currentJob.customerName,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const isCheckedIn = currentJob ? checkInStatus[currentJob.jobId]?.checkedIn : false;

  if (loading && !currentJob) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!currentJob) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Job not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadJobDetails}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode - Showing Cached Data</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          Platform.OS === 'ios' ? (
            <ActivityIndicator
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          ) : undefined
        }
      >
        {/* Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.jobNumber}>Job #{currentJob.jobNumber}</Text>
              <Text style={styles.customerName}>{currentJob.customerName}</Text>
            </View>
            <View style={[styles.statusBadge, getStatusColor(currentJob.status)]}>
              <Text style={styles.statusText}>
                {currentJob.status?.replace('_', ' ')}
              </Text>
            </View>
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.priorityBadge, getPriorityColor(currentJob.priority)]}>
              <Text style={styles.priorityText}>
                {currentJob.priority || 'Normal'}
              </Text>
            </View>
            <Text style={styles.serviceType}>
              {currentJob.serviceType?.replace('_', ' ')}
            </Text>
          </View>
        </View>

        {/* Schedule Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>
              {formatDate(currentJob.scheduledDate)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Time:</Text>
            <Text style={styles.infoValue}>
              {formatTime(currentJob.estimatedStartTime)} - {formatTime(currentJob.estimatedEndTime)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>
              {currentJob.estimatedHours} hours
            </Text>
          </View>
        </View>

        {/* Locations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Locations</Text>

          {/* Pickup Location */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationLabel}>Pickup Location</Text>
              <TouchableOpacity
                onPress={() =>
                  handleNavigate(
                    currentJob.pickupLocation.address,
                    currentJob.pickupLocation.city,
                    currentJob.pickupLocation.state,
                    currentJob.pickupLocation.zipCode,
                  )
                }
              >
                <Text style={styles.navigateButton}>Navigate</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addressText}>{currentJob.pickupLocation.address}</Text>
            <Text style={styles.addressText}>
              {currentJob.pickupLocation.city}, {currentJob.pickupLocation.state} {currentJob.pickupLocation.zipCode}
            </Text>
          </View>

          {/* Delivery Location */}
          <View style={styles.locationCard}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationLabel}>Delivery Location</Text>
              <TouchableOpacity
                onPress={() =>
                  handleNavigate(
                    currentJob.deliveryLocation.address,
                    currentJob.deliveryLocation.city,
                    currentJob.deliveryLocation.state,
                    currentJob.deliveryLocation.zipCode,
                  )
                }
              >
                <Text style={styles.navigateButton}>Navigate</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addressText}>{currentJob.deliveryLocation.address}</Text>
            <Text style={styles.addressText}>
              {currentJob.deliveryLocation.city}, {currentJob.deliveryLocation.state} {currentJob.deliveryLocation.zipCode}
            </Text>
          </View>
        </View>

        {/* Crew Information */}
        {currentJob.crewAssigned && currentJob.crewAssigned.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Crew Members ({currentJob.crewAssigned.length})
            </Text>
            {currentJob.crewAssigned.map((member: any, index: number) => (
              <View
                key={member.userId || index}
                style={[
                  styles.crewCard,
                  member.userId === currentJob.crewLeadId && styles.crewLeadCard,
                ]}
              >
                <View style={styles.crewInfo}>
                  <Text style={styles.crewName}>
                    {member.name || `Crew Member ${index + 1}`}
                    {member.userId === currentJob.crewLeadId && ' (Lead)'}
                  </Text>
                  <Text style={styles.crewRole}>{member.role || 'Crew Member'}</Text>
                </View>
                {member.status && (
                  <View style={styles.crewStatusBadge}>
                    <Text style={styles.crewStatusText}>{member.status}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Financial Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estimated Cost:</Text>
            <Text style={styles.infoValueHighlight}>
              ${currentJob.totalCost?.toFixed(2) || '0.00'}
            </Text>
          </View>
        </View>

        {/* Special Instructions */}
        {currentJob.specialInstructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <View style={styles.instructionsCard}>
              <Text style={styles.instructionsText}>
                {currentJob.specialInstructions}
              </Text>
            </View>
          </View>
        )}

        {/* Check-in Status */}
        {isCheckedIn && (
          <View style={styles.checkedInBanner}>
            <Text style={styles.checkedInText}>
              Checked In at {formatTime(checkInStatus[currentJob.jobId].checkInTime || '')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons Footer */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.checkInButton, isCheckedIn && styles.buttonDisabled]}
            onPress={handleCheckIn}
            disabled={isCheckedIn}
          >
            <Text style={styles.actionButtonText}>
              {isCheckedIn ? 'Checked In' : 'Check In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.photosButton]}
            onPress={handleAddPhotos}
          >
            <Text style={styles.actionButtonText}>Add Photos</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.signatureButton]}
            onPress={handleAddSignature}
          >
            <Text style={styles.actionButtonText}>Add Signature</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.callButton]}
            onPress={() => handleCallCustomer(currentJob.customer?.phone || currentJob.customer?.phoneNumber)}
          >
            <Text style={styles.actionButtonText}>Call Customer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
