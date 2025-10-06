/**
 * Schedule Screen
 *
 * View daily and weekly schedules with job assignments
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchShifts } from '../../store/slices/shiftsSlice';

export const ScheduleScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { shifts, loading, selectedDate } = useAppSelector(
    (state) => state.shifts,
  );
  const { isOnline } = useAppSelector((state) => state.offline);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadShifts();
  }, [selectedDate]);

  const loadShifts = async () => {
    try {
      await dispatch(fetchShifts()).unwrap();
    } catch (error) {
      console.error('Failed to load shifts:', error);
    }
  };

  const onRefresh = async () => {
    if (isOnline) {
      setRefreshing(true);
      await loadShifts();
      setRefreshing(false);
    }
  };

  const renderShiftCard = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JobDetails', { jobId: item.jobId })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.jobNumber}>{item.jobNumber}</Text>
        <View style={[styles.statusBadge, getStatusColor(item.status)]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.customerName}>{item.customerName}</Text>

      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>
          {formatTime(item.startTime)} - {formatTime(item.endTime)}
        </Text>
      </View>

      <Text style={styles.location} numberOfLines={1}>
        {item.location}
      </Text>

      <View style={styles.roleContainer}>
        <Text style={styles.roleLabel}>Role:</Text>
        <Text style={styles.roleText}>{item.role}</Text>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'scheduled':
        return { backgroundColor: '#3b82f6' };
      case 'in_progress':
        return { backgroundColor: '#f59e0b' };
      case 'completed':
        return { backgroundColor: '#10b981' };
      default:
        return { backgroundColor: '#6b7280' };
    }
  };

  const formatTime = (time: string) => {
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading schedule...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <Text style={styles.headerSubtitle}>
          {new Date(selectedDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      <FlatList
        data={shifts}
        keyExtractor={(item) => item.shiftId}
        renderItem={renderShiftCard}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No shifts scheduled</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
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
  offlineBanner: {
    backgroundColor: '#f59e0b',
    padding: 8,
    alignItems: 'center',
  },
  offlineText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  jobNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#e5e5e5',
    marginBottom: 8,
  },
  timeContainer: {
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#999',
  },
  location: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 14,
    color: '#999',
    marginRight: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
