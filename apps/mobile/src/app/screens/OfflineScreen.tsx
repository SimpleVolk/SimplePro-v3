import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useJobs } from '../contexts/JobContext';
import { useTheme } from '../contexts/ThemeContext';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

const OfflineScreen = () => {
  const { syncOfflineData } = useJobs();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const { isOnline, connectionType } = useNetworkStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAttempt, setLastSyncAttempt] = useState<Date | null>(null);

  useEffect(() => {
    if (isOnline && !isSyncing) {
      handleAutoSync();
    }
  }, [isOnline]);

  const handleAutoSync = async () => {
    setIsSyncing(true);
    try {
      await syncOfflineData();
      setLastSyncAttempt(new Date());
    } catch (error) {
      console.error('Auto sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (!isOnline) {
      return;
    }

    setIsSyncing(true);
    try {
      await syncOfflineData();
      setLastSyncAttempt(new Date());
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getConnectionStatusColor = () => {
    if (isOnline) {
      switch (connectionType) {
        case 'wifi':
          return colors.success;
        case 'cellular':
          return colors.warning;
        default:
          return colors.info;
      }
    }
    return colors.error;
  };

  const getConnectionStatusText = () => {
    if (isOnline) {
      switch (connectionType) {
        case 'wifi':
          return 'Connected via WiFi';
        case 'cellular':
          return 'Connected via Cellular';
        default:
          return 'Connected';
      }
    }
    return 'No Internet Connection';
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.xl,
    },
    icon: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    iconText: {
      fontSize: fontSize['2xl'],
      color: colors.textSecondary,
    },
    title: {
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    subtitle: {
      fontSize: fontSize.lg,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      lineHeight: 24,
    },
    statusContainer: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginBottom: spacing.xl,
      width: '100%',
      alignItems: 'center',
    },
    statusIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    statusDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: spacing.sm,
    },
    statusText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
    },
    connectionType: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    syncInfo: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      textAlign: 'center',
    },
    actionsContainer: {
      width: '100%',
      gap: spacing.md,
    },
    syncButton: {
      backgroundColor: colors.secondary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
    },
    syncButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    syncButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
      marginLeft: spacing.sm,
    },
    offlineFeatures: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      marginTop: spacing.xl,
      width: '100%',
    },
    featuresTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
      textAlign: 'center',
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    featureBullet: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.success,
      marginRight: spacing.md,
    },
    featureText: {
      fontSize: fontSize.base,
      color: colors.textSecondary,
      flex: 1,
    },
    retryButton: {
      backgroundColor: colors.info,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    retryButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
  });

  if (isOnline) {
    return (
      <View style={styles.container}>
        <View style={styles.icon}>
          <Text style={styles.iconText}>📶</Text>
        </View>

        <Text style={styles.title}>Back Online!</Text>
        <Text style={styles.subtitle}>
          Your connection has been restored. Syncing your data...
        </Text>

        <View style={styles.statusContainer}>
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getConnectionStatusColor() }]} />
            <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
          </View>

          {isSyncing ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={colors.secondary} />
              <Text style={[styles.syncInfo, { marginLeft: spacing.sm }]}>
                Syncing offline data...
              </Text>
            </View>
          ) : (
            <Text style={styles.syncInfo}>
              {lastSyncAttempt
                ? `Last synced: ${lastSyncAttempt.toLocaleTimeString()}`
                : 'Ready to sync'
              }
            </Text>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.syncButton, (!isOnline || isSyncing) && styles.syncButtonDisabled]}
            onPress={handleManualSync}
            disabled={!isOnline || isSyncing}
          >
            {isSyncing && <ActivityIndicator size="small" color={colors.textPrimary} />}
            <Text style={styles.syncButtonText}>
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Text style={styles.iconText}>📡</Text>
      </View>

      <Text style={styles.title}>You're Offline</Text>
      <Text style={styles.subtitle}>
        No internet connection detected. You can still view and update job information.
        Changes will be synced when you're back online.
      </Text>

      <View style={styles.statusContainer}>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: getConnectionStatusColor() }]} />
          <Text style={styles.statusText}>{getConnectionStatusText()}</Text>
        </View>
        <Text style={styles.connectionType}>
          Offline mode active
        </Text>
        <Text style={styles.syncInfo}>
          {lastSyncAttempt
            ? `Last synced: ${lastSyncAttempt.toLocaleTimeString()}`
            : 'Waiting for connection'
          }
        </Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            // This will trigger the network status check
            console.log('Checking connection...');
          }}
        >
          <Text style={styles.retryButtonText}>Check Connection</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.offlineFeatures}>
        <Text style={styles.featuresTitle}>Available Offline</Text>

        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>View job details and schedules</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>Complete checklists</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>Capture signatures</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>Take photos</Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.featureBullet} />
          <Text style={styles.featureText}>Update job notes</Text>
        </View>
      </View>
    </View>
  );
};

export default OfflineScreen;