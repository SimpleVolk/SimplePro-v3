/**
 * Photo Capture Screen
 *
 * Camera integration with offline queueing for photo uploads
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { uploadPhoto } from '../../store/slices/documentsSlice';

export const PhotoCaptureScreen = ({ route, navigation }: any) => {
  const { jobId, photoType, jobNumber } = route.params;
  const [photos, setPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const dispatch = useAppDispatch();
  const { isOnline } = useAppSelector((state) => state.offline);
  const { pendingUploads } = useAppSelector((state) => state.documents);

  const getPhotoTypeLabel = (type: string) => {
    switch (type) {
      case 'before_move':
        return 'Before Move Photos';
      case 'during_move':
        return 'During Move Photos';
      case 'after_move':
        return 'After Move Photos';
      case 'damage':
        return 'Damage Photos';
      case 'inventory':
        return 'Inventory Photos';
      default:
        return 'Photos';
    }
  };

  const takePhoto = async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
        includeBase64: false,
      });

      if (result.assets && result.assets[0]) {
        setPhotos([...photos, result.assets[0]]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const selectFromLibrary = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 5,
      });

      if (result.assets) {
        setPhotos([...photos, ...result.assets]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select photos');
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
  };

  const handleUploadAll = async () => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Please take at least one photo');
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = photos.map((photo) =>
        dispatch(
          uploadPhoto({
            jobId,
            photoType,
            photoUri: photo.uri,
            fileName: photo.fileName || `photo_${Date.now()}.jpg`,
          }),
        ),
      );

      await Promise.all(uploadPromises);

      if (isOnline) {
        Alert.alert('Success', 'All photos uploaded successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert(
          'Queued for Upload',
          `${photos.length} photo(s) queued. They will be uploaded when you're back online.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      }
    } catch (error: any) {
      if (error.message?.includes('queued')) {
        Alert.alert(
          'Queued for Upload',
          'Photos queued for upload when online',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
      } else {
        Alert.alert('Error', 'Failed to upload some photos');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Offline - Photos will be uploaded when online
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.title}>{getPhotoTypeLabel(photoType)}</Text>
        <Text style={styles.subtitle}>Job #{jobNumber}</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Camera Controls */}
        <View style={styles.controlsContainer}>
          <TouchableOpacity style={styles.cameraButton} onPress={takePhoto}>
            <Text style={styles.cameraButtonText}>📷 Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.libraryButton}
            onPress={selectFromLibrary}
          >
            <Text style={styles.libraryButtonText}>📁 Choose from Library</Text>
          </TouchableOpacity>
        </View>

        {/* Photos Grid */}
        {photos.length > 0 && (
          <View style={styles.photosContainer}>
            <Text style={styles.sectionTitle}>
              Captured Photos ({photos.length})
            </Text>

            <View style={styles.photosGrid}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.photoCard}>
                  <Image
                    source={{ uri: photo.uri }}
                    style={styles.photoImage}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removePhoto(index)}
                  >
                    <Text style={styles.removeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pending Uploads Info */}
        {pendingUploads.length > 0 && (
          <View style={styles.pendingContainer}>
            <Text style={styles.pendingTitle}>
              ⏳ Pending Uploads ({pendingUploads.length})
            </Text>
            <Text style={styles.pendingText}>
              Photos will be uploaded when connection is restored
            </Text>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Photo Guidelines:</Text>
          <Text style={styles.instructionText}>
            • Capture clear, well-lit images
          </Text>
          <Text style={styles.instructionText}>
            • Include multiple angles for damage documentation
          </Text>
          <Text style={styles.instructionText}>
            • Photos are automatically saved offline
          </Text>
          <Text style={styles.instructionText}>
            • Uploads happen in background when online
          </Text>
        </View>
      </ScrollView>

      {/* Upload Button */}
      {photos.length > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.uploadButton, uploading && styles.buttonDisabled]}
            onPress={handleUploadAll}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.uploadButtonText}>
                {isOnline ? 'Upload All Photos' : 'Save for Later Upload'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  },
  content: {
    flex: 1,
  },
  controlsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  libraryButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  libraryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  photosContainer: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e5e5',
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  photoCard: {
    width: '48%',
    aspectRatio: 1,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  pendingContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f59e0b',
    marginBottom: 8,
  },
  pendingText: {
    fontSize: 14,
    color: '#999',
  },
  instructionsContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e5e5',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#999',
    marginBottom: 6,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  uploadButton: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#4a5568',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
