import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useJobs } from '../contexts/JobContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const DashboardScreen = ({ navigation }: any) => {
  const { user, logout } = useAuth();
  const { jobs, fetchJobs, selectJob, syncOfflineData } = useJobs();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const { isOnline } = useNetworkStatus();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const handleJobPress = (jobId: string) => {
    selectJob(jobId);
    navigation.navigate('JobDetail', { jobId });
  };

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ]
    );
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

  const renderJobItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => handleJobPress(item.id)}
    >
      <View style={styles.jobHeader}>
        <Text style={styles.customerName}>{item.customerName}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.serviceType}>{item.serviceType.replace('_', ' ').toUpperCase()}</Text>

      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>From:</Text>
        <Text style={styles.addressText}>{item.addresses.pickup.address}</Text>
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.addressLabel}>To:</Text>
        <Text style={styles.addressText}>{item.addresses.delivery.address}</Text>
      </View>

      <View style={styles.jobFooter}>
        <Text style={styles.dateText}>
          {new Date(item.scheduledDate).toLocaleDateString()}
        </Text>
        <Text style={styles.priceText}>
          ${item.estimate.totalPrice.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    welcomeText: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    logoutButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.error,
      borderRadius: borderRadius.sm,
    },
    logoutText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    onlineIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: spacing.sm,
    },
    statusText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    sectionTitle: {
      fontSize: fontSize.xl,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
    },
    jobCard: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    jobHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    customerName: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
      flex: 1,
    },
    statusBadge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    serviceType: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.secondary,
      marginBottom: spacing.md,
    },
    addressContainer: {
      marginBottom: spacing.sm,
    },
    addressLabel: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
    },
    addressText: {
      fontSize: fontSize.base,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
    jobFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.divider,
    },
    dateText: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    priceText: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.success,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyText: {
      fontSize: fontSize.lg,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    emptySubtext: {
      fontSize: fontSize.base,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.welcomeText}>
            Welcome, {user?.username}
          </Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statusIndicator}>
          <View
            style={[
              styles.onlineIndicator,
              { backgroundColor: isOnline ? colors.success : colors.error }
            ]}
          />
          <Text style={styles.statusText}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Your Jobs</Text>

        {jobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No jobs assigned</Text>
            <Text style={styles.emptySubtext}>
              Check back later or contact dispatch for job assignments.
            </Text>
          </View>
        ) : (
          <FlatList
            data={jobs}
            renderItem={renderJobItem}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.secondary}
                colors={[colors.secondary]}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

export default DashboardScreen;