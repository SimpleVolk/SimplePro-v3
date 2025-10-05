/**
 * Documents Slice
 *
 * Manages photo uploads, signature captures, and document storage
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { documentsApi } from '../../api/documents.api';
import { RootState } from '../store';

interface Document {
  documentId: string;
  jobId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
}

interface DocumentsState {
  documents: Document[];
  pendingUploads: Array<{
    localId: string;
    jobId: string;
    type: string;
    uri: string;
    fileName: string;
  }>;
  loading: boolean;
  error: string | null;
}

const initialState: DocumentsState = {
  documents: [],
  pendingUploads: [],
  loading: false,
  error: null,
};

// Async thunks
export const uploadPhoto = createAsyncThunk(
  'documents/uploadPhoto',
  async (
    data: {
      jobId: string;
      photoType: string;
      photoUri: string;
      fileName: string;
    },
    { getState, dispatch }: any
  ) => {
    const state = getState() as RootState;

    // If offline, queue for later
    if (!state.offline.isOnline) {
      const localId = Date.now().toString() + Math.random();
      dispatch(
        addPendingUpload({
          localId,
          jobId: data.jobId,
          type: data.photoType,
          uri: data.photoUri,
          fileName: data.fileName,
        })
      );
      throw new Error('Offline - photo queued for upload');
    }

    const { auth } = state;
    return await documentsApi.uploadPhoto(auth.accessToken, data);
  }
);

export const uploadSignature = createAsyncThunk(
  'documents/uploadSignature',
  async (
    data: {
      jobId: string;
      signatureData: string;
      documentType: string;
    },
    { getState, dispatch }: any
  ) => {
    const state = getState() as RootState;

    // If offline, queue for later
    if (!state.offline.isOnline) {
      const localId = Date.now().toString() + Math.random();
      dispatch(
        addPendingUpload({
          localId,
          jobId: data.jobId,
          type: data.documentType,
          uri: data.signatureData,
          fileName: `signature_${Date.now()}.png`,
        })
      );
      throw new Error('Offline - signature queued for upload');
    }

    const { auth } = state;
    return await documentsApi.uploadSignature(auth.accessToken, data);
  }
);

export const fetchJobDocuments = createAsyncThunk(
  'documents/fetchJobDocuments',
  async (jobId: string, { getState }: any) => {
    const { auth } = getState();
    return await documentsApi.getJobDocuments(auth.accessToken, jobId);
  }
);

// Slice
const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {
    addPendingUpload: (state, action) => {
      state.pendingUploads.push(action.payload);
    },
    removePendingUpload: (state, action) => {
      state.pendingUploads = state.pendingUploads.filter(
        (upload) => upload.localId !== action.payload
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(uploadPhoto.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadPhoto.fulfilled, (state, action) => {
        state.documents.push(action.payload);
        state.loading = false;
      })
      .addCase(uploadPhoto.rejected, (state, action) => {
        state.loading = false;
        // Don't set error if it's just queued
        if (!action.error.message?.includes('queued')) {
          state.error = action.error.message || 'Failed to upload photo';
        }
      })
      .addCase(uploadSignature.fulfilled, (state, action) => {
        state.documents.push(action.payload);
      })
      .addCase(fetchJobDocuments.fulfilled, (state, action) => {
        state.documents = action.payload;
      });
  },
});

export const { addPendingUpload, removePendingUpload } = documentsSlice.actions;
export default documentsSlice.reducer;
