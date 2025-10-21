/**
 * Messages Screen
 *
 * Two-way messaging system with thread list and conversation views
 * Features:
 * - Thread list with search
 * - Individual conversations with chat bubbles
 * - Real-time message updates via WebSocket
 * - Typing indicators
 * - Offline support with message queueing
 * - Pull-to-refresh
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchThreads,
  fetchMessages,
  sendMessage,
  markThreadAsRead,
  setCurrentThread,
  clearCurrentThread,
} from '../../store/slices/messagesSlice';
import websocketService from '../../services/websocket.service';
import { styles } from './MessagesScreen.styles';

interface MessagesScreenProps {
  navigation: any;
}

export const MessagesScreen: React.FC<MessagesScreenProps> = ({
  navigation,
}) => {
  const dispatch = useAppDispatch();
  const {
    threads,
    currentThreadId,
    messages,
    loading,
    sendingMessage,
    typingIndicators,
    unreadCount,
  } = useAppSelector((state) => state.messages);
  const { isOnline } = useAppSelector((state) => state.offline);
  const { user } = useAppSelector((state) => state.auth);

  const [view, setView] = useState<'threads' | 'conversation'>('threads');
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load threads on mount
  useEffect(() => {
    loadThreads();
  }, []);

  // Load messages when thread is selected
  useEffect(() => {
    if (currentThreadId && view === 'conversation') {
      loadMessages(currentThreadId);
      markThreadAsReadAction(currentThreadId);
      scrollToBottom();
    }
  }, [currentThreadId, view]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (currentThreadId && messages[currentThreadId]) {
      scrollToBottom();
    }
  }, [messages[currentThreadId]?.length]);

  // Fixed: Memory leak - Clear typing indicator timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  const loadThreads = async () => {
    try {
      await dispatch(fetchThreads()).unwrap();
    } catch (error: any) {
      console.error('Failed to load threads:', error);
      if (isOnline) {
        Alert.alert('Error', 'Failed to load message threads');
      }
    }
  };

  const loadMessages = async (threadId: string) => {
    try {
      await dispatch(fetchMessages({ threadId })).unwrap();
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      if (isOnline) {
        Alert.alert('Error', 'Failed to load messages');
      }
    }
  };

  const markThreadAsReadAction = async (threadId: string) => {
    try {
      await dispatch(markThreadAsRead(threadId)).unwrap();
    } catch (error) {
      console.error('Failed to mark thread as read:', error);
    }
  };

  const onRefresh = async () => {
    if (isOnline) {
      setRefreshing(true);
      if (view === 'threads') {
        await loadThreads();
      } else if (currentThreadId) {
        await loadMessages(currentThreadId);
      }
      setRefreshing(false);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleThreadPress = (threadId: string) => {
    dispatch(setCurrentThread(threadId));
    setView('conversation');
  };

  const handleBackPress = () => {
    dispatch(clearCurrentThread());
    setView('threads');
    setMessageText('');
    setIsTyping(false);
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !currentThreadId) return;

    const content = messageText.trim();
    setMessageText('');
    setIsTyping(false);

    // Stop typing indicator
    if (currentThreadId) {
      websocketService.emit('typing.stop', {
        threadId: currentThreadId,
      });
    }

    try {
      await dispatch(
        sendMessage({
          threadId: currentThreadId,
          content,
        }),
      ).unwrap();

      scrollToBottom();
    } catch (error: any) {
      if (!isOnline) {
        Alert.alert(
          'Offline',
          'Your message will be sent when connection is restored',
        );
      } else {
        Alert.alert('Error', 'Failed to send message. Please try again.');
      }
    }
  };

  const handleTextChange = (text: string) => {
    setMessageText(text);

    // Handle typing indicators
    if (!currentThreadId) return;

    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
      websocketService.emit('typing.start', {
        threadId: currentThreadId,
      });
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
      websocketService.emit('typing.stop', {
        threadId: currentThreadId,
      });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        websocketService.emit('typing.stop', {
          threadId: currentThreadId,
        });
      }
    }, 3000);
  };

  const filteredThreads = threads.filter((thread) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      thread.subject.toLowerCase().includes(query) ||
      thread.lastMessage.content.toLowerCase().includes(query) ||
      thread.participants.some((p) =>
        p.name.toLowerCase().includes(query),
      )
    );
  });

  const renderThreadItem = ({ item }: any) => {
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={styles.threadCard}
        onPress={() => handleThreadPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.threadHeader}>
          <View style={styles.threadTitleContainer}>
            <Text
              style={[styles.threadSubject, hasUnread && styles.threadUnread]}
              numberOfLines={1}
            >
              {item.subject}
            </Text>
            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
          <Text style={styles.threadTime}>
            {formatMessageTime(item.updatedAt)}
          </Text>
        </View>

        <Text style={styles.threadParticipants} numberOfLines={1}>
          {item.participants.map((p) => p.name).join(', ')}
        </Text>

        <View style={styles.threadMessagePreview}>
          <Text
            style={[
              styles.threadLastMessage,
              hasUnread && styles.threadLastMessageUnread,
            ]}
            numberOfLines={2}
          >
            <Text style={styles.threadLastMessageSender}>
              {item.lastMessage.senderName}:
            </Text>{' '}
            {item.lastMessage.content}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessageItem = ({ item }: any) => {
    const isOwnMessage = item.senderId === user?.userId;
    const showTyping =
      currentThreadId &&
      typingIndicators[currentThreadId] &&
      typingIndicators[currentThreadId].length > 0;

    return (
      <View
        style={[
          styles.messageContainer,
          isOwnMessage
            ? styles.messageContainerOwn
            : styles.messageContainerOther,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.messageBubbleOwn : styles.messageBubbleOther,
          ]}
        >
          {!isOwnMessage && (
            <Text style={styles.messageSender}>{item.senderName}</Text>
          )}
          <Text
            style={[
              styles.messageText,
              isOwnMessage
                ? styles.messageTextOwn
                : styles.messageTextOther,
            ]}
          >
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text
              style={[
                styles.messageTime,
                isOwnMessage
                  ? styles.messageTimeOwn
                  : styles.messageTimeOther,
              ]}
            >
              {formatMessageTime(item.sentAt)}
            </Text>
            {isOwnMessage && item.isRead && (
              <Text style={styles.readIndicator}>Read</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!currentThreadId || !typingIndicators[currentThreadId]) return null;

    const typing = typingIndicators[currentThreadId].filter((t) => t.isTyping);
    if (typing.length === 0) return null;

    return (
      <View style={styles.typingIndicatorContainer}>
        <View style={styles.typingIndicatorBubble}>
          <Text style={styles.typingIndicatorText}>
            {typing.map((t) => t.userName).join(', ')}{' '}
            {typing.length === 1 ? 'is' : 'are'} typing...
          </Text>
        </View>
      </View>
    );
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Thread List View
  if (view === 'threads') {
    return (
      <View style={styles.container}>
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <Text style={styles.offlineText}>Offline Mode</Text>
          </View>
        )}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Messages</Text>
          {unreadCount > 0 && (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredThreads}
            keyExtractor={(item) => item.id}
            renderItem={renderThreadItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#3b82f6"
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery
                    ? 'No conversations found'
                    : 'No messages yet'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  // Conversation View
  const currentThread = threads.find((t) => t.id === currentThreadId);
  const threadMessages = currentThreadId ? messages[currentThreadId] || [] : [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}

      <View style={styles.conversationHeader}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.conversationHeaderInfo}>
          <Text style={styles.conversationTitle} numberOfLines={1}>
            {currentThread?.subject || 'Conversation'}
          </Text>
          <Text style={styles.conversationParticipants} numberOfLines={1}>
            {currentThread?.participants.map((p) => p.name).join(', ')}
          </Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={threadMessages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={styles.messagesListContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No messages yet</Text>
            </View>
          }
          ListFooterComponent={renderTypingIndicator}
          onContentSizeChange={scrollToBottom}
        />
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          value={messageText}
          onChangeText={handleTextChange}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!messageText.trim() || sendingMessage) &&
              styles.sendButtonDisabled,
          ]}
          onPress={handleSendMessage}
          disabled={!messageText.trim() || sendingMessage}
        >
          {sendingMessage ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};
