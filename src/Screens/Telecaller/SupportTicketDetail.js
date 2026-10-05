import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import {
  getTelecallerSupportTicketDetail,
  replyTelecallerSupportTicket,
} from '../../Api/Telecaller/telecallerSupportApi';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolv') || s.includes('clos')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  if (s.includes('open')) return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  if (s.includes('pend')) return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}

function SupportTicketDetail({ route, navigation }) {
  const { ticketId, ticketNumber, initialTicket = null } = route?.params || {};
  const user = useSelector(s => s.user.user);

  const [ticket, setTicket] = useState(initialTicket);
  const [replies, setReplies] = useState(initialTicket?.replies || []);
  const [loading, setLoading] = useState(!initialTicket);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [replyText, setReplyText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);

  const scrollRef = useRef(null);
  const sendingRef = useRef(false);
  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  // Initial load (marks ticket as read)
  const loadChat = useCallback(async (isInitial = true) => {
    try {
      if (isInitial && !ticket) setLoading(true);
      setError(null);
      const res = await getTelecallerSupportTicketDetail(ticketId, { peek: false });
      setTicket(res.ticket);
      setReplies(res.replies || []);
    } catch (err) {
      setError(err?.message || 'Failed to load support chat');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticketId, ticket]);

  // Silent poll for updates (with peek: true to avoid repeated read mutations)
  const silentPoll = useCallback(async () => {
    if (sendingRef.current || !ticketId) return;
    try {
      const res = await getTelecallerSupportTicketDetail(ticketId, { peek: true });
      setTicket(res.ticket);
      setReplies(res.replies || []);
    } catch {
      // Keep showing existing thread
    }
  }, [ticketId]);

  useFocusEffect(
    useCallback(() => {
      loadChat(true);
      const interval = setInterval(silentPoll, 7000);
      return () => clearInterval(interval);
    }, [loadChat, silentPoll])
  );

  // Auto scroll to bottom when replies change
  useEffect(() => {
    if (replies.length > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [replies.length]);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text || sending) return;

    const asInternal = isInternal;
    const tempId = `temp_${Date.now()}`;
    const optimisticReply = {
      id: tempId,
      message: text,
      isInternal: asInternal,
      isTelecaller: true,
      authorName: user?.name || 'Telecaller',
      createdAt: new Date().toISOString(),
    };

    setReplyText('');
    setReplies(prev => [...prev, optimisticReply]);
    setSending(true);

    try {
      const res = await replyTelecallerSupportTicket(ticketId, {
        message: text,
        is_internal: asInternal,
      });

      if (res.reply) {
        setReplies(prev => prev.map(r => (r.id === tempId ? res.reply : r)));
      } else if (res.ticket?.replies) {
        setReplies(res.ticket.replies);
      }
      if (res.ticket) {
        setTicket(res.ticket);
      }
      setIsInternal(false);
    } catch (err) {
      // Revert optimistic reply
      setReplies(prev => prev.filter(r => r.id !== tempId));
      setReplyText(text);
      Alert.alert('Could Not Send', err?.message || 'Failed to send reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  const statusStyle = getStatusStyle(ticket?.status);
  const customer = ticket?.customer || {};
  const linkedRequest = ticket?.request;
  const canReply = ticket?.canReply !== false && !ticket?.isClosed;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar backgroundColor="#20304C" barStyle="light-content" translucent />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>

          <View style={styles.headerTextCol}>
            <Text style={styles.customerName} numberOfLines={1}>
              {customer?.name || ticket?.subject || 'Support Chat'}
            </Text>
            <Text style={styles.ticketMeta} numberOfLines={1}>
              {ticket?.ticketNumber || ticketNumber || `#${ticketId}`} • {ticket?.category || 'General Support'}
            </Text>
          </View>

          {customer?.phone ? (
            <TouchableOpacity
              style={styles.callIconBtn}
              onPress={() => handleCall(customer.phone)}
              activeOpacity={0.7}
            >
              <Icon name="phone" size={18} color="#10B981" />
            </TouchableOpacity>
          ) : null}

          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
              {String(ticket?.status || 'Open').toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Linked Service Request bar if present */}
        {linkedRequest ? (
          <TouchableOpacity
            style={styles.linkedRequestBar}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('TicketDetail', { ticketId: linkedRequest.id, ticket: linkedRequest.ticketNumber })}
          >
            <Icon name="confirmation-number" size={14} color="#EA580C" />
            <Text style={styles.linkedRequestText} numberOfLines={1}>
              Linked Service Request: <Text style={styles.linkedRequestBold}>{linkedRequest.ticketNumber}</Text>
              {linkedRequest.serviceName ? ` • ${linkedRequest.serviceName}` : ''}
            </Text>
            <Icon name="chevron-right" size={16} color="#EA580C" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Body / Thread */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20304C" />
          <Text style={styles.loadingText}>Loading conversation...</Text>
        </View>
      ) : error && replies.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Could not load chat</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadChat(true)}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.threadContainer}
          contentContainerStyle={styles.threadContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Info Banner at Top */}
          <View style={styles.infoBanner}>
            <Icon name="info-outline" size={14} color="#64748B" />
            <Text style={styles.infoBannerText}>
              Telecaller support channel. Messages marked as Internal Note are hidden from the customer.
            </Text>
          </View>

          {/* Subject / Initial Topic Card */}
          {ticket?.subject ? (
            <View style={styles.topicCard}>
              <View style={styles.topicHeader}>
                <Icon name="topic" size={16} color="#2563EB" />
                <Text style={styles.topicTitle}>{ticket.subject}</Text>
              </View>
              {ticket.createdAt ? (
                <Text style={styles.topicTime}>Started on {formatDate(ticket.createdAt)}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Empty Conversation State */}
          {replies.length === 0 && (
            <View style={styles.emptyThread}>
              <Icon name="chat-bubble-outline" size={36} color="#CBD5E1" />
              <Text style={styles.emptyThreadTitle}>No messages yet</Text>
              <Text style={styles.emptyThreadSub}>Send a message below to assist the customer.</Text>
            </View>
          )}

          {/* Messages */}
          {replies.map((msg, idx) => {
            const isMe = msg.isTelecaller || msg.senderType === 'telecaller' || msg.authorId === user?.id;
            const isInternalNote = msg.isInternal;

            if (isInternalNote) {
              return (
                <View key={msg.id || idx} style={styles.internalBubble}>
                  <View style={styles.internalHeader}>
                    <Icon name="lock" size={13} color="#D97706" />
                    <Text style={styles.internalHeaderText}>Internal Note • {msg.authorName || 'Staff'}</Text>
                    <Text style={styles.internalTime}>{formatDate(msg.createdAt)}</Text>
                  </View>
                  <Text style={styles.internalText}>{msg.message}</Text>
                </View>
              );
            }

            return (
              <View
                key={msg.id || idx}
                style={[
                  styles.msgRow,
                  isMe ? styles.msgRowRight : styles.msgRowLeft,
                ]}
              >
                {!isMe && (
                  <View style={styles.senderAvatar}>
                    <Text style={styles.senderAvatarText}>
                      {(msg.authorName || 'C').substring(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}

                <View
                  style={[
                    styles.msgBubble,
                    isMe ? styles.msgBubbleRight : styles.msgBubbleLeft,
                  ]}
                >
                  <View style={styles.bubbleAuthorRow}>
                    <Text style={[styles.bubbleAuthor, isMe ? styles.bubbleAuthorRight : styles.bubbleAuthorLeft]}>
                      {isMe ? 'You (Telecaller)' : (msg.authorName || 'Customer')}
                    </Text>
                    <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeRight : styles.bubbleTimeLeft]}>
                      {formatDate(msg.createdAt)}
                    </Text>
                  </View>
                  <Text style={[styles.msgText, isMe ? styles.msgTextRight : styles.msgTextLeft]}>
                    {msg.message}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Input Bar */}
      {canReply ? (
        <View style={styles.inputContainer}>
          {/* Internal Note Toggle */}
          <TouchableOpacity
            style={[styles.internalToggle, isInternal && styles.internalToggleActive]}
            onPress={() => setIsInternal(!isInternal)}
            activeOpacity={0.7}
          >
            <Icon
              name={isInternal ? 'lock' : 'lock-open'}
              size={14}
              color={isInternal ? '#D97706' : '#64748B'}
            />
            <Text style={[styles.internalToggleText, isInternal && styles.internalToggleTextActive]}>
              {isInternal ? 'Internal Note (Staff Only)' : 'Public Customer Reply'}
            </Text>
          </TouchableOpacity>

          <View style={styles.inputRow}>
            <TextInput
              style={[styles.textInput, isInternal && styles.textInputInternal]}
              placeholder={isInternal ? 'Type an internal staff note...' : 'Type a reply to customer...'}
              placeholderTextColor="#94A3B8"
              value={replyText}
              onChangeText={setReplyText}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              style={[
                styles.sendBtn,
                !replyText.trim() && styles.sendBtnDisabled,
                isInternal && styles.sendBtnInternal,
              ]}
              onPress={handleSend}
              disabled={!replyText.trim() || sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Icon name="send" size={18} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.closedBanner}>
          <Icon name="lock" size={16} color="#64748B" />
          <Text style={styles.closedBannerText}>
            This chat is closed. New replies cannot be submitted.
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#20304C',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  backIcon: {
    marginLeft: 5,
  },
  headerTextCol: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: '#FFFFFF',
  },
  ticketMeta: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: '#94A3B8',
    marginTop: 1,
  },
  callIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
  },
  linkedRequestBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    gap: 6,
  },
  linkedRequestText: {
    flex: 1,
    fontSize: 11,
    color: '#C2410C',
    fontFamily: typography.regular,
  },
  linkedRequestBold: {
    fontFamily: typography.semiBold,
    color: '#9A3412',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontFamily: typography.medium,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: '#1E293B',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: typography.regular,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#20304C',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: typography.semiBold,
  },

  threadContainer: {
    flex: 1,
  },
  threadContent: {
    padding: 16,
    paddingBottom: 24,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 11,
    color: '#64748B',
    fontFamily: typography.regular,
  },
  topicCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicTitle: {
    fontSize: 13,
    fontFamily: typography.semiBold,
    color: '#1E293B',
    flex: 1,
  },
  topicTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: typography.regular,
    marginTop: 4,
  },

  emptyThread: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyThreadTitle: {
    fontSize: 15,
    fontFamily: typography.semiBold,
    color: '#475569',
    marginTop: 8,
  },
  emptyThreadSub: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: '#94A3B8',
    marginTop: 2,
  },

  msgRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  msgRowLeft: {
    justifyContent: 'flex-start',
  },
  msgRowRight: {
    justifyContent: 'flex-end',
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 2,
  },
  senderAvatarText: {
    fontSize: 11,
    fontFamily: typography.bold,
    color: '#4F46E5',
  },
  msgBubble: {
    maxWidth: '80%',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  msgBubbleLeft: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  msgBubbleRight: {
    backgroundColor: '#20304C',
    borderBottomRightRadius: 2,
  },
  bubbleAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  bubbleAuthor: {
    fontSize: 10,
    fontFamily: typography.bold,
  },
  bubbleAuthorLeft: {
    color: '#6366F1',
  },
  bubbleAuthorRight: {
    color: '#93C5FD',
  },
  bubbleTime: {
    fontSize: 9,
    fontFamily: typography.regular,
  },
  bubbleTimeLeft: {
    color: '#94A3B8',
  },
  bubbleTimeRight: {
    color: '#94A3B8',
  },
  msgText: {
    fontSize: 13,
    fontFamily: typography.regular,
    lineHeight: 18,
  },
  msgTextLeft: {
    color: '#1E293B',
  },
  msgTextRight: {
    color: '#FFFFFF',
  },

  internalBubble: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  internalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  internalHeaderText: {
    fontSize: 10,
    fontFamily: typography.bold,
    color: '#B45309',
    flex: 1,
  },
  internalTime: {
    fontSize: 9,
    color: '#D97706',
    fontFamily: typography.regular,
  },
  internalText: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: '#78350F',
    lineHeight: 17,
  },

  inputContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  internalToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
    marginBottom: 6,
  },
  internalToggleActive: {
    backgroundColor: '#FEF3C7',
  },
  internalToggleText: {
    fontSize: 11,
    fontFamily: typography.medium,
    color: '#64748B',
  },
  internalToggleTextActive: {
    color: '#B45309',
    fontFamily: typography.semiBold,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 40,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    fontFamily: typography.regular,
    color: '#1E293B',
  },
  textInputInternal: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#20304C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnInternal: {
    backgroundColor: '#D97706',
  },
  sendBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },

  closedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    padding: 12,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  closedBannerText: {
    fontSize: 12,
    fontFamily: typography.medium,
    color: '#64748B',
  },
});

export default SupportTicketDetail;
