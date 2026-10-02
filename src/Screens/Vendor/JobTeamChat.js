import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { getVendorJobTeamChat, sendVendorJobTeamChat } from '../../Api/Vendor/vendorJobsApi';
import { typography } from '../../theme/typography';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function JobTeamChat({ route, navigation }) {
  const { ticketId } = route.params || {};
  const { showAlert, alertProps } = useAppAlert();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const scrollRef = useRef(null);
  useEffect(() => { sendingRef.current = sending; }, [sending]);

  const load = useCallback(async () => {
    if (ticketId == null) return;
    setFailed(false);
    try {
      const res = await getVendorJobTeamChat(ticketId);
      setMessages(res);
    } catch (e) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  // Silent background refresh — no loading/failed toggles, so a transient
  // error never blanks an already-loaded thread.
  const silentRefresh = useCallback(async () => {
    if (ticketId == null) return;
    try {
      const res = await getVendorJobTeamChat(ticketId);
      setMessages(res);
    } catch (e) { /* keep showing the current thread */ }
  }, [ticketId]);

  // Poll while focused so replies received in real time appear without
  // leaving and re-opening the chat. Skips while a send is in flight.
  useFocusEffect(
    useCallback(() => {
      load();
      const intervalId = setInterval(() => {
        if (!sendingRef.current) silentRefresh();
      }, 8000);
      return () => clearInterval(intervalId);
    }, [load, silentRefresh])
  );

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const message = text.trim();
    setText('');
    setSending(true);
    try {
      const sent = await sendVendorJobTeamChat(ticketId, message);
      setMessages(prev => [...prev, sent]);
    } catch (e) {
      setText(message);
      const msg = e?.status === 403
        ? 'This job is assigned to another vendor.'
        : e?.message || 'Please try again.';
      showAlert('Could Not Send', msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header navigation={navigation} title="Chat with NRI Circle team" showBack />

      <View style={styles.chatWrap}>
        <View style={styles.card}>
          <View style={styles.subHeaderRow}>
            <Text style={styles.subHeaderText} numberOfLines={2}>
              Talk to the team handling this job. The customer can't see these messages.
            </Text>
            <View style={styles.privatePill}>
              <Icon name="lock" size={11} color="#64748B" />
              <Text style={styles.privatePillText}>Private</Text>
            </View>
          </View>

          {loading && messages.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color="#D94625" />
              <Text style={styles.emptyText}>Loading chat...</Text>
            </View>
          ) : failed && messages.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} onPress={load} activeOpacity={0.7}>
              <Icon name="refresh" size={28} color="#DC2626" />
              <Text style={styles.emptyText}>Couldn't load the chat. Tap to retry.</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              ref={scrollRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.length === 0 ? (
                <View style={styles.emptyState}>
                  <Icon name="mode-comment" size={28} color="#CBD5E1" />
                  <Text style={styles.emptyText}>No messages yet. Questions about this job? Ask the team here.</Text>
                </View>
              ) : (
                messages.map(msg => (
                  <View key={msg.id} style={[styles.bubbleRow, msg.fromVendor && styles.bubbleRowMe]}>
                    <View style={[styles.bubble, msg.fromVendor ? styles.bubbleMe : styles.bubbleStaff]}>
                      {!!msg.sender && <Text style={[styles.bubbleAuthor, msg.fromVendor && styles.bubbleAuthorMe]}>{msg.sender}</Text>}
                      <Text style={[styles.bubbleText, msg.fromVendor && styles.bubbleTextMe]}>{msg.message}</Text>
                      <Text style={[styles.bubbleTime, msg.fromVendor && styles.bubbleTimeMe]}>{formatTime(msg.createdAt)}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          )}

          <View style={styles.replyInputRow}>
            <TextInput
              style={styles.replyInput}
              placeholder="Message the NRI Circle team..."
              placeholderTextColor="#94A3B8"
              multiline
              maxLength={2000}
              value={text}
              onChangeText={setText}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!text.trim() || sending}
              activeOpacity={0.85}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="send" size={18} color="#FFFFFF" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  chatWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },

  card: {
    maxHeight: '100%',
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, gap: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },

  subHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  subHeaderText: { flex: 1, fontSize: 13, color: '#64748B', lineHeight: 18 },
  privatePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5,
  },
  privatePillText: { fontSize: 11, fontWeight: '700', color: '#64748B' },

  emptyState: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 30, paddingVertical: 30 },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },

  messagesScroll: { flexShrink: 1 },
  messagesContent: { gap: 12, paddingVertical: 4 },
  bubbleRow: { maxWidth: '85%', alignSelf: 'flex-start' },
  bubbleRowMe: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleStaff: { backgroundColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: '#1D4ED8', borderBottomRightRadius: 4 },
  bubbleAuthor: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  bubbleAuthorMe: { color: 'rgba(255,255,255,0.85)' },
  bubbleText: { fontSize: 14, color: '#0F172A' },
  bubbleTextMe: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },

  replyInputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  replyInput: {
    flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: '#0F172A',
    backgroundColor: '#F8FAFC', maxHeight: 100,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#D94625',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});

export default JobTeamChat;
