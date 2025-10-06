/**
 * Signature Capture Screen
 *
 * Customer signature capture with offline storage
 */

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import SignatureCanvas from 'react-native-signature-canvas';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uploadSignature } from '../../store/slices/documentsSlice';

export const SignatureCaptureScreen = ({ route, navigation }: any) => {
  const { jobId, jobNumber, customerName } = route.params;
  const signatureRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const dispatch = useAppDispatch();
  const { isOnline } = useAppSelector((state) => state.offline);

  const handleSignature = async (signature: string) => {
    if (!signature) {
      Alert.alert('Error', 'Please provide a signature');
      return;
    }

    setLoading(true);

    try {
      await dispatch(
        uploadSignature({
          jobId,
          signatureData: signature,
          documentType: 'customer_signature',
        }),
      ).unwrap();

      if (isOnline) {
        Alert.alert('Success', 'Signature captured and uploaded!', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert(
          'Signature Saved',
          'Signature saved offline. Will upload when connection is restored.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }
    } catch (error: any) {
      if (error.message?.includes('queued')) {
        Alert.alert('Saved Offline', 'Signature will upload when online', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        Alert.alert('Error', 'Failed to save signature');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    signatureRef.current?.clearSignature();
  };

  const handleEnd = () => {
    signatureRef.current?.readSignature();
  };

  const webStyle = `
    .m-signature-pad {
      box-shadow: none;
      border: none;
      background-color: #2a2a2a;
    }
    .m-signature-pad--body {
      border: 2px solid #3b82f6;
      border-radius: 12px;
      background-color: white;
    }
    .m-signature-pad--footer {
      display: none;
    }
  `;

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Offline - Signature will sync when online
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>Customer Signature</Text>
        <Text style={styles.subtitle}>Job #{jobNumber}</Text>
        <Text style={styles.customerName}>{customerName}</Text>
      </View>

      <View style={styles.instructions}>
        <Text style={styles.instructionTitle}>Please sign below:</Text>
        <Text style={styles.instructionText}>
          By signing, the customer acknowledges completion of the move and
          acceptance of services provided.
        </Text>
      </View>

      <View style={styles.signatureContainer}>
        <SignatureCanvas
          ref={signatureRef}
          onOK={handleSignature}
          onEnd={handleEnd}
          descriptionText=""
          clearText="Clear"
          confirmText="Save"
          webStyle={webStyle}
          autoClear={false}
          imageType="image/png"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.clearButton} onPress={handleClear}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.buttonDisabled]}
          onPress={handleEnd}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Signature</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {isOnline
            ? 'Signature will be uploaded immediately'
            : 'Signature will be uploaded when connection is restored'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  instructions: {
    padding: 16,
    backgroundColor: '#2a2a2a',
    margin: 16,
    borderRadius: 12,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e5e5',
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  signatureContainer: {
    flex: 1,
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  clearButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#4a5568',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
});
