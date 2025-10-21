/**
 * Messages API
 *
 * Endpoints for two-way messaging between crew and dispatchers
 */

import apiClient from './client';

export interface Participant {
  userId: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface MessageThread {
  id: string;
  subject: string;
  participants: Participant[];
  lastMessage: {
    content: string;
    sentAt: string;
    senderName: string;
  };
  unreadCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  sentAt: string;
  readAt?: string;
  isRead: boolean;
  attachments?: Array<{
    id: string;
    url: string;
    type: string;
    name: string;
  }>;
}

export interface CreateMessageDto {
  threadId: string;
  content: string;
  attachments?: Array<{
    url: string;
    type: string;
    name: string;
  }>;
}

export interface TypingIndicator {
  threadId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export const messagesApi = {
  /**
   * Get all message threads for current user
   */
  getThreads: async (token: string): Promise<MessageThread[]> => {
    const response = await apiClient.get('/messages/threads', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    // Fixed: Handle both wrapped and unwrapped response formats
    return response.data.threads || response.data;
  },

  /**
   * Get messages in a specific thread
   */
  getThreadMessages: async (
    token: string,
    threadId: string,
    limit = 50,
    offset = 0,
  ): Promise<Message[]> => {
    // Fixed: Correct backend path is /messages/threads/:threadId/messages (plural 'threads')
    const response = await apiClient.get(`/messages/threads/${threadId}/messages`, {
      params: { limit, offset },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Send a new message
   */
  sendMessage: async (
    token: string,
    data: CreateMessageDto,
  ): Promise<Message> => {
    // Fixed: Backend expects threadId in URL, not body - extract threadId from data
    const { threadId, content, attachments } = data;
    const response = await apiClient.post(
      `/messages/threads/${threadId}/messages`,
      { content, attachments },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    return response.data;
  },

  /**
   * Mark message as read
   */
  markMessageAsRead: async (
    token: string,
    messageId: string,
  ): Promise<void> => {
    // Fixed: Backend uses POST method, not PATCH
    await apiClient.post(
      `/messages/${messageId}/read`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },

  /**
   * Mark all messages in thread as read
   */
  markThreadAsRead: async (token: string, threadId: string): Promise<void> => {
    // Fixed: Backend uses POST method and 'read-all' endpoint with plural 'threads'
    await apiClient.post(
      `/messages/threads/${threadId}/read-all`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },

  /**
   * Create a new message thread
   */
  createThread: async (
    token: string,
    data: {
      subject: string;
      recipientIds: string[];
      initialMessage?: string;
    },
  ): Promise<MessageThread> => {
    const response = await apiClient.post('/messages/threads', data, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },

  /**
   * Search messages
   */
  searchMessages: async (
    token: string,
    query: string,
  ): Promise<Message[]> => {
    const response = await apiClient.get('/messages/search', {
      params: { q: query },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  },
};
