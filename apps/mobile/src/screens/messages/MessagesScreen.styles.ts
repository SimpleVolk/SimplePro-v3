/**
 * Messages Screen Styles
 *
 * Dark theme styling for messaging interface with chat bubbles
 */

import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  // Container
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 16,
  },

  // Offline Banner
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

  // Header (Thread List)
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerUnreadBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  headerUnreadText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },

  // Search
  searchContainer: {
    padding: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  searchInput: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },

  // Thread List
  listContainer: {
    padding: 16,
  },
  threadCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  threadTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  threadSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e5e5',
    flex: 1,
  },
  threadUnread: {
    color: '#fff',
    fontWeight: '700',
  },
  threadTime: {
    fontSize: 12,
    color: '#999',
  },
  unreadBadge: {
    backgroundColor: '#3b82f6',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  threadParticipants: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
  },
  threadMessagePreview: {
    marginTop: 4,
  },
  threadLastMessage: {
    fontSize: 14,
    color: '#999',
    lineHeight: 20,
  },
  threadLastMessageUnread: {
    color: '#b3b3b3',
    fontWeight: '500',
  },
  threadLastMessageSender: {
    fontWeight: '600',
    color: '#3b82f6',
  },

  // Conversation Header
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    backgroundColor: '#2a2a2a',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  backButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  conversationHeaderInfo: {
    flex: 1,
  },
  conversationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  conversationParticipants: {
    fontSize: 12,
    color: '#999',
  },

  // Messages List
  messagesListContainer: {
    padding: 16,
    flexGrow: 1,
  },

  // Message Bubbles
  messageContainer: {
    marginBottom: 12,
    maxWidth: '80%',
  },
  messageContainerOwn: {
    alignSelf: 'flex-end',
  },
  messageContainerOther: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    paddingHorizontal: 16,
  },
  messageBubbleOwn: {
    backgroundColor: '#3b82f6',
    borderBottomRightRadius: 4,
  },
  messageBubbleOther: {
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  messageSender: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 4,
  },
  messageTextOwn: {
    color: '#fff',
  },
  messageTextOther: {
    color: '#e5e5e5',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 11,
  },
  messageTimeOwn: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageTimeOther: {
    color: '#999',
  },
  readIndicator: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
  },

  // Typing Indicator
  typingIndicatorContainer: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    marginBottom: 12,
    marginTop: 4,
  },
  typingIndicatorBubble: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  typingIndicatorText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
  },

  // Message Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
    backgroundColor: '#1a1a1a',
  },
  messageInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#fff',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  sendButtonDisabled: {
    backgroundColor: '#4a4a4a',
    opacity: 0.5,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Empty State
  emptyContainer: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
});
