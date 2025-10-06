'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../../lib/config';
import styles from './MessageThread.module.css';

interface Message {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  attachments?: string[];
  readBy: string[];
  createdAt: string;
  updatedAt: string;
}

interface MessageThread {
  id: string;
  jobId?: string;
  jobNumber?: string;
  participants: {
    id: string;
    name: string;
    role: string;
  }[];
  subject: string;
  lastMessageAt: string;
  createdAt: string;
}

interface MessageThreadProps {
  threadId?: string;
  jobId?: string;
  onClose?: () => void;
}

const QUICK_REPLIES = [
  'On my way',
  'Running 10 minutes late',
  'Job completed',
  'Need assistance',
  'Customer not home',
  'Will update shortly',
];

export function MessageThread({
  threadId,
  jobId,
  onClose,
}: MessageThreadProps) {
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { socket, isConnected } = useWebSocket();
  const { user } = useAuth();

  // Fetch thread and messages
  const fetchThread = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      // If we have a threadId, fetch that thread
      // Otherwise, create/fetch thread for jobId
      const endpoint = threadId
        ? `messages/threads/${threadId}`
        : `messages/threads/job/${jobId}`;

      const response = await fetch(getApiUrl(endpoint), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setThread(result.data.thread);
        setMessages(result.data.messages || []);
      } else if (response.status === 404 && jobId) {
        // Thread doesn't exist, create it
        await createThread();
      } else {
        throw new Error('Failed to fetch thread');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
      console.error('Error fetching thread:', err);
    } finally {
      setLoading(false);
    }
  }, [threadId, jobId]);

  // Create thread for job
  const createThread = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token || !jobId) return;

      const response = await fetch(getApiUrl('messages/threads'), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          subject: `Job Discussion`,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setThread(result.data);
      }
    } catch (err) {
      console.error('Error creating thread:', err);
    }
  };

  // Initial load
  useEffect(() => {
    if (threadId || jobId) {
      fetchThread();
    }
  }, [threadId, jobId, fetchThread]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!socket || !isConnected || !thread) return;

    // Join thread room
    socket.emit('joinThread', { threadId: thread.id });

    const handleNewMessage = (message: Message) => {
      if (message.threadId === thread.id) {
        setMessages((prev) => [...prev, message]);
        scrollToBottom();

        // Mark as read
        if (message.senderId !== user?.id) {
          markMessageAsRead(message.id);
        }
      }
    };

    const handleTyping = (data: {
      userId: string;
      userName: string;
      threadId: string;
    }) => {
      if (data.threadId === thread.id && data.userId !== user?.id) {
        setTypingUsers((prev) => new Set(prev).add(data.userName));

        // Clear typing indicator after 3 seconds
        setTimeout(() => {
          setTypingUsers((prev) => {
            const newSet = new Set(prev);
            newSet.delete(data.userName);
            return newSet;
          });
        }, 3000);
      }
    };

    socket.on('message.created', handleNewMessage);
    socket.on('user.typing', handleTyping);

    return () => {
      socket.emit('leaveThread', { threadId: thread.id });
      socket.off('message.created', handleNewMessage);
      socket.off('user.typing', handleTyping);
    };
  }, [socket, isConnected, thread, user]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send typing indicator
  const sendTypingIndicator = () => {
    if (socket && isConnected && thread) {
      socket.emit('typing', { threadId: thread.id });
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (socket && isConnected && thread) {
        socket.emit('stopTyping', { threadId: thread.id });
      }
    }, 2000) as unknown as NodeJS.Timeout;
  };

  // Send message
  const sendMessage = async (content: string) => {
    if (!content.trim() || !thread) return;

    try {
      setSending(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        getApiUrl(`messages/threads/${thread.id}/messages`),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content }),
        },
      );

      if (response.ok) {
        setNewMessage('');
      } else {
        throw new Error('Failed to send message');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Mark message as read
  const markMessageAsRead = async (messageId: string) => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      await fetch(getApiUrl(`messages/${messageId}/read`), {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.error('Error marking message as read:', err);
    }
  };

  // Handle send
  const handleSend = () => {
    sendMessage(newMessage);
  };

  // Handle quick reply
  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  // Format timestamp
  const formatTimestamp = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.getTime() === yesterday.getTime()) {
      return (
        'Yesterday ' +
        date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
      );
    }

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading messages...</div>
      </div>
    );
  }

  if (error && !thread) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <h2 className={styles.title}>{thread?.subject || 'Messages'}</h2>
          {thread?.jobNumber && (
            <span className={styles.jobBadge}>Job #{thread.jobNumber}</span>
          )}
        </div>
        {onClose && (
          <button
            className={styles.closeButton}
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 && (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>💬</span>
            <p className={styles.emptyText}>
              No messages yet. Start the conversation!
            </p>
          </div>
        )}

        {messages.map((message) => {
          const isOwnMessage = message.senderId === user?.id;

          return (
            <div
              key={message.id}
              className={`${styles.messageGroup} ${isOwnMessage ? styles.ownMessage : styles.otherMessage}`}
            >
              <div className={styles.messageBubble}>
                <div className={styles.messageHeader}>
                  <span className={styles.senderName}>
                    {message.senderName}
                  </span>
                  <span className={styles.senderRole}>
                    {message.senderRole}
                  </span>
                </div>
                <div className={styles.messageContent}>{message.content}</div>
                <div className={styles.messageFooter}>
                  <span className={styles.timestamp}>
                    {formatTimestamp(message.createdAt)}
                  </span>
                  {isOwnMessage && message.readBy.length > 1 && (
                    <span className={styles.readReceipt}>✓✓</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {typingUsers.size > 0 && (
          <div className={styles.typingIndicator}>
            <span className={styles.typingDots}>
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span className={styles.typingText}>
              {Array.from(typingUsers).join(', ')}{' '}
              {typingUsers.size === 1 ? 'is' : 'are'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className={styles.quickReplies}>
        {QUICK_REPLIES.map((reply) => (
          <button
            key={reply}
            className={styles.quickReplyButton}
            onClick={() => handleQuickReply(reply)}
            disabled={sending}
            type="button"
          >
            {reply}
          </button>
        ))}
      </div>

      <div className={styles.inputContainer}>
        <textarea
          className={styles.input}
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            sendTypingIndicator();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Type a message..."
          rows={3}
          disabled={sending}
        />
        <button
          className={styles.sendButton}
          onClick={handleSend}
          disabled={!newMessage.trim() || sending}
          type="button"
        >
          {sending ? '📤' : '🚀'}
        </button>
      </div>
    </div>
  );
}
