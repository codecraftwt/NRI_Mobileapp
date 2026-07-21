import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useSupportTicketDetail } from '../../Hooks/useSupportTicketDetail';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

function getStatusPill(statusLabel) {
  switch ((statusLabel || '').toLowerCase()) {
    case 'resolved':
    case 'closed': return { bg: '#D1FAE5', text: '#059669' };
    case 'escalated': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#DBEAFE', text: '#1D4ED8' };
  }
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SupportTicketChat({ route, navigation }) {
  const { ticketId, createdTicketNumber } = route.params || {};
  const { detail: ticket, replies, loading, failed, retry, reply: sendReply, replyLoading, escalate, escalateLoading } = useSupportTicketDetail(ticketId);
  const [replyText, setReplyText] = useState('');
  const [showCreatedBanner, setShowCreatedBanner] = useState(!!createdTicketNumber);

  useFocusEffect(
    useCallback(() => {
      if (ticketId) retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketId])
  );

  const handleSend = async () => {
    if (!replyText.trim()) return;
    const text = replyText.trim();
    setReplyText('');
    try {
      await sendReply(text).unwrap();
    } catch (error) {
      Alert.alert('Could Not Send', error?.message || 'Please try again.');
      setReplyText(text);
    }
  };

  const handleEscalate = () => {
    Alert.alert(
      'Escalate to Admin',
      'This will notify our admin team that you need further help with this ticket. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          style: 'destructive',
          onPress: async () => {
            try {
              await escalate().unwrap();
              Alert.alert('Escalated', 'Your ticket has been escalated to our admin team.');
            } catch (error) {
              Alert.alert('Could Not Escalate', error?.message || 'Please try again.');
            }
          },
        },
      ]
    );
  };

  if (loading && !ticket) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Support Ticket" showBack />
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.emptyText}>Loading ticket...</Text>
        </View>
      </View>
    );
  }

  if (failed || !ticket) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Support Ticket" showBack />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{failed ? "Couldn't load this ticket." : 'Ticket not found.'}</Text>
          <TouchableOpacity onPress={failed ? retry : () => navigation.goBack()}>
            <Text style={styles.retryLink}>{failed ? 'Tap to retry' : 'Go back'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pill = getStatusPill(ticket.statusLabel);
  const isClosed = ['resolved', 'closed'].includes((ticket.status || '').toLowerCase());

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header navigation={navigation} title={ticket.ticketNumber} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {showCreatedBanner && (
          <View style={styles.createdBanner}>
            <Text style={styles.createdBannerText}>Support ticket {createdTicketNumber} created.</Text>
            <TouchableOpacity onPress={() => setShowCreatedBanner(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={18} color="#059669" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.threadHeaderRow}>
            <View style={styles.threadHeaderLeft}>
              <Text style={styles.threadSubject} numberOfLines={1}>{ticket.subject}</Text>
              <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                <Text style={[styles.statusPillText, { color: pill.text }]}>{ticket.statusLabel}</Text>
              </View>
            </View>
            <Text style={styles.threadDate}>{formatTime(ticket.createdAt)}</Text>
          </View>

          <View style={styles.messagesWrap}>
            {replies.map(msg => (
              <View key={msg.id} style={[styles.bubbleRow, msg.fromCustomer && styles.bubbleRowMe]}>
                <View style={[styles.bubble, msg.fromCustomer ? styles.bubbleMe : styles.bubbleSupport]}>
                  {!!msg.authorName && <Text style={[styles.bubbleAuthor, msg.fromCustomer && styles.bubbleAuthorMe]}>{msg.authorName}</Text>}
                  <Text style={[styles.bubbleText, msg.fromCustomer && styles.bubbleTextMe]}>{msg.message}</Text>
                  <Text style={[styles.bubbleTime, msg.fromCustomer && styles.bubbleTimeMe]}>{formatTime(msg.createdAt)}</Text>
                </View>
              </View>
            ))}
          </View>

          {!isClosed && (
            <View style={styles.replyRow}>
              <TextInput
                style={styles.replyInput}
                placeholder="Type a reply..."
                placeholderTextColor="#94A3B8"
                multiline
                value={replyText}
                onChangeText={setReplyText}
              />
              <TouchableOpacity style={[styles.sendBtn, (!replyText.trim() || replyLoading) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!replyText.trim() || replyLoading}>
                {replyLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <>
                    <Text style={styles.sendBtnText}>Send</Text>
                    <Icon name="send" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {!isClosed && ticket.status !== 'escalated' && (
          <View style={styles.escalateCard}>
            <Text style={styles.escalateText}>Not getting the help you need? Escalate this ticket to our admin team.</Text>
            <TouchableOpacity style={[styles.escalateBtn, escalateLoading && styles.escalateBtnDisabled]} onPress={handleEscalate} disabled={escalateLoading}>
              {escalateLoading ? <ActivityIndicator size="small" color="#DC2626" /> : (
                <>
                  <Icon name="arrow-upward" size={16} color="#DC2626" />
                  <Text style={styles.escalateBtnText}>Escalate to Admin</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 16 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: '#64748B' },
  retryLink: { fontSize: 14, color: '#3B82F6', fontWeight: '600' },

  createdBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#D1FAE5', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 12 },
  createdBannerText: { fontSize: 13, color: '#059669', fontWeight: '600', flex: 1, paddingRight: 8 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  threadHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  threadHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  threadSubject: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', flexShrink: 1 },
  threadDate: { fontSize: 11, color: '#94A3B8' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  messagesWrap: { gap: 12 },
  bubbleRow: { maxWidth: '85%', alignSelf: 'flex-start' },
  bubbleRowMe: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleSupport: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: '#1D4ED8', borderBottomRightRadius: 4 },
  bubbleAuthor: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  bubbleAuthorMe: { color: 'rgba(255,255,255,0.85)' },
  bubbleText: { fontSize: 14, color: '#0F172A' },
  bubbleTextMe: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },

  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  replyInput: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', maxHeight: 100 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 16, height: 44 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },

  escalateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  escalateText: { fontSize: 13, color: '#334155', lineHeight: 20 },
  escalateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#DC2626', borderRadius: 24, paddingVertical: 14 },
  escalateBtnDisabled: { opacity: 0.6 },
  escalateBtnText: { color: '#DC2626', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
});

export default SupportTicketChat;
