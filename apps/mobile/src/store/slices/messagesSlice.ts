/**
 * Messages Slice
 *
 * Manages message threads, conversations, and real-time messaging with offline support
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  messagesApi,
  MessageThread,
  Message,
  CreateMessageDto,
  TypingIndicator,
} from '../../api/messages.api';
import { queueAction } from './offlineSlice';
import { RootState } from '../store';

interface MessagesState {
  threads: MessageThread[];
  currentThreadId: string | null;
  messages: { [threadId: string]: Message[] };
  loading: boolean;
  sendingMessage: boolean;
  error: string | null;
  typingIndicators: { [threadId: string]: TypingIndicator[] };
  unreadCount: number;
  searchQuery: string;
  searchResults: Message[];
  searchLoading: boolean;
}

const initialState: MessagesState = {
  threads: [],
  currentThreadId: null,
  messages: {},
  loading: false,
  sendingMessage: false,
  error: null,
  typingIndicators: {},
  unreadCount: 0,
  searchQuery: '',
  searchResults: [],
  searchLoading: false,
};

// Async thunks
export const fetchThreads = createAsyncThunk(
  'messages/fetchThreads',
  async (_, { getState }: any) => {
    const { auth } = getState();
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await messagesApi.getThreads(auth.accessToken);
  },
);

export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async (
    { threadId, limit = 50, offset = 0 }: { threadId: string; limit?: number; offset?: number },
    { getState }: any,
  ) => {
    const { auth } = getState();
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    const messages = await messagesApi.getThreadMessages(
      auth.accessToken,
      threadId,
      limit,
      offset,
    );
    return { threadId, messages };
  },
);

export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async (data: CreateMessageDto, { getState, dispatch }: any) => {
    const state = getState() as RootState;

    // If offline, queue the action
    if (!state.offline.isOnline) {
      dispatch(queueAction(sendMessage(data)));
      throw new Error('Offline - action queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }

    return await messagesApi.sendMessage(auth.accessToken, data);
  },
);

export const markMessageAsRead = createAsyncThunk(
  'messages/markAsRead',
  async (messageId: string, { getState, dispatch }: any) => {
    const state = getState() as RootState;

    // If offline, queue the action
    if (!state.offline.isOnline) {
      dispatch(queueAction(markMessageAsRead(messageId)));
      throw new Error('Offline - action queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }

    await messagesApi.markMessageAsRead(auth.accessToken, messageId);
    return messageId;
  },
);

export const markThreadAsRead = createAsyncThunk(
  'messages/markThreadAsRead',
  async (threadId: string, { getState, dispatch }: any) => {
    const state = getState() as RootState;

    // If offline, queue the action
    if (!state.offline.isOnline) {
      dispatch(queueAction(markThreadAsRead(threadId)));
      throw new Error('Offline - action queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }

    await messagesApi.markThreadAsRead(auth.accessToken, threadId);
    return threadId;
  },
);

export const createThread = createAsyncThunk(
  'messages/createThread',
  async (
    data: {
      subject: string;
      recipientIds: string[];
      initialMessage?: string;
    },
    { getState, dispatch }: any,
  ) => {
    const state = getState() as RootState;

    // If offline, queue the action
    if (!state.offline.isOnline) {
      dispatch(queueAction(createThread(data)));
      throw new Error('Offline - action queued for sync');
    }

    const { auth } = state;
    if (!auth.accessToken) {
      throw new Error('No access token');
    }

    return await messagesApi.createThread(auth.accessToken, data);
  },
);

export const searchMessages = createAsyncThunk(
  'messages/search',
  async (query: string, { getState }: any) => {
    const { auth } = getState();
    if (!auth.accessToken) {
      throw new Error('No access token');
    }
    return await messagesApi.searchMessages(auth.accessToken, query);
  },
);

// Slice
const messagesSlice = createSlice({
  name: 'messages',
  initialState,
  reducers: {
    setCurrentThread: (state, action: PayloadAction<string | null>) => {
      state.currentThreadId = action.payload;
    },
    addMessageToThread: (
      state,
      action: PayloadAction<{ threadId: string; message: Message }>,
    ) => {
      const { threadId, message } = action.payload;

      // Add message to thread
      if (!state.messages[threadId]) {
        state.messages[threadId] = [];
      }

      // Check if message already exists to prevent duplicates
      const exists = state.messages[threadId].some((m) => m.id === message.id);
      if (!exists) {
        state.messages[threadId].push(message);

        // Sort by sentAt timestamp
        state.messages[threadId].sort(
          (a, b) =>
            new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
        );
      }

      // Update thread's last message
      const threadIndex = state.threads.findIndex((t) => t.id === threadId);
      if (threadIndex !== -1) {
        state.threads[threadIndex].lastMessage = {
          content: message.content,
          sentAt: message.sentAt,
          senderName: message.senderName,
        };
        state.threads[threadIndex].updatedAt = message.sentAt;

        // Increment unread count if not from current user
        if (!message.isRead) {
          state.threads[threadIndex].unreadCount++;
        }

        // Move thread to top of list
        const thread = state.threads[threadIndex];
        state.threads.splice(threadIndex, 1);
        state.threads.unshift(thread);
      }

      // Update total unread count
      state.unreadCount = state.threads.reduce(
        (sum, thread) => sum + thread.unreadCount,
        0,
      );
    },
    updateMessageInThread: (
      state,
      action: PayloadAction<{ threadId: string; message: Message }>,
    ) => {
      const { threadId, message } = action.payload;

      if (state.messages[threadId]) {
        const index = state.messages[threadId].findIndex(
          (m) => m.id === message.id,
        );
        if (index !== -1) {
          state.messages[threadId][index] = message;
        }
      }
    },
    setTypingIndicator: (state, action: PayloadAction<TypingIndicator>) => {
      const { threadId, userId, userName, isTyping } = action.payload;

      if (!state.typingIndicators[threadId]) {
        state.typingIndicators[threadId] = [];
      }

      const existingIndex = state.typingIndicators[threadId].findIndex(
        (t) => t.userId === userId,
      );

      if (isTyping) {
        if (existingIndex === -1) {
          state.typingIndicators[threadId].push(action.payload);
        } else {
          state.typingIndicators[threadId][existingIndex] = action.payload;
        }
      } else {
        if (existingIndex !== -1) {
          state.typingIndicators[threadId].splice(existingIndex, 1);
        }
      }
    },
    clearTypingIndicators: (state, action: PayloadAction<string>) => {
      const threadId = action.payload;
      state.typingIndicators[threadId] = [];
    },
    updateThreadLocally: (state, action: PayloadAction<MessageThread>) => {
      const index = state.threads.findIndex((t) => t.id === action.payload.id);
      if (index !== -1) {
        state.threads[index] = action.payload;
      } else {
        state.threads.unshift(action.payload);
      }

      // Update total unread count
      state.unreadCount = state.threads.reduce(
        (sum, thread) => sum + thread.unreadCount,
        0,
      );
    },
    clearSearchResults: (state) => {
      state.searchQuery = '';
      state.searchResults = [];
    },
    clearCurrentThread: (state) => {
      state.currentThreadId = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch threads
      .addCase(fetchThreads.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchThreads.fulfilled, (state, action) => {
        state.threads = action.payload;
        state.loading = false;

        // Calculate total unread count
        state.unreadCount = action.payload.reduce(
          (sum, thread) => sum + thread.unreadCount,
          0,
        );
      })
      .addCase(fetchThreads.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch threads';
      })
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        const { threadId, messages } = action.payload;
        state.messages[threadId] = messages;
        state.loading = false;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch messages';
      })
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.sendingMessage = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        const message = action.payload;
        const threadId = message.threadId;

        // Add message to thread
        if (!state.messages[threadId]) {
          state.messages[threadId] = [];
        }

        // Check if message already exists
        const exists = state.messages[threadId].some((m) => m.id === message.id);
        if (!exists) {
          state.messages[threadId].push(message);

          // Sort by sentAt
          state.messages[threadId].sort(
            (a, b) =>
              new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
          );
        }

        // Update thread
        const threadIndex = state.threads.findIndex((t) => t.id === threadId);
        if (threadIndex !== -1) {
          state.threads[threadIndex].lastMessage = {
            content: message.content,
            sentAt: message.sentAt,
            senderName: message.senderName,
          };
          state.threads[threadIndex].updatedAt = message.sentAt;

          // Move to top
          const thread = state.threads[threadIndex];
          state.threads.splice(threadIndex, 1);
          state.threads.unshift(thread);
        }

        state.sendingMessage = false;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.sendingMessage = false;
        state.error = action.error.message || 'Failed to send message';
      })
      // Mark message as read
      .addCase(markMessageAsRead.fulfilled, (state, action) => {
        const messageId = action.payload;

        // Update message in all threads
        Object.keys(state.messages).forEach((threadId) => {
          const messageIndex = state.messages[threadId].findIndex(
            (m) => m.id === messageId,
          );
          if (messageIndex !== -1) {
            state.messages[threadId][messageIndex].isRead = true;
            state.messages[threadId][messageIndex].readAt =
              new Date().toISOString();
          }
        });
      })
      // Mark thread as read
      .addCase(markThreadAsRead.fulfilled, (state, action) => {
        const threadId = action.payload;

        // Update all messages in thread
        if (state.messages[threadId]) {
          state.messages[threadId].forEach((message) => {
            message.isRead = true;
            message.readAt = message.readAt || new Date().toISOString();
          });
        }

        // Update thread unread count
        const threadIndex = state.threads.findIndex((t) => t.id === threadId);
        if (threadIndex !== -1) {
          state.threads[threadIndex].unreadCount = 0;
        }

        // Update total unread count
        state.unreadCount = state.threads.reduce(
          (sum, thread) => sum + thread.unreadCount,
          0,
        );
      })
      // Create thread
      .addCase(createThread.fulfilled, (state, action) => {
        state.threads.unshift(action.payload);
        state.currentThreadId = action.payload.id;
      })
      // Search messages
      .addCase(searchMessages.pending, (state) => {
        state.searchLoading = true;
      })
      .addCase(searchMessages.fulfilled, (state, action) => {
        state.searchResults = action.payload;
        state.searchLoading = false;
      })
      .addCase(searchMessages.rejected, (state) => {
        state.searchLoading = false;
      });
  },
});

export const {
  setCurrentThread,
  addMessageToThread,
  updateMessageInThread,
  setTypingIndicator,
  clearTypingIndicators,
  updateThreadLocally,
  clearSearchResults,
  clearCurrentThread,
  clearError,
} = messagesSlice.actions;

export default messagesSlice.reducer;
