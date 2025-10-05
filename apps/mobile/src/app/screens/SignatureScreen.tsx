import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';
import { useJobs } from '../contexts/JobContext';
import { useTheme } from '../contexts/ThemeContext';

const SignatureCaptureScreen = ({ route, navigation }: any) => {
  const { jobId } = route.params;
  const { currentJob, addSignature } = useJobs();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const [signatureType, setSignatureType] = useState<'pickup' | 'delivery'>('pickup');
  const [isSaving, setIsSaving] = useState(false);
  const signatureRef = useRef<any>(null);

  if (!currentJob) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const handleSignature = async (signature: string) => {
    if (!signature) {
      Alert.alert('Error', 'Please provide a signature');
      return;
    }

    setIsSaving(true);
    try {
      await addSignature(jobId, signatureType, signature);
      Alert.alert(
        'Success',
        `${signatureType === 'pickup' ? 'Pickup' : 'Delivery'} signature saved`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save signature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleConfirm = () => {
    Alert.alert(
      'Confirm Signature',
      `Save this signature for ${signatureType === 'pickup' ? 'pickup' : 'delivery'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: () => signatureRef.current?.readSignature(),
        },
      ]
    );
  };

  const signatureStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      background-color: ${colors.surface};
    }
    .m-signature-pad--body {
      border: 2px solid ${colors.border};
      border-radius: 8px;
      background-color: ${colors.background};
    }
    .m-signature-pad--footer {
      display: none;
    }
    body {
      background-color: ${colors.surface};
      margin: 0;
      padding: 16px;
    }
  `;

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
    typeSelector: {
      flexDirection: 'row',
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      padding: spacing.xs,
    },
    typeButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
    },
    activeTypeButton: {
      backgroundColor: colors.secondary,
    },
    typeButtonText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
    },
    activeTypeButtonText: {
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    instructionText: {
      fontSize: fontSize.base,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    signatureContainer: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      overflow: 'hidden',
      minHeight: height * 0.4,
    },
    signatureCanvas: {
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.lg,
      gap: spacing.md,
    },
    actionButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    clearButton: {
      backgroundColor: colors.error,
    },
    confirmButton: {
      backgroundColor: colors.success,
    },
    actionButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    statusContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: colors.surface,
      padding: spacing.md,
      marginBottom: spacing.lg,
      borderRadius: borderRadius.md,
    },
    statusItem: {
      alignItems: 'center',
    },
    statusLabel: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
      marginBottom: spacing.xs,
    },
    statusIndicator: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.border,
    },
    statusComplete: {
      backgroundColor: colors.success,
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

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              signatureType === 'pickup' && styles.activeTypeButton,
            ]}
            onPress={() => setSignatureType('pickup')}
          >
            <Text style={[
              styles.typeButtonText,
              signatureType === 'pickup' && styles.activeTypeButtonText,
            ]}>
              Pickup
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              signatureType === 'delivery' && styles.activeTypeButton,
            ]}
            onPress={() => setSignatureType('delivery')}
          >
            <Text style={[
              styles.typeButtonText,
              signatureType === 'delivery' && styles.activeTypeButtonText,
            ]}>
              Delivery
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Signature Status */}
      <View style={styles.content}>
        <View style={styles.statusContainer}>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Pickup Signature</Text>
            <View style={[
              styles.statusIndicator,
              currentJob.signatures?.pickup && styles.statusComplete,
            ]} />
          </View>
          <View style={styles.statusItem}>
            <Text style={styles.statusLabel}>Delivery Signature</Text>
            <View style={[
              styles.statusIndicator,
              currentJob.signatures?.delivery && styles.statusComplete,
            ]} />
          </View>
        </View>

        <Text style={styles.instructionText}>
          Please sign below to confirm {signatureType === 'pickup' ? 'pickup' : 'delivery'} completion
        </Text>

        <View style={styles.signatureContainer}>
          <SignatureScreen
            ref={signatureRef}
            onOK={handleSignature}
            onEmpty={() => Alert.alert('Error', 'Please provide a signature')}
            descriptionText=""
            clearText="Clear"
            confirmText="Save"
            webStyle={signatureStyle}
            autoClear={false}
            backgroundColor={colors.surface}
            penColor={colors.textPrimary}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.clearButton]}
            onPress={handleClear}
            disabled={isSaving}
          >
            <Text style={styles.actionButtonText}>Clear</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.confirmButton]}
            onPress={handleConfirm}
            disabled={isSaving}
          >
            <Text style={styles.actionButtonText}>
              {isSaving ? 'Saving...' : 'Confirm Signature'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default SignatureCaptureScreen;