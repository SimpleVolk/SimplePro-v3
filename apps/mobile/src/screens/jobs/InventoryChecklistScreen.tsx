/**
 * Inventory Checklist Screen
 *
 * Full inventory tracking with offline support, photo attachments, and status management
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchInventory,
  addCustomItem,
  updateItemStatus,
  uploadItemPhoto,
  bulkUpdateStatus,
  setSearchQuery,
  setSelectedCategory,
  clearCurrentChecklist,
  initializePresetItems,
} from '../../store/slices/inventorySlice';
import {
  InventoryItem,
  ItemCondition,
  ItemStatus,
  ITEM_CATEGORIES,
  CreateInventoryItemDto,
} from '../../types/inventory.types';

interface Props {
  route: {
    params: {
      jobId: string;
      jobNumber: string;
      customerName: string;
    };
  };
  navigation: any;
}

export const InventoryChecklistScreen: React.FC<Props> = ({
  route,
  navigation,
}) => {
  const { jobId, jobNumber, customerName } = route.params;
  const dispatch = useAppDispatch();
  const { isOnline } = useAppSelector((state) => state.offline);
  const {
    currentChecklist,
    searchQuery,
    selectedCategory,
    loading,
    error,
    pendingPhotoUploads,
  } = useAppSelector((state) => state.inventory);

  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showItemDetailsModal, setShowItemDetailsModal] = useState(false);

  // Load inventory on mount
  useEffect(() => {
    const loadInventory = async () => {
      try {
        await dispatch(fetchInventory(jobId)).unwrap();
      } catch (err) {
        // If no inventory exists, initialize with preset items
        await dispatch(initializePresetItems(jobId)).unwrap();
      }
    };
    loadInventory();

    return () => {
      dispatch(clearCurrentChecklist());
    };
  }, [jobId, dispatch]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (!currentChecklist) return [];

    let items = currentChecklist.items;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description?.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query),
      );
    }

    // Filter by category
    if (selectedCategory) {
      items = items.filter((item) => item.category === selectedCategory);
    }

    return items;
  }, [currentChecklist, searchQuery, selectedCategory]);

  // Stats
  const stats = useMemo(() => {
    if (!currentChecklist) {
      return {
        total: 0,
        notStarted: 0,
        loaded: 0,
        delivered: 0,
        damaged: 0,
      };
    }

    return {
      total: currentChecklist.totalItems,
      notStarted: currentChecklist.items.filter(
        (item) => item.status === 'not_started',
      ).length,
      loaded: currentChecklist.loadedItems,
      delivered: currentChecklist.deliveredItems,
      damaged: currentChecklist.damagedItems,
    };
  }, [currentChecklist]);

  const handleItemPress = (item: InventoryItem) => {
    setSelectedItem(item);
    setShowItemDetailsModal(true);
  };

  const handleUpdateCondition = async (
    item: InventoryItem,
    condition: ItemCondition,
  ) => {
    try {
      await dispatch(
        updateItemStatus({
          jobId,
          itemId: item.itemId,
          updateData: { condition },
        }),
      ).unwrap();
    } catch (err) {
      if (!err.message?.includes('queued')) {
        Alert.alert('Error', 'Failed to update item condition');
      }
    }
  };

  const handleUpdateStatus = async (
    item: InventoryItem,
    status: ItemStatus,
  ) => {
    try {
      await dispatch(
        updateItemStatus({
          jobId,
          itemId: item.itemId,
          updateData: { status },
        }),
      ).unwrap();
    } catch (err) {
      if (!err.message?.includes('queued')) {
        Alert.alert('Error', 'Failed to update item status');
      }
    }
  };

  const handleUpdateNotes = async (item: InventoryItem, notes: string) => {
    try {
      await dispatch(
        updateItemStatus({
          jobId,
          itemId: item.itemId,
          updateData: { notes },
        }),
      ).unwrap();
    } catch (err) {
      if (!err.message?.includes('queued')) {
        Alert.alert('Error', 'Failed to update notes');
      }
    }
  };

  const handleMarkAllAsLoaded = async () => {
    const notLoadedItems = currentChecklist?.items
      .filter((item) => item.status === 'not_started')
      .map((item) => item.itemId);

    if (!notLoadedItems || notLoadedItems.length === 0) {
      Alert.alert('Info', 'All items are already marked as loaded');
      return;
    }

    Alert.alert(
      'Mark All as Loaded',
      `Mark ${notLoadedItems.length} items as loaded?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await dispatch(
                bulkUpdateStatus({
                  jobId,
                  itemIds: notLoadedItems,
                  status: 'loaded',
                }),
              ).unwrap();
              Alert.alert('Success', 'All items marked as loaded');
            } catch (err) {
              if (!err.message?.includes('queued')) {
                Alert.alert('Error', 'Failed to update items');
              }
            }
          },
        },
      ],
    );
  };

  const handleMarkAllAsDelivered = async () => {
    const loadedItems = currentChecklist?.items
      .filter((item) => item.status === 'loaded')
      .map((item) => item.itemId);

    if (!loadedItems || loadedItems.length === 0) {
      Alert.alert('Info', 'No loaded items to mark as delivered');
      return;
    }

    Alert.alert(
      'Mark All as Delivered',
      `Mark ${loadedItems.length} loaded items as delivered?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await dispatch(
                bulkUpdateStatus({
                  jobId,
                  itemIds: loadedItems,
                  status: 'delivered',
                }),
              ).unwrap();
              Alert.alert('Success', 'All items marked as delivered');
            } catch (err) {
              if (!err.message?.includes('queued')) {
                Alert.alert('Error', 'Failed to update items');
              }
            }
          },
        },
      ],
    );
  };

  const handleTakePhoto = async (item: InventoryItem) => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        saveToPhotos: true,
      });

      if (result.assets && result.assets[0]) {
        const photo = result.assets[0];
        await dispatch(
          uploadItemPhoto({
            jobId,
            itemId: item.itemId,
            photoUri: photo.uri!,
            fileName: photo.fileName || `item_${item.itemId}_${Date.now()}.jpg`,
          }),
        ).unwrap();

        Alert.alert(
          'Success',
          isOnline ? 'Photo uploaded' : 'Photo queued for upload',
        );
      }
    } catch (err) {
      if (!err.message?.includes('queued')) {
        Alert.alert('Error', 'Failed to capture photo');
      }
    }
  };

  const renderConditionBadge = (condition: ItemCondition) => {
    const colors = {
      excellent: '#10b981',
      good: '#3b82f6',
      fair: '#f59e0b',
      damaged: '#ef4444',
    };

    return (
      <View style={[styles.conditionBadge, { backgroundColor: colors[condition] }]}>
        <Text style={styles.conditionText}>
          {condition.charAt(0).toUpperCase() + condition.slice(1)}
        </Text>
      </View>
    );
  };

  const renderStatusBadge = (status: ItemStatus) => {
    const colors = {
      not_started: '#6b7280',
      loaded: '#3b82f6',
      delivered: '#10b981',
    };

    const labels = {
      not_started: 'Not Started',
      loaded: 'Loaded',
      delivered: 'Delivered',
    };

    return (
      <View style={[styles.statusBadge, { backgroundColor: colors[status] }]}>
        <Text style={styles.statusText}>{labels[status]}</Text>
      </View>
    );
  };

  const renderItem = (item: InventoryItem) => {
    const isDamaged = item.condition === 'damaged';

    return (
      <TouchableOpacity
        key={item.itemId}
        style={[
          styles.itemCard,
          isDamaged && styles.itemCardDamaged,
        ]}
        onPress={() => handleItemPress(item)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleContainer}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.quantity > 1 && (
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
            )}
          </View>
          {isDamaged && <Text style={styles.damageFlag}>⚠️ DAMAGED</Text>}
        </View>

        {item.description && (
          <Text style={styles.itemDescription}>{item.description}</Text>
        )}

        <View style={styles.itemBadges}>
          {renderStatusBadge(item.status)}
          {renderConditionBadge(item.condition)}
        </View>

        {item.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesLabel}>Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {item.photos.length > 0 && (
          <View style={styles.photosIndicator}>
            <Text style={styles.photosText}>📷 {item.photos.length} photo(s)</Text>
          </View>
        )}

        <View style={styles.itemActions}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              item.status === 'not_started' && styles.actionButtonPrimary,
            ]}
            onPress={() => handleUpdateStatus(item, 'loaded')}
            disabled={item.status !== 'not_started'}
          >
            <Text
              style={[
                styles.actionButtonText,
                item.status === 'not_started' && styles.actionButtonTextPrimary,
              ]}
            >
              ✓ Mark Loaded
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              item.status === 'loaded' && styles.actionButtonPrimary,
            ]}
            onPress={() => handleUpdateStatus(item, 'delivered')}
            disabled={item.status !== 'loaded'}
          >
            <Text
              style={[
                styles.actionButtonText,
                item.status === 'loaded' && styles.actionButtonTextPrimary,
              ]}
            >
              ✓ Delivered
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => handleTakePhoto(item)}
          >
            <Text style={styles.photoButtonText}>📷</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !currentChecklist) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Offline Banner */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Offline - Changes will sync when online
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Checklist</Text>
        <Text style={styles.subtitle}>
          Job #{jobNumber} - {customerName}
        </Text>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#6b7280' }]}>
            {stats.notStarted}
          </Text>
          <Text style={styles.statLabel}>Not Started</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#3b82f6' }]}>
            {stats.loaded}
          </Text>
          <Text style={styles.statLabel}>Loaded</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#10b981' }]}>
            {stats.delivered}
          </Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
        {stats.damaged > 0 && (
          <>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: '#ef4444' }]}>
                {stats.damaged}
              </Text>
              <Text style={styles.statLabel}>Damaged</Text>
            </View>
          </>
        )}
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={(text) => dispatch(setSearchQuery(text))}
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddItemModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Item</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryFilter}
        contentContainerStyle={styles.categoryFilterContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            !selectedCategory && styles.categoryChipActive,
          ]}
          onPress={() => dispatch(setSelectedCategory(null))}
        >
          <Text
            style={[
              styles.categoryChipText,
              !selectedCategory && styles.categoryChipTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        {Object.values(ITEM_CATEGORIES).map((category) => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              selectedCategory === category && styles.categoryChipActive,
            ]}
            onPress={() => dispatch(setSelectedCategory(category))}
          >
            <Text
              style={[
                styles.categoryChipText,
                selectedCategory === category && styles.categoryChipTextActive,
              ]}
            >
              {category}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bulk Actions */}
      <View style={styles.bulkActionsContainer}>
        <TouchableOpacity
          style={styles.bulkActionButton}
          onPress={handleMarkAllAsLoaded}
        >
          <Text style={styles.bulkActionText}>Mark All Loaded</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.bulkActionButton}
          onPress={handleMarkAllAsDelivered}
        >
          <Text style={styles.bulkActionText}>Mark All Delivered</Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <ScrollView style={styles.itemsList}>
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No items found</Text>
            {searchQuery && (
              <TouchableOpacity
                onPress={() => dispatch(setSearchQuery(''))}
                style={styles.clearSearchButton}
              >
                <Text style={styles.clearSearchText}>Clear search</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredItems.map(renderItem)
        )}
      </ScrollView>

      {/* Pending Uploads Indicator */}
      {pendingPhotoUploads.length > 0 && (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingText}>
            ⏳ {pendingPhotoUploads.length} photo(s) pending upload
          </Text>
        </View>
      )}

      {/* Add Item Modal */}
      <AddItemModal
        visible={showAddItemModal}
        onClose={() => setShowAddItemModal(false)}
        jobId={jobId}
        onItemAdded={() => setShowAddItemModal(false)}
      />

      {/* Item Details Modal */}
      <ItemDetailsModal
        visible={showItemDetailsModal}
        item={selectedItem}
        onClose={() => {
          setShowItemDetailsModal(false);
          setSelectedItem(null);
        }}
        jobId={jobId}
        onUpdateCondition={handleUpdateCondition}
        onUpdateNotes={handleUpdateNotes}
      />
    </View>
  );
};

// Add Item Modal Component
const AddItemModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  jobId: string;
  onItemAdded: () => void;
}> = ({ visible, onClose, jobId, onItemAdded }) => {
  const dispatch = useAppDispatch();
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(ITEM_CATEGORIES.CUSTOM);
  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!itemName.trim()) {
      Alert.alert('Error', 'Please enter an item name');
      return;
    }

    setSubmitting(true);

    try {
      const itemData: CreateInventoryItemDto = {
        name: itemName.trim(),
        description: description.trim() || undefined,
        category,
        quantity: parseInt(quantity) || 1,
      };

      await dispatch(addCustomItem({ jobId, itemData })).unwrap();

      Alert.alert('Success', 'Item added successfully');
      setItemName('');
      setDescription('');
      setQuantity('1');
      onItemAdded();
    } catch (err) {
      if (!err.message?.includes('queued')) {
        Alert.alert('Error', 'Failed to add item');
      } else {
        Alert.alert('Queued', 'Item will be added when online');
        onItemAdded();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Custom Item</Text>

          <TextInput
            style={styles.input}
            placeholder="Item name *"
            placeholderTextColor="#6b7280"
            value={itemName}
            onChangeText={setItemName}
          />

          <TextInput
            style={styles.input}
            placeholder="Description (optional)"
            placeholderTextColor="#6b7280"
            value={description}
            onChangeText={setDescription}
          />

          <TextInput
            style={styles.input}
            placeholder="Quantity"
            placeholderTextColor="#6b7280"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Add Item</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Item Details Modal Component
const ItemDetailsModal: React.FC<{
  visible: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  jobId: string;
  onUpdateCondition: (item: InventoryItem, condition: ItemCondition) => void;
  onUpdateNotes: (item: InventoryItem, notes: string) => void;
}> = ({ visible, item, onClose, jobId, onUpdateCondition, onUpdateNotes }) => {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (item) {
      setNotes(item.notes || '');
    }
  }, [item]);

  if (!item) return null;

  const conditions: ItemCondition[] = ['excellent', 'good', 'fair', 'damaged'];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.modalTitle}>{item.name}</Text>
            {item.description && (
              <Text style={styles.modalSubtitle}>{item.description}</Text>
            )}

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Condition</Text>
              <View style={styles.conditionOptions}>
                {conditions.map((condition) => (
                  <TouchableOpacity
                    key={condition}
                    style={[
                      styles.conditionOption,
                      item.condition === condition && styles.conditionOptionActive,
                    ]}
                    onPress={() => onUpdateCondition(item, condition)}
                  >
                    <Text
                      style={[
                        styles.conditionOptionText,
                        item.condition === condition &&
                          styles.conditionOptionTextActive,
                      ]}
                    >
                      {condition.charAt(0).toUpperCase() + condition.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailLabel}>Notes</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add notes or special handling instructions..."
                placeholderTextColor="#6b7280"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={4}
              />
              <TouchableOpacity
                style={styles.saveNotesButton}
                onPress={() => onUpdateNotes(item, notes)}
              >
                <Text style={styles.saveNotesButtonText}>Save Notes</Text>
              </TouchableOpacity>
            </View>

            {item.photos.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {item.photos.map((photo, index) => (
                    <Image
                      key={index}
                      source={{ uri: photo.uri }}
                      style={styles.photoThumbnail}
                    />
                  ))}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#e5e5e5',
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
  statsBar: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e5e5e5',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#3a3a3a',
    marginHorizontal: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    color: '#e5e5e5',
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryFilter: {
    maxHeight: 50,
  },
  categoryFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  categoryChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  categoryChipText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  bulkActionsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  bulkActionButton: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  bulkActionText: {
    color: '#3b82f6',
    fontWeight: '600',
    fontSize: 14,
  },
  itemsList: {
    flex: 1,
    padding: 16,
  },
  itemCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  itemCardDamaged: {
    borderColor: '#ef4444',
    borderWidth: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e5e5',
  },
  itemQuantity: {
    fontSize: 14,
    color: '#999',
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  damageFlag: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: 'bold',
  },
  itemDescription: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  itemBadges: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  conditionBadge: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  conditionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  notesContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#e5e5e5',
  },
  photosIndicator: {
    marginBottom: 12,
  },
  photosText: {
    fontSize: 14,
    color: '#3b82f6',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  actionButtonPrimary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtonTextPrimary: {
    color: '#fff',
  },
  photoButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#3b82f6',
    minWidth: 50,
    alignItems: 'center',
  },
  photoButtonText: {
    fontSize: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginBottom: 16,
  },
  clearSearchButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  clearSearchText: {
    color: '#fff',
    fontWeight: '600',
  },
  pendingBanner: {
    backgroundColor: '#f59e0b',
    padding: 12,
    alignItems: 'center',
  },
  pendingText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#e5e5e5',
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#e5e5e5',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e5e5',
    marginBottom: 12,
  },
  conditionOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  conditionOption: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  conditionOptionActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  conditionOptionText: {
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  conditionOptionTextActive: {
    color: '#fff',
  },
  notesInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    color: '#e5e5e5',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#3a3a3a',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  saveNotesButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  saveNotesButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  photoThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  closeButton: {
    backgroundColor: '#3a3a3a',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#e5e5e5',
    fontSize: 16,
    fontWeight: '600',
  },
});
