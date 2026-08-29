import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { getRmRequestSupportChat, sendRmRequestSupportChat } from '../../Api/RM/rmRequestsApi';
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
  // Timestamps arrive as UTC ("...Z"). Pin the display to UTC so the reply time
  // matches the backend/admin value on every device, regardless of local zone.
  const s = d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
  return s.replace(/\b(am|pm)\b/i, m => m.toUpperCase());
}

function SupportChat({ route, navigation }) {
  const { ticketId } = route.params || {};
  const user = useSelector(s => s.user.user);
  const { showAlert, alertProps } = useAppAlert();

  const [chat, setChat] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  useEffect(() => { sendingRef.current = sending; }, [sending]);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await getRmRequestSupportChat(ticketId);
      setChat(res.chat);
      setReplies(res.replies);
    } catch (e) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Silent background refresh — no loading/failed toggles, so a transient error
  // never blanks an already-loaded thread.
  const silentRefresh = useCallback(async () => {
    try {
      const res = await getRmRequestSupportChat(ticketId);
      setChat(res.chat);
      setReplies(res.replies);
    } catch (e) { /* keep showing the current thread */ }
  }, [ticketId]);

  // Poll while focused so replies received in real time appear without leaving
  // and re-opening the chat. Skips while a send is in flight.
  useFocusEffect(
    useCallback(() => {
      load();
      const intervalId = setInterval(() => {
        if (!sendingRef.current) silentRefresh();
      }, 8000);
      return () => clearInterval(intervalId);
    }, [load, silentRefresh])
  );

  // The RM's own messages sit on the right — trust the forced flag on a
  // just-sent reply, else match the logged-in user by id/name.
  const isMine = (msg) => {
    if (msg.fromRm) return true;
    if (msg.authorId != null && user?.id != null && String(msg.authorId) === String(user.id)) return true;
    const myName = (user?.name || '').trim().toLowerCase();
    return !!myName && (msg.authorName || '').trim().toLowerCase() === myName;
  };

  const isResolved = ['resolved', 'closed'].includes((chat?.status || '').toLowerCase());

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    const text = replyText.trim();
    setReplyText('');
    setSending(true);
    try {
      const res = await sendRmRequestSupportChat(ticketId, text);
      if (res.chat) setChat(res.chat);
      // Append the just-sent reply (forced to our side) so it stays on the
      // right immediately — same as the NRI chat. Fall back to a reload only
      // when the endpoint doesn't echo the reply.
      if (res.reply) setReplies(prev => [...prev, res.reply]);
      else await load();
    } catch (e) {
      setReplyText(text);
      const msg = e?.status === 422
        ? 'This chat isn\'t open for replies, or it has been resolved.'
        : e?.status === 403
          ? 'This request is assigned to another relationship manager.'
          : e?.message || 'Please try again.';
      showAlert('Could Not Send', msg);
    } finally {
      setSending(false);
    }
  };

  if (loading && !chat) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Support Chat" showBack />
        <View style={styles.emptyState}><ActivityIndicator size="small" color="#D94625" /><Text style={styles.emptyText}>Loading chat...</Text></View>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Support Chat" showBack />
        <TouchableOpacity style={styles.emptyState} onPress={load} activeOpacity={0.7}>
          <Icon name="refresh" size={36} color="#DC2626" />
          <Text style={styles.emptyText}>Couldn't load the chat. Tap to retry.</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pill = getStatusPill(chat?.statusLabel);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header navigation={navigation} title="Support Chat" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.threadHeaderRow}>
            <View style={styles.threadHeaderLeft}>
              <Text style={styles.threadSubject} numberOfLines={1}>{chat?.subject || 'Request support'}</Text>
              {!!chat && (
                <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                  <Text style={[styles.statusPillText, { color: pill.text }]}>{chat.statusLabel}</Text>
                </View>
              )}
            </View>
            {!!chat?.createdAt && <Text style={styles.threadDate}>{formatTime(chat.createdAt)}</Text>}
          </View>

          <View style={styles.messagesWrap}>
            {!chat ? (
              <Text style={styles.noMsgText}>Start a conversation about this request. Your first message begins the support chat.</Text>
            ) : replies.length === 0 ? (
              <Text style={styles.noMsgText}>No messages yet.</Text>
            ) : (
              replies.map(msg => {
                const mine = isMine(msg);
                return (
                  <View key={msg.id} style={[styles.bubbleRow, mine && styles.bubbleRowMe]}>
                    <View style={[styles.bubble, mine ? styles.bubbleMe : styles.bubbleSupport]}>
                      {!!msg.authorName && <Text style={[styles.bubbleAuthor, mine && styles.bubbleAuthorMe]}>{msg.authorName}</Text>}
                      <Text style={[styles.bubbleText, mine && styles.bubbleTextMe]}>{msg.message}</Text>
                      <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMe]}>{formatTime(msg.createdAt)}</Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {isResolved ? (
            <View style={styles.resolvedNote}>
              <Icon name="lock" size={14} color="#059669" />
              <Text style={styles.resolvedNoteText}>This chat has been resolved.</Text>
            </View>
          ) : (
            <View style={styles.replyRow}>
              <ScrollView
                style={styles.replyInputScroll}
                showsVerticalScrollIndicator
                persistentScrollbar
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <TextInput
                  style={styles.replyInput}
                  placeholder={chat ? 'Type a reply...' : 'Type your message...'}
                  placeholderTextColor="#94A3B8"
                  multiline
                  scrollEnabled={false}
                  value={replyText}
                  onChangeText={setReplyText}
                />
              </ScrollView>
              <TouchableOpacity style={[styles.sendBtn, (!replyText.trim() || sending) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!replyText.trim() || sending}>
                {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <>
                    <Text style={styles.sendBtnText}>Send</Text>
                    <Icon name="send" size={16} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 16 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  threadHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  threadHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  threadSubject: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', flexShrink: 1 },
  threadDate: { fontSize: 11, color: '#94A3B8' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  messagesWrap: { gap: 12 },
  noMsgText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 8, lineHeight: 19 },
  bubbleRow: { maxWidth: '85%', alignSelf: 'flex-start' },
  bubbleRowMe: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleSupport: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: '#334565', borderBottomRightRadius: 4 },
  bubbleAuthor: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  bubbleAuthorMe: { color: 'rgba(255,255,255,0.85)' },
  bubbleText: { fontSize: 14, color: '#0F172A' },
  bubbleTextMe: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },

  resolvedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  resolvedNoteText: { fontSize: 13, color: '#059669', fontFamily: typography.labelMedium.fontFamily },

  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  replyInputScroll: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, backgroundColor: '#F8FAFC', maxHeight: 100, minHeight: 44 },
  replyInput: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0F172A', minHeight: 44 },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 16, height: 44 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
});

export default SupportChat;
