/**
 * Inventory Slice
 *
 * Manages inventory checklist data, item tracking, and offline sync
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { inventoryApi } from '../../api/inventory.api';
import { queueAction } from './offlineSlice';
import { RootState } from '../store';
import {
  InventoryChecklist,
  InventoryItem,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  ItemStatus,
  PRESET_ITEMS,
} from '../../types/inventory.types';

interface InventoryState {
  checklists: { [jobId: string]: InventoryChecklist };
  currentChecklist: InventoryChecklist | null;
  searchQuery: string;
  selectedCategory: string | null;
  loading: boolean;
  error: string | null;
  pendingPhotoUploads: Array<{
    localId: string;
    jobId: string;
    itemId: string;
    uri: string;
    fileName: string;
  }>;
}

const initialState: InventoryState = {
  checklists: {},
  currentChecklist: null,
  searchQuery: '',
  selectedCategory: null,
  loading: false,
  error: null,
  pendingPhotoUploads: [],
};

// Helper to generate temporary ID
const generateTempId = () => `temp_${Date.now()}_${Math.random()}`;

// Async thunks
export const fetchInventory = createAsyncThunk(
  'inventory/fetchInventory',
  async (jobId: string, { getState }: any) => {
    const { auth } = getState();
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await inventoryApi.getInventory(auth.accessToken, jobId);
  },
);

export const addCustomItem = createAsyncThunk(
  'inventory/addCustomItem',
  async (
    { jobId, itemData }: { jobId: string; itemData: CreateInventoryItemDto },
    { getState, dispatch }: any,
  ) => {
    const state = getState() as RootState;

    // If offline, queue the action
    if (!state.offline.isOnline) {
      const tempItem: InventoryItem = {
        itemId: generateTempId(),
        name: itemData.name,
        description: itemData.description,
        category: itemData.category,
        quantity: itemData.quantity,
        condition: itemData.condition || 'good',
        status: 'not_started',
        notes: itemData.notes,
        specialHandling: itemData.specialHandling,
        photos: [],
        isCustom: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      dispatch(addItemLocally({ jobId, item: tempItem }));
      dispatch(queueAction(addCustomItem({ jobId, itemData })));
      throw new Error('Offline - item queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await inventoryApi.addInventoryItem(
      auth.accessToken,
      jobId,
      itemData,
    );
  },
);

export const updateItemStatus = createAsyncThunk(
  'inventory/updateItemStatus',
  async (
    {
      jobId,
      itemId,
      updateData,
    }: { jobId: string; itemId: string; updateData: UpdateInventoryItemDto },
    { getState, dispatch }: any,
  ) => {
    const state = getState() as RootState;

    // Update locally first for instant feedback
    dispatch(updateItemLocally({ jobId, itemId, updateData }));

    // If offline, queue the action
    if (!state.offline.isOnline) {
      dispatch(queueAction(updateItemStatus({ jobId, itemId, updateData })));
      throw new Error('Offline - update queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await inventoryApi.updateInventoryItem(
      auth.accessToken,
      jobId,
      itemId,
      updateData,
    );
  },
);

export const uploadItemPhoto = createAsyncThunk(
  'inventory/uploadItemPhoto',
  async (
    {
      jobId,
      itemId,
      photoUri,
      fileName,
    }: { jobId: string; itemId: string; photoUri: string; fileName: string },
    { getState, dispatch }: any,
  ) => {
    const state = getState() as RootState;

    // Add photo locally for instant feedback
    dispatch(
      addPhotoLocally({
        jobId,
        itemId,
        photo: { uri: photoUri, fileName, uploaded: false },
      }),
    );

    // If offline, queue for upload
    if (!state.offline.isOnline) {
      const localId = generateTempId();
      dispatch(
        addPendingPhotoUpload({
          localId,
          jobId,
          itemId,
          uri: photoUri,
          fileName,
        }),
      );
      throw new Error('Offline - photo queued for upload');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await inventoryApi.uploadItemPhoto(
      auth.accessToken,
      jobId,
      itemId,
      photoUri,
      fileName,
    );
  },
);

export const bulkUpdateStatus = createAsyncThunk(
  'inventory/bulkUpdateStatus',
  async (
    {
      jobId,
      itemIds,
      status,
    }: { jobId: string; itemIds: string[]; status: ItemStatus },
    { getState, dispatch }: any,
  ) => {
    const state = getState() as RootState;

    // Update locally first
    itemIds.forEach((itemId) => {
      dispatch(updateItemLocally({ jobId, itemId, updateData: { status } }));
    });

    // If offline, queue the action
    if (!state.offline.isOnline) {
      dispatch(queueAction(bulkUpdateStatus({ jobId, itemIds, status })));
      throw new Error('Offline - bulk update queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await inventoryApi.bulkUpdateItemStatus(
      auth.accessToken,
      jobId,
      itemIds,
      status,
    );
  },
);

export const initializePresetItems = createAsyncThunk(
  'inventory/initializePresetItems',
  async (jobId: string, { getState }: any) => {
    const state = getState() as RootState;

    // Check if checklist already exists
    if (state.inventory.checklists[jobId]) {
      return state.inventory.checklists[jobId];
    }

    // Create preset items
    const items: InventoryItem[] = PRESET_ITEMS.map((preset, index) => ({
      ...preset,
      itemId: `preset_${index}_${Date.now()}`,
      status: 'not_started' as ItemStatus,
      photos: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const checklist: InventoryChecklist = {
      checklistId: `checklist_${jobId}_${Date.now()}`,
      jobId,
      items,
      totalItems: items.length,
      loadedItems: 0,
      deliveredItems: 0,
      damagedItems: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return checklist;
  },
);

// Slice
const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.selectedCategory = action.payload;
    },
    clearCurrentChecklist: (state) => {
      state.currentChecklist = null;
      state.searchQuery = '';
      state.selectedCategory = null;
    },
    addItemLocally: (
      state,
      action: PayloadAction<{ jobId: string; item: InventoryItem }>,
    ) => {
      const { jobId, item } = action.payload;
      if (state.currentChecklist?.jobId === jobId) {
        state.currentChecklist.items.push(item);
        state.currentChecklist.totalItems++;
      }
      if (state.checklists[jobId]) {
        state.checklists[jobId].items.push(item);
        state.checklists[jobId].totalItems++;
      }
    },
    updateItemLocally: (
      state,
      action: PayloadAction<{
        jobId: string;
        itemId: string;
        updateData: UpdateInventoryItemDto;
      }>,
    ) => {
      const { jobId, itemId, updateData } = action.payload;
      const updateItem = (item: InventoryItem) => {
        if (item.itemId === itemId) {
          Object.assign(item, updateData);
          item.updatedAt = new Date().toISOString();
        }
      };

      if (state.currentChecklist?.jobId === jobId) {
        state.currentChecklist.items.forEach(updateItem);
        recalculateStats(state.currentChecklist);
      }
      if (state.checklists[jobId]) {
        state.checklists[jobId].items.forEach(updateItem);
        recalculateStats(state.checklists[jobId]);
      }
    },
    addPhotoLocally: (
      state,
      action: PayloadAction<{
        jobId: string;
        itemId: string;
        photo: { uri: string; fileName: string; uploaded: boolean };
      }>,
    ) => {
      const { jobId, itemId, photo } = action.payload;
      const addPhoto = (item: InventoryItem) => {
        if (item.itemId === itemId) {
          item.photos.push(photo);
        }
      };

      if (state.currentChecklist?.jobId === jobId) {
        state.currentChecklist.items.forEach(addPhoto);
      }
      if (state.checklists[jobId]) {
        state.checklists[jobId].items.forEach(addPhoto);
      }
    },
    addPendingPhotoUpload: (
      state,
      action: PayloadAction<{
        localId: string;
        jobId: string;
        itemId: string;
        uri: string;
        fileName: string;
      }>,
    ) => {
      state.pendingPhotoUploads.push(action.payload);
    },
    removePendingPhotoUpload: (state, action: PayloadAction<string>) => {
      state.pendingPhotoUploads = state.pendingPhotoUploads.filter(
        (upload) => upload.localId !== action.payload,
      );
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch inventory
      .addCase(fetchInventory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        const checklist = action.payload;
        state.checklists[checklist.jobId] = checklist;
        state.currentChecklist = checklist;
        state.loading = false;
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch inventory';
      })
      // Add custom item
      .addCase(addCustomItem.fulfilled, (state, action) => {
        const item = action.payload;
        const jobId = action.meta.arg.jobId;

        if (state.currentChecklist?.jobId === jobId) {
          // Remove temp item if exists
          state.currentChecklist.items = state.currentChecklist.items.filter(
            (i) => !i.itemId.startsWith('temp_'),
          );
          state.currentChecklist.items.push(item);
          state.currentChecklist.totalItems = state.currentChecklist.items.length;
        }
        if (state.checklists[jobId]) {
          state.checklists[jobId].items = state.checklists[jobId].items.filter(
            (i) => !i.itemId.startsWith('temp_'),
          );
          state.checklists[jobId].items.push(item);
          state.checklists[jobId].totalItems = state.checklists[jobId].items.length;
        }
      })
      .addCase(addCustomItem.rejected, (state, action) => {
        // Keep temp item if offline
        if (!action.error.message?.includes('queued')) {
          state.error = action.error.message || 'Failed to add item';
        }
      })
      // Update item status
      .addCase(updateItemStatus.fulfilled, (state, action) => {
        // Already updated locally in the thunk
      })
      // Upload photo
      .addCase(uploadItemPhoto.fulfilled, (state, action) => {
        const { jobId, itemId } = action.meta.arg;
        const photo = action.payload;

        const updatePhotoStatus = (item: InventoryItem) => {
          if (item.itemId === itemId) {
            // Mark last photo as uploaded
            const lastPhoto = item.photos[item.photos.length - 1];
            if (lastPhoto) {
              lastPhoto.uploaded = true;
              if (photo.photoId) {
                lastPhoto.photoId = photo.photoId;
              }
            }
          }
        };

        if (state.currentChecklist?.jobId === jobId) {
          state.currentChecklist.items.forEach(updatePhotoStatus);
        }
        if (state.checklists[jobId]) {
          state.checklists[jobId].items.forEach(updatePhotoStatus);
        }
      })
      // Initialize preset items
      .addCase(initializePresetItems.fulfilled, (state, action) => {
        const checklist = action.payload;
        state.checklists[checklist.jobId] = checklist;
        state.currentChecklist = checklist;
      });
  },
});

// Helper function to recalculate checklist stats
function recalculateStats(checklist: InventoryChecklist) {
  checklist.loadedItems = checklist.items.filter(
    (item) => item.status === 'loaded' || item.status === 'delivered',
  ).length;
  checklist.deliveredItems = checklist.items.filter(
    (item) => item.status === 'delivered',
  ).length;
  checklist.damagedItems = checklist.items.filter(
    (item) => item.condition === 'damaged',
  ).length;
  checklist.updatedAt = new Date().toISOString();
}

export const {
  setSearchQuery,
  setSelectedCategory,
  clearCurrentChecklist,
  addItemLocally,
  updateItemLocally,
  addPhotoLocally,
  addPendingPhotoUpload,
  removePendingPhotoUpload,
} = inventorySlice.actions;

export default inventorySlice.reducer;
