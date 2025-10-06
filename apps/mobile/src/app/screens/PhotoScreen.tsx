import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
} from 'react-native-image-picker';
import { useJobs } from '../contexts/JobContext';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

const PhotoScreen = ({ route }: any) => {
  const { jobId } = route.params;
  const { currentJob, addPhoto } = useJobs();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const [selectedType, setSelectedType] = useState<
    'before' | 'during' | 'after' | 'damage' | 'inventory'
  >('before');
  const [modalVisible, setModalVisible] = useState(false);
  const [photoDescription, setPhotoDescription] = useState('');
  const [tempPhotoUri, setTempPhotoUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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
      marginBottom: spacing.md,
    },
    typeSelector: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    typeButton: {
      flex: 1,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.xs,
      borderRadius: borderRadius.sm,
      alignItems: 'center',
      backgroundColor: colors.background,
      marginHorizontal: 2,
    },
    activeTypeButton: {
      backgroundColor: colors.secondary,
    },
    typeButtonText: {
      fontSize: fontSize.xs,
      fontWeight: fontWeight.medium,
      color: colors.textSecondary,
    },
    activeTypeButtonText: {
      color: colors.textPrimary,
    },
    addButton: {
      backgroundColor: colors.success,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    addButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    typeSection: {
      marginBottom: spacing.lg,
    },
    typeSectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },
    typeHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    typeIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: spacing.sm,
    },
    typeSectionTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    photoCount: {
      backgroundColor: colors.secondary,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      minWidth: 24,
      alignItems: 'center',
    },
    photoCountText: {
      fontSize: fontSize.sm,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
    },
    photoItem: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
    },
    photoThumbnail: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.sm,
      marginRight: spacing.md,
    },
    photoInfo: {
      flex: 1,
    },
    photoDescription: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    photoTimestamp: {
      fontSize: fontSize.sm,
      color: colors.textSecondary,
    },
    emptyPhotoSection: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    emptyPhotoText: {
      fontSize: fontSize.base,
      color: colors.textMuted,
    },
    modal: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      width: width * 0.9,
      maxHeight: '80%',
    },
    modalTitle: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.lg,
    },
    modalPhoto: {
      width: '100%',
      height: 200,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
    },
    modalInput: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      fontSize: fontSize.base,
      color: colors.textPrimary,
      marginBottom: spacing.lg,
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    modalButton: {
      flex: 1,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    cancelButton: {
      backgroundColor: colors.error,
    },
    saveButton: {
      backgroundColor: colors.success,
    },
    modalButtonText: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    errorText: {
      fontSize: fontSize.lg,
      color: colors.error,
      textAlign: 'center',
    },
  });

  if (!currentJob) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const photoTypes = [
    { key: 'before', label: 'Before', color: colors.info },
    { key: 'during', label: 'During', color: colors.warning },
    { key: 'after', label: 'After', color: colors.success },
    { key: 'damage', label: 'Damage', color: colors.error },
    { key: 'inventory', label: 'Inventory', color: colors.accent },
  ];

  const showImagePicker = () => {
    Alert.alert('Select Photo', 'Choose how to add a photo', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Camera', onPress: () => openCamera() },
      { text: 'Photo Library', onPress: () => openLibrary() },
    ]);
  };

  const openCamera = () => {
    launchCamera(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      },
      handleImageResponse,
    );
  };

  const openLibrary = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      },
      handleImageResponse,
    );
  };

  const handleImageResponse = (response: ImagePickerResponse) => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      if (asset.uri) {
        setTempPhotoUri(asset.uri);
        setModalVisible(true);
      }
    }
  };

  const handleSavePhoto = async () => {
    if (!tempPhotoUri || !photoDescription.trim()) {
      Alert.alert('Error', 'Please provide a description for the photo');
      return;
    }

    setIsUploading(true);
    try {
      await addPhoto(jobId, {
        uri: tempPhotoUri,
        description: photoDescription.trim(),
        type: selectedType,
      });

      setModalVisible(false);
      setTempPhotoUri(null);
      setPhotoDescription('');
      Alert.alert('Success', 'Photo added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelPhoto = () => {
    setModalVisible(false);
    setTempPhotoUri(null);
    setPhotoDescription('');
  };

  const getPhotosByType = (type: string) => {
    return currentJob.photos.filter((photo) => photo.type === type);
  };

  const renderPhotoItem = ({ item }: { item: any }) => (
    <View style={styles.photoItem}>
      <Image source={{ uri: item.uri }} style={styles.photoThumbnail} />
      <View style={styles.photoInfo}>
        <Text style={styles.photoDescription}>{item.description}</Text>
        <Text style={styles.photoTimestamp}>
          {new Date(item.timestamp).toLocaleString()}
        </Text>
      </View>
    </View>
  );

  const renderTypeSection = (type: any) => {
    const photos = getPhotosByType(type.key);

    return (
      <View key={type.key} style={styles.typeSection}>
        <View style={styles.typeSectionHeader}>
          <View style={styles.typeHeaderLeft}>
            <View
              style={[styles.typeIndicator, { backgroundColor: type.color }]}
            />
            <Text style={styles.typeSectionTitle}>{type.label}</Text>
          </View>
          <View style={styles.photoCount}>
            <Text style={styles.photoCountText}>{photos.length}</Text>
          </View>
        </View>

        {photos.length === 0 ? (
          <View style={styles.emptyPhotoSection}>
            <Text style={styles.emptyPhotoText}>
              No {type.label.toLowerCase()} photos
            </Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            renderItem={renderPhotoItem}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
          />
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.customerName}>{currentJob.customerName}</Text>

        <View style={styles.typeSelector}>
          {photoTypes.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[
                styles.typeButton,
                selectedType === type.key && styles.activeTypeButton,
              ]}
              onPress={() => setSelectedType(type.key as any)}
            >
              <Text
                style={[
                  styles.typeButtonText,
                  selectedType === type.key && styles.activeTypeButtonText,
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={showImagePicker}>
          <Text style={styles.addButtonText}>Add Photo</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.content}
        data={photoTypes}
        renderItem={({ item }) => renderTypeSection(item)}
        keyExtractor={(item) => item.key}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancelPhoto}
      >
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Photo Description</Text>

            {tempPhotoUri && (
              <Image source={{ uri: tempPhotoUri }} style={styles.modalPhoto} />
            )}

            <TextInput
              style={styles.modalInput}
              value={photoDescription}
              onChangeText={setPhotoDescription}
              placeholder="Describe this photo..."
              placeholderTextColor={colors.textMuted}
              multiline
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCancelPhoto}
                disabled={isUploading}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSavePhoto}
                disabled={isUploading}
              >
                <Text style={styles.modalButtonText}>
                  {isUploading ? 'Saving...' : 'Save Photo'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default PhotoScreen;
