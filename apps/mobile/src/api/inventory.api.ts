/**
 * Inventory API
 *
 * Endpoints for inventory checklist management
 */

import apiClient from './client';
import {
  InventoryChecklist,
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  InventoryItemPhoto,
} from '../types/inventory.types';

export const inventoryApi = {
  /**
   * Get inventory checklist for a job
   */
  getInventory: async (
    token: string,
    jobId: string,
  ): Promise<InventoryChecklist> => {
    const response = await apiClient.get(`/jobs/${jobId}/inventory`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Add custom inventory item
   */
  addInventoryItem: async (
    token: string,
    jobId: string,
    itemData: CreateInventoryItemDto,
  ) => {
    const response = await apiClient.post(
      `/jobs/${jobId}/inventory/items`,
      itemData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },

  /**
   * Update inventory item
   */
  updateInventoryItem: async (
    token: string,
    jobId: string,
    itemId: string,
    updateData: UpdateInventoryItemDto,
  ) => {
    const response = await apiClient.patch(
      `/jobs/${jobId}/inventory/items/${itemId}`,
      updateData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },

  /**
   * Upload photo for inventory item
   */
  uploadItemPhoto: async (
    token: string,
    jobId: string,
    itemId: string,
    photoUri: string,
    fileName: string,
  ) => {
    const formData = new FormData();
    formData.append('jobId', jobId);
    formData.append('itemId', itemId);
    formData.append('file', {
      uri: photoUri,
      type: 'image/jpeg',
      name: fileName,
    } as any);

    const response = await apiClient.post(
      `/jobs/${jobId}/inventory/items/${itemId}/photos`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      },
    );

    return response.data;
  },

  /**
   * Bulk update item statuses (e.g., mark all as loaded)
   */
  bulkUpdateItemStatus: async (
    token: string,
    jobId: string,
    itemIds: string[],
    status: string,
  ) => {
    const response = await apiClient.patch(
      `/jobs/${jobId}/inventory/bulk-update`,
      {
        itemIds,
        status,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },

  /**
   * Delete inventory item
   */
  deleteInventoryItem: async (token: string, jobId: string, itemId: string) => {
    const response = await apiClient.delete(
      `/jobs/${jobId}/inventory/items/${itemId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },
};
