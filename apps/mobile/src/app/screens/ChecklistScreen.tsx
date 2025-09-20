import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useJobs } from '../contexts/JobContext';
import { useTheme } from '../contexts/ThemeContext';

const ChecklistScreen = ({ route }: any) => {
  const { jobId } = route.params;
  const { currentJob, updateChecklist } = useJobs();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  if (!currentJob) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const handleChecklistToggle = async (item: any) => {
    if (updatingItems.has(item.id)) return;

    setUpdatingItems(prev => new Set(prev).add(item.id));

    const updatedItem = {
      ...item,
      completed: !item.completed,
      timestamp: new Date().toISOString(),
    };

    try {
      await updateChecklist(jobId, updatedItem);
    } catch (error) {
      Alert.alert('Error', 'Failed to update checklist item');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(item.id);
        return newSet;
      });
    }
  };

  const getCompletionStats = () => {
    const completed = currentJob.checklist.filter(item => item.completed).length;
    const total = currentJob.checklist.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { completed, total, percentage };
  };

  const renderChecklistItem = ({ item }: { item: any }) => {
    const isUpdating = updatingItems.has(item.id);

    return (
      <TouchableOpacity
        style={[
          styles.checklistItem,
          item.completed && styles.completedItem,
          isUpdating && styles.updatingItem,
        ]}
        onPress={() => handleChecklistToggle(item)}
        disabled={isUpdating}
      >
        <View style={styles.checkboxContainer}>
          <View style={[
            styles.checkbox,
            item.completed && styles.checkedBox,
            isUpdating && styles.updatingBox,
          ]}>
            {item.completed && !isUpdating && (
              <Text style={styles.checkmark}>✓</Text>
            )}
            {isUpdating && (
              <Text style={styles.updating}>⟳</Text>
            )}
          </View>
          {item.required && (
            <View style={styles.requiredBadge}>
              <Text style={styles.requiredText}>Required</Text>
            </View>
          )}
        </View>

        <View style={styles.itemContent}>
          <Text style={[
            styles.itemDescription,
            item.completed && styles.completedText,
          ]}>
            {item.description}
          </Text>
          {item.timestamp && (
            <Text style={styles.timestampText}>
              Completed: {new Date(item.timestamp).toLocaleString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const stats = getCompletionStats();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    customerName: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    progressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressText: {
      fontSize: fontSize.base,
      color: colors.textSecondary,
    },
    progressBar: {
      flex: 1,
      height: 8,
      backgroundColor: colors.background,
      borderRadius: borderRadius.sm,
      marginHorizontal: spacing.md,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.success,
      borderRadius: borderRadius.sm,
    },
    progressPercentage: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
      minWidth: 40,
      textAlign: 'right',
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
    checklistItem: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
    },
    completedItem: {
      backgroundColor: colors.background,
      borderColor: colors.success,
    },
    updatingItem: {
      opacity: 0.6,
    },
    checkboxContainer: {
      marginRight: spacing.md,
      alignItems: 'center',
    },
    checkbox: {
      width: 28,
      height: 28,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: borderRadius.sm,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      marginBottom: spacing.sm,
    },
    checkedBox: {
      backgroundColor: colors.success,
      borderColor: colors.success,
    },
    updatingBox: {
      borderColor: colors.info,
    },
    checkmark: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
    },
    updating: {
      fontSize: fontSize.base,
      color: colors.info,
    },
    requiredBadge: {
      backgroundColor: colors.error,
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    requiredText: {
      fontSize: 10,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    itemContent: {
      flex: 1,
    },
    itemDescription: {
      fontSize: fontSize.base,
      color: colors.textPrimary,
      lineHeight: 22,
    },
    completedText: {
      color: colors.textSecondary,
      textDecorationLine: 'line-through',
    },
    timestampText: {
      fontSize: fontSize.sm,
      color: colors.textMuted,
      marginTop: spacing.xs,
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
    errorText: {
      fontSize: fontSize.lg,
      color: colors.error,
      textAlign: 'center',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.customerName}>{currentJob.customerName}</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {stats.completed}/{stats.total}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${stats.percentage}%` }
              ]}
            />
          </View>
          <Text style={styles.progressPercentage}>
            {stats.percentage}%
          </Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Job Checklist</Text>

        {currentJob.checklist.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No checklist items</Text>
            <Text style={styles.emptySubtext}>
              This job doesn't have any checklist items configured.
            </Text>
          </View>
        ) : (
          <FlatList
            data={currentJob.checklist}
            renderItem={renderChecklistItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
};

export default ChecklistScreen;