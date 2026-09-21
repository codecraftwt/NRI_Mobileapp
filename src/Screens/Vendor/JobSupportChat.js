import React, { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useAttachmentViewer } from '../../Components/useAttachmentViewer';
import {
  getVendorJobSupportChat, sendVendorJobSupportChat,
  getVendorDocumentRequestTypes, requestVendorDocument, reopenVendorDocumentRequest,
} from '../../Api/Vendor/vendorJobsApi';
import { typography } from '../../theme/typography';

const OTHER_OPTION = 'Other — not listed';

function getStatusPill(statusLabel) {
  switch ((statusLabel || '').toLowerCase()) {
    case 'resolved':
    case 'closed': return { bg: '#D1FAE5', text: '#059669' };
    case 'escalated': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#DBEAFE', text: '#1D4ED8' };
  }
}

function getDocStatusPill(status) {
  return String(status).toLowerCase() === 'fulfilled'
    ? { bg: '#D1FAE5', text: '#059669', label: 'Fulfilled' }
    : { bg: '#FFEDD5', text: '#C2410C', label: 'Pending' };
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function JobSupportChat({ route, navigation }) {
  const { ticketId } = route.params || {};
  const user = useSelector(s => s.user.user);
  const { showAlert, alertProps } = useAppAlert();
  const { openAttachment, preview } = useAttachmentViewer();

  const [chat, setChat] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const scrollRef = useRef(null);
  useEffect(() => { sendingRef.current = sending; }, [sending]);

  // "Request Document" picker — populated once from the picklist, with an
  // always-available "Other" option that reveals free text.
  const [docTypes, setDocTypes] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedDocLabel, setSelectedDocLabel] = useState(null);
  const [customDocLabel, setCustomDocLabel] = useState('');
  const [requestNote, setRequestNote] = useState('');
  const [requestSending, setRequestSending] = useState(false);
  const [reopeningId, setReopeningId] = useState(null);

  useEffect(() => {
    getVendorDocumentRequestTypes().then(setDocTypes).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await getVendorJobSupportChat(ticketId);
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
      const res = await getVendorJobSupportChat(ticketId);
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

  // A message sits on the right when it's the vendor's own — trust the forced
  // flag on a just-sent reply, else match the logged-in vendor by id/name.
  const isMine = (msg) => {
    if (msg.fromVendor) return true;
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
      await sendVendorJobSupportChat(ticketId, text);
      await load(); // refresh the thread
    } catch (e) {
      setReplyText(text);
      const msg = e?.status === 422
        ? 'This chat isn\'t open for replies yet, or it has been resolved.'
        : e?.status === 403
          ? 'This job is assigned to another vendor.'
          : e?.message || 'Please try again.';
      showAlert('Could Not Send', msg);
    } finally {
      setSending(false);
    }
  };

  const openRequestModal = () => {
    setSelectedDocLabel(null);
    setCustomDocLabel('');
    setRequestNote('');
    setShowRequestModal(true);
  };

  const requestLabel = selectedDocLabel === OTHER_OPTION ? customDocLabel.trim() : selectedDocLabel;

  const handleSendDocumentRequest = async () => {
    if (!requestLabel || requestSending) return;
    setRequestSending(true);
    try {
      const res = await requestVendorDocument(ticketId, { label: requestLabel, note: requestNote.trim() || undefined });
      setChat(res.chat);
      setReplies(res.replies);
      setShowRequestModal(false);
    } catch (e) {
      const msg = e?.status === 403
        ? 'This job is assigned to another vendor.'
        : e?.message || 'Please try again.';
      showAlert('Could Not Send Request', msg);
    } finally {
      setRequestSending(false);
    }
  };

  const handleReopen = async (documentRequestId) => {
    if (reopeningId) return;
    setReopeningId(documentRequestId);
    try {
      const res = await reopenVendorDocumentRequest(ticketId, documentRequestId);
      setChat(res.chat);
      setReplies(res.replies);
    } catch (e) {
      showAlert('Could Not Reopen', e?.message || 'Please try again.');
    } finally {
      setReopeningId(null);
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

  // No chat exists yet — a vendor can still start one by requesting a document;
  // a plain reply still needs the customer/RM to have started the thread.
  if (!chat) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Support Chat" showBack />
        <View style={styles.emptyState}>
          <Icon name="chat-bubble-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No support chat yet</Text>
          <Text style={styles.emptyText}>The customer or their relationship manager starts this chat. You can also kick it off by requesting a document below.</Text>
          <TouchableOpacity style={styles.requestDocBtn} onPress={openRequestModal} activeOpacity={0.85}>
            <Icon name="note-add" size={16} color="#1D4ED8" />
            <Text style={styles.requestDocBtnText}>Request Document</Text>
          </TouchableOpacity>
        </View>
        <RequestDocumentModal
          visible={showRequestModal}
          onClose={() => setShowRequestModal(false)}
          docTypes={docTypes}
          selectedDocLabel={selectedDocLabel}
          setSelectedDocLabel={setSelectedDocLabel}
          customDocLabel={customDocLabel}
          setCustomDocLabel={setCustomDocLabel}
          requestNote={requestNote}
          setRequestNote={setRequestNote}
          canSend={!!requestLabel}
          sending={requestSending}
          onSend={handleSendDocumentRequest}
        />
        <AppAlert {...alertProps} />
      </View>
    );
  }

  const pill = getStatusPill(chat.statusLabel);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header navigation={navigation} title={chat.ticketNumber || 'Support Chat'} showBack />

      <View style={styles.chatWrap}>
        <View style={styles.card}>
          <View style={styles.threadHeaderRow}>
            <View style={styles.threadHeaderLeft}>
              <Text style={styles.threadSubject} numberOfLines={1}>{chat.subject || 'Job support'}</Text>
              <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                <Text style={[styles.statusPillText, { color: pill.text }]}>{chat.statusLabel}</Text>
              </View>
            </View>
            <Text style={styles.threadDate}>{formatTime(chat.createdAt)}</Text>
          </View>

          <ScrollView
            ref={scrollRef}
            style={styles.messagesScroll}
            contentContainerStyle={styles.messagesContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {replies.length === 0 ? (
              <Text style={styles.noMsgText}>No messages yet.</Text>
            ) : (
              replies.map(msg => {
                const mine = isMine(msg);
                const dr = msg.documentRequest;

                // A document request rides on several replies over its life (the
                // ask, an upload, a reopen...) — only the reply carrying the
                // current live state (isLatest) gets the full card; every other
                // one with a documentRequest is just plain text.
                if (dr && dr.isLatest) {
                  const docPill = getDocStatusPill(dr.status);
                  const fulfilled = String(dr.status).toLowerCase() === 'fulfilled';
                  return (
                    <View key={msg.id} style={[styles.docCard, fulfilled ? styles.docCardFulfilled : styles.docCardPending]}>
                      <View style={styles.docCardHeaderRow}>
                        <View style={styles.docCardHeaderLeft}>
                          <Icon name="description" size={16} color={fulfilled ? '#15803D' : '#C2410C'} />
                          <Text style={styles.docCardTitle}>Document Request</Text>
                        </View>
                        <View style={[styles.docStatusPill, { backgroundColor: docPill.bg }]}>
                          <Text style={[styles.docStatusPillText, { color: docPill.text }]}>{docPill.label}</Text>
                        </View>
                      </View>
                      <Text style={styles.docCardMeta}>{[msg.authorName, formatTime(msg.createdAt)].filter(Boolean).join(' · ')}</Text>
                      <Text style={styles.docCardText}>{msg.message}</Text>
                      {dr.files.length > 0 && (
                        <View style={styles.docFileList}>
                          {dr.files.map((f, idx) => (
                            <TouchableOpacity key={f.url || idx} style={styles.docFileRow} onPress={() => openAttachment(f, f.name || `File ${idx + 1}`)}>
                              <Icon name="attach-file" size={14} color="#1D4ED8" />
                              <Text style={styles.docFileLink}>File {idx + 1}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      {fulfilled && (
                        <TouchableOpacity
                          style={styles.reopenBtn}
                          onPress={() => handleReopen(dr.id)}
                          disabled={reopeningId === dr.id}
                          activeOpacity={0.85}
                        >
                          {reopeningId === dr.id ? <ActivityIndicator size="small" color="#B45309" /> : (
                            <>
                              <Icon name="replay" size={14} color="#B45309" />
                              <Text style={styles.reopenBtnText}>Reopen — ask again</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }

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
          </ScrollView>

          {isResolved ? (
            <View style={styles.resolvedNote}>
              <Icon name="lock" size={14} color="#059669" />
              <Text style={styles.resolvedNoteText}>This chat has been resolved.</Text>
            </View>
          ) : (
            <>
              <View style={styles.replyInputRow}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type a reply..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={replyText}
                  onChangeText={setReplyText}
                />
              </View>
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.requestDocBtn} onPress={openRequestModal} activeOpacity={0.85}>
                  <Icon name="note-add" size={16} color="#1D4ED8" />
                  <Text style={styles.requestDocBtnText}>Request Document</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.sendBtn, (!replyText.trim() || sending) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!replyText.trim() || sending}>
                  {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                    <>
                      <Text style={styles.sendBtnText}>Send</Text>
                      <Icon name="send" size={16} color="#FFFFFF" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
      <RequestDocumentModal
        visible={showRequestModal}
        onClose={() => setShowRequestModal(false)}
        docTypes={docTypes}
        selectedDocLabel={selectedDocLabel}
        setSelectedDocLabel={setSelectedDocLabel}
        customDocLabel={customDocLabel}
        setCustomDocLabel={setCustomDocLabel}
        requestNote={requestNote}
        setRequestNote={setRequestNote}
        canSend={!!requestLabel}
        sending={requestSending}
        onSend={handleSendDocumentRequest}
      />
      {preview}
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

// The "Request Document" picker: a scrollable list of common document names
// (from GET /vendor/document-request-types) plus an always-present "Other"
// row that reveals free text, an optional note, and Send Request.
function RequestDocumentModal({
  visible, onClose, docTypes, selectedDocLabel, setSelectedDocLabel,
  customDocLabel, setCustomDocLabel, requestNote, setRequestNote,
  canSend, sending, onSend,
}) {
  const options = [...docTypes, OTHER_OPTION];
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Request Document</Text>
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetLabel}>Select a document…</Text>
            <ScrollView style={styles.optionsList} nestedScrollEnabled keyboardShouldPersistTaps="handled">
              {options.map(opt => {
                const selected = selectedDocLabel === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                    onPress={() => setSelectedDocLabel(opt)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedDocLabel === OTHER_OPTION && (
              <TextInput
                style={styles.customInput}
                placeholder="Type the document name..."
                placeholderTextColor="#94A3B8"
                value={customDocLabel}
                onChangeText={setCustomDocLabel}
              />
            )}

            <TextInput
              style={styles.noteInput}
              placeholder="Optional note..."
              placeholderTextColor="#94A3B8"
              multiline
              value={requestNote}
              onChangeText={setRequestNote}
            />

            <TouchableOpacity
              style={[styles.sendRequestBtn, (!canSend || sending) && styles.sendBtnDisabled]}
              onPress={onSend}
              disabled={!canSend || sending}
              activeOpacity={0.85}
            >
              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.sendRequestBtnText}>Send Request</Text>}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  chatWrap: { flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },

  card: {
    maxHeight: '100%',
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

  messagesScroll: { flexShrink: 1 },
  messagesContent: { gap: 12, paddingBottom: 4 },
  noMsgText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 8 },
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

  // Document Request card — rendered only on the reply carrying the latest
  // live state of a document request (see isLatest in the render logic above).
  docCard: { alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderWidth: 1.5, borderRadius: 16, padding: 14, gap: 6 },
  docCardPending: { borderColor: '#FDBA74', backgroundColor: '#FFFBF5' },
  docCardFulfilled: { borderColor: '#86EFAC' },
  docCardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  docCardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  docCardTitle: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', fontWeight: '700' },
  docStatusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  docStatusPillText: { fontSize: 11, fontWeight: '700' },
  docCardMeta: { fontSize: 11, color: '#94A3B8' },
  docCardText: { fontSize: 13.5, color: '#0F172A', lineHeight: 19 },
  docFileList: { gap: 4, marginTop: 2 },
  docFileRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docFileLink: { fontSize: 13, color: '#1D4ED8', textDecorationLine: 'underline', fontFamily: typography.labelMedium.fontFamily },
  reopenBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1.5, borderColor: '#F59E0B', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, marginTop: 4 },
  reopenBtnText: { color: '#B45309', fontSize: 12.5, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  resolvedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  resolvedNoteText: { fontSize: 13, color: '#059669', fontFamily: typography.labelMedium.fontFamily },

  replyInputRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  replyInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', maxHeight: 100 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 },
  requestDocBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#1D4ED8', borderRadius: 20, paddingHorizontal: 14, height: 44 },
  requestDocBtnText: { color: '#1D4ED8', fontSize: 13, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 16, height: 44 },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },

  // Request Document picker modal
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)' },
  overlayTouchable: { flex: 1, justifyContent: 'center', paddingHorizontal: 20 },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, maxHeight: '85%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  sheetLabel: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B', marginBottom: 6 },
  optionsList: { maxHeight: 220, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, marginBottom: 12 },
  optionRow: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionRowSelected: { backgroundColor: '#1D4ED8' },
  optionText: { fontSize: 14, color: '#0F172A' },
  optionTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  customInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', marginBottom: 12 },
  noteInput: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', minHeight: 60, textAlignVertical: 'top', marginBottom: 16 },
  sendRequestBtn: { backgroundColor: '#D94625', borderRadius: 20, paddingVertical: 14, alignItems: 'center' },
  sendRequestBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: typography.h4.fontFamily },
});

export default JobSupportChat;
