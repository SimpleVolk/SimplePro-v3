import { Types } from 'mongoose';

export interface PaginatedMessages {
  messages: any[];
  hasMore: boolean;
  totalCount: number;
  nextCursor?: string;
  prevCursor?: string;
}

export interface MessageAttachment {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface MessageLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface ReadReceipt {
  userId: Types.ObjectId | string;
  readAt: Date;
}

export interface MessageSearchResult {
  messageId: string;
  threadId: string;
  content: string;
  senderId: string;
  createdAt: Date;
  snippet: string;
}
