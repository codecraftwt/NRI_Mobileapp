import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, StatusBar, ActivityIndicator, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { typography } from '../../theme/typography';
import { getRmSupportTicketDetail, replyRmSupportTicket, escalateRmSupportTicket, changeRmSupportTicketStatus } from '../../Api/RM/rmSupportApi';

function statusPill(statusLabel) {
  switch ((statusLabel || '').toLowerCase()) {
    case 'resolved':
    case 'closed': return { bg: '#D1FAE5', text: '#059669' };
    case 'escalated': return { bg: '#FEE2E2', text: '#DC2626' };
    case 'open': return { bg: '#DBEAFE', text: '#1D4ED8' };
    default: return { bg: '#FEF3E7', text: '#C2410C' };
  }
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Timestamps arrive as UTC ("...Z"). Pin the display to UTC so it matches the
  // backend/admin value on every device, regardless of the phone's local zone.
  // hour12 gives a 12-hour clock; force the meridiem to uppercase (AM/PM).
  const s = d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'UTC' });
  return s.replace(/\b(am|pm)\b/i, m => m.toUpperCase());
}

function formatPrice(value) {
  if (value == null || isNaN(Number(value))) return null;
  return `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const TABS = [
  { key: 'chat', label: 'Chat', icon: 'forum' },
  { key: 'details', label: 'Details', icon: 'info-outline' },
];

// Statuses an RM can set manually (escalation is a separate action).
const STATUS_CHOICES = [
  { key: 'pending', label: 'Pending' },
  { key: 'open', label: 'Open' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

function SupportTicketDetail({ route, navigation }) {
  const { ticketId, ticketNumber } = route.params || {};
  const user = useSelector(s => s.user.user);
  const { showAlert, alertProps } = useAppAlert();

  const [tab, setTab] = useState('chat');
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [sending, setSending] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);
  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const res = await getRmSupportTicketDetail(ticketId);
      setTicket(res.ticket);
      setReplies(res.replies);
      setSelectedStatus((res.ticket?.status || '').toLowerCase());
    } catch (e) {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // The RM's own replies sit on the right — trust the forced flag on a just-sent
  // reply, else match the logged-in RM by id/name. Customer (and admin) replies
  // stay on the left.
  const isMine = (msg) => {
    if (msg.fromRm) return true;
    if (msg.fromCustomer) return false;
    if (msg.authorId != null && user?.id != null && String(msg.authorId) === String(user.id)) return true;
    const myName = (user?.name || '').trim().toLowerCase();
    return !!myName && (msg.authorName || '').trim().toLowerCase() === myName;
  };

  const status = (ticket?.status || '').toLowerCase();
  const isClosed = ['resolved', 'closed'].includes(status);
  const isEscalated = status === 'escalated' || !!ticket?.escalated;

  const handleSend = async () => {
    if (!replyText.trim() || sending) return;
    const text = replyText.trim();
    const asInternal = internalNote;
    // Show the message immediately with a temporary id, then swap in the
    // server copy (or drop it on failure) once the request resolves.
    const tempId = `temp-${text.length}-${replies.length}`;
    const optimistic = {
      id: tempId,
      message: text,
      isInternal: asInternal,
      fromRm: true,
      authorName: user?.name || '',
      createdAt: new Date().toISOString(),
    };
    setReplyText('');
    setReplies(prev => [...prev, optimistic]);
    setSending(true);
    try {
      const res = await replyRmSupportTicket(ticketId, text, { isInternal: asInternal });
      // Swap the optimistic bubble for the server copy when we get one; if the
      // reply endpoint echoes nothing usable, keep the optimistic bubble as-is
      // rather than reloading (a refetch can briefly drop the just-sent reply).
      if (res.reply) {
        setReplies(prev => prev.map(m => (m.id === tempId ? { ...res.reply, isInternal: res.reply.isInternal || asInternal } : m)));
      }
      setInternalNote(false);
    } catch (e) {
      setReplies(prev => prev.filter(m => m.id !== tempId));
      setReplyText(text);
      const msg = e?.status === 422
        ? 'This ticket is closed and can no longer be replied to.'
        : e?.status === 403
          ? "This ticket belongs to another relationship manager's customer."
          : e?.message || 'Please try again.';
      showAlert('Could Not Send', msg);
    } finally {
      setSending(false);
    }
  };

  const handleEscalate = () => {
    showAlert(
      'Escalate to Admin',
      'This routes the ticket up to the admin team for further handling. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Escalate',
          style: 'destructive',
          onPress: async () => {
            setEscalating(true);
            try {
              await escalateRmSupportTicket(ticketId);
              await load();
              showAlert('Escalated', 'The ticket has been escalated to the admin team.');
            } catch (e) {
              showAlert('Could Not Escalate', e?.status === 422 ? 'This ticket has already been escalated.' : (e?.message || 'Please try again.'));
            } finally {
              setEscalating(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus || updatingStatus || selectedStatus === status) return;
    setUpdatingStatus(true);
    try {
      const res = await changeRmSupportTicketStatus(ticketId, selectedStatus);
      setTicket(res.ticket);
      if (res.replies?.length) setReplies(res.replies);
      setSelectedStatus((res.ticket?.status || '').toLowerCase());
      showAlert('Status Updated', res.message || 'The ticket status has been updated.');
    } catch (e) {
      setSelectedStatus(status);
      const msg = e?.status === 403
        ? "This ticket belongs to another relationship manager's customer."
        : e?.status === 422
          ? 'That status change is not allowed for this ticket.'
          : e?.message || 'Please try again.';
      showAlert('Could Not Update Status', msg);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const NavyHeader = (
    <>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{ticket?.ticketNumber || ticketNumber || 'Support Ticket'}</Text>
      </View>
    </>
  );

  if (loading && !ticket) {
    return (
      <View style={styles.container}>
        {NavyHeader}
        <View style={styles.centerFill}><ActivityIndicator size="large" color="#20304C" /></View>
      </View>
    );
  }

  if (failed && !ticket) {
    return (
      <View style={styles.container}>
        {NavyHeader}
        <View style={styles.centerFill}>
          <Icon name="error-outline" size={44} color="#CBD5E1" />
          <Text style={styles.emptyText}>Could not load this ticket.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); load(); }}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const pill = statusPill(ticket?.statusLabel);
  const selKey = selectedStatus || status;
  const selStatusLabel = STATUS_CHOICES.find(o => o.key === selKey)?.label || ticket?.statusLabel || 'Select status';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
      {NavyHeader}

      {/* Segmented tabs */}
      <View style={styles.tabBar}>
        {TABS.map(t => {
          const active = tab === t.key;
          return (
            <TouchableOpacity key={t.key} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setTab(t.key)} activeOpacity={0.8}>
              <Icon name={t.icon} size={16} color={active ? '#FFFFFF' : '#64748B'} />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
              {t.key === 'chat' && replies.length > 0 && (
                <View style={[styles.tabCount, active && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{replies.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ---------- CHAT (NRI card style — messages scroll, composer fixed) ---------- */}
      {tab === 'chat' ? (
        <View style={styles.chatWrap}>
          <View style={styles.chatCard}>
            {/* Thread header */}
            <View style={styles.threadHeaderRow}>
              <View style={styles.threadHeaderLeft}>
                <Text style={styles.threadSubject} numberOfLines={1}>{ticket?.subject || 'Support request'}</Text>
                <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                  <Text style={[styles.statusPillText, { color: pill.text }]}>{ticket?.statusLabel}</Text>
                </View>
              </View>
              {!!ticket?.createdAt && <Text style={styles.threadDate}>{formatTime(ticket.createdAt)}</Text>}
            </View>

            {/* Messages (only this area scrolls) */}
            <ScrollView
              ref={scrollRef}
              style={styles.messagesScroll}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {replies.length === 0 ? (
                <Text style={styles.noMsgText}>No messages yet. Send the first response below.</Text>
              ) : (
                replies.map(msg => {
                  // Custom Plan proposal — a full-width card with the proposed price
                  // and (once the customer accepts) the converted job number.
                  if (msg.proposedPrice != null) {
                    const priceLabel = formatPrice(msg.proposedPrice);
                    return (
                      <View key={msg.id} style={styles.proposalCard}>
                        <View style={styles.proposalTopRow}>
                          <View style={styles.proposalHeadLeft}>
                            <Icon name="description" size={16} color="#15803D" />
                            <Text style={styles.proposalTitle}>Custom Plan Proposal</Text>
                          </View>
                          {!!priceLabel && <Text style={styles.proposalPrice}>{priceLabel}</Text>}
                        </View>
                        <Text style={styles.proposalMeta}>{[msg.authorName, formatTime(msg.createdAt)].filter(Boolean).join(' · ')}</Text>
                        {!!msg.message && <Text style={styles.proposalMessage}>{msg.message}</Text>}
                        {msg.convertedTicketNumber ? (
                          <View style={styles.acceptedPill}>
                            <Icon name="check-circle" size={14} color="#15803D" />
                            <Text style={styles.acceptedText}>Accepted — Job {msg.convertedTicketNumber}</Text>
                          </View>
                        ) : (
                          <View style={styles.awaitingPill}>
                            <Icon name="hourglass-empty" size={13} color="#C2410C" />
                            <Text style={styles.awaitingText}>Awaiting customer acceptance</Text>
                          </View>
                        )}
                      </View>
                    );
                  }

                  // Internal staff-only note — distinct amber card, hidden from customer.
                  if (msg.isInternal) {
                    return (
                      <View key={msg.id} style={styles.internalCard}>
                        <View style={styles.internalHeadRow}>
                          <Icon name="lock" size={13} color="#B45309" />
                          <Text style={styles.internalHeadText}>Internal note · {msg.authorName || 'Staff'}</Text>
                        </View>
                        <Text style={styles.internalMessage}>{msg.message}</Text>
                        <Text style={styles.internalTime}>{formatTime(msg.createdAt)}</Text>
                      </View>
                    );
                  }

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
            </ScrollView>

            {/* Reply / closed note — fixed at the bottom of the card */}
            {isClosed ? (
              <View style={styles.closedNote}>
                <Icon name="lock" size={14} color="#059669" />
                <Text style={styles.closedNoteText}>This ticket is resolved and closed for replies.</Text>
              </View>
            ) : (
              <View style={styles.cardComposer}>
                <TouchableOpacity style={styles.internalToggle} onPress={() => setInternalNote(v => !v)} activeOpacity={0.7}>
                  <View style={[styles.checkbox, internalNote && styles.checkboxOn]}>
                    {internalNote && <Icon name="check" size={12} color="#FFFFFF" />}
                  </View>
                  <Text style={styles.internalToggleText}>Internal note (staff only, hidden from customer)</Text>
                </TouchableOpacity>
                <View style={styles.replyRow}>
                  <TextInput
                    style={[styles.replyInput, internalNote && styles.replyInputInternal]}
                    placeholder={internalNote ? 'Add an internal note...' : 'Type a reply to the customer...'}
                    placeholderTextColor="#94A3B8"
                    multiline
                    value={replyText}
                    onChangeText={setReplyText}
                  />
                  <TouchableOpacity style={[styles.sendBtn, internalNote && styles.sendBtnInternal, (!replyText.trim() || sending) && styles.sendBtnDisabled]} onPress={handleSend} disabled={!replyText.trim() || sending}>
                    {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="send" size={20} color="#FFFFFF" />}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      ) : (
        /* ---------- DETAILS ---------- */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Ticket summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTop}>
              <Text style={styles.summarySubject} numberOfLines={3}>{ticket?.subject || 'Support request'}</Text>
              <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                <Text style={[styles.statusPillText, { color: pill.text }]}>{ticket?.statusLabel}</Text>
              </View>
            </View>

            <View style={styles.detailDivider} />

            {!!ticket?.customer?.name && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconBg}><Icon name="person" size={16} color="#2563EB" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Customer</Text>
                  <Text style={styles.detailValue}>{ticket.customer.name}</Text>
                </View>
              </View>
            )}
            {!!ticket?.categoryLabel && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconBg}><Icon name="label-outline" size={16} color="#2563EB" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{ticket.categoryLabel}</Text>
                </View>
              </View>
            )}
            {(!!ticket?.state?.name || !!ticket?.city?.name) && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconBg}><Icon name="location-on" size={16} color="#2563EB" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{[ticket?.city?.name, ticket?.state?.name].filter(Boolean).join(', ')}</Text>
                </View>
              </View>
            )}
            {!!ticket?.createdAt && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconBg}><Icon name="event-note" size={16} color="#2563EB" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailLabel}>Raised</Text>
                  <Text style={styles.detailValue}>{formatTime(ticket.createdAt)}</Text>
                </View>
              </View>
            )}
          </View>

          {/* Change Status — its own section */}
          <View style={styles.cardTitleRow}>
            <Icon name="flag" size={16} color="#20304C" />
            <Text style={styles.cardTitleText}>Change Status</Text>
          </View>
          <View style={styles.statusCard}>
            {isEscalated ? (
              <Text style={styles.escalateHint}>Status is managed by the admin team while this ticket is escalated.</Text>
            ) : (
              <>
                <Text style={styles.selectLabel}>Status</Text>
                <TouchableOpacity style={styles.selectField} onPress={() => setStatusPickerVisible(true)} activeOpacity={0.8}>
                  <Text style={styles.selectValue}>{selStatusLabel}</Text>
                  <Icon name="expand-more" size={22} color="#64748B" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.updateBtn, (updatingStatus || (selectedStatus || status) === status) && styles.btnDisabled]}
                  onPress={handleUpdateStatus}
                  disabled={updatingStatus || (selectedStatus || status) === status}
                  activeOpacity={0.85}
                >
                  {updatingStatus ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                    <>
                      <Icon name="check" size={16} color="#FFFFFF" />
                      <Text style={styles.updateBtnText}>Update Status</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Escalation — its own section */}
          <View style={styles.cardTitleRow}>
            <Icon name="report-problem" size={16} color="#20304C" />
            <Text style={styles.cardTitleText}>Escalation</Text>
          </View>
          <View style={styles.escalateCard}>
            {isEscalated ? (
              <View style={styles.escalatedNote}>
                <View style={styles.escalatedIconBg}><Icon name="arrow-upward" size={18} color="#DC2626" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.escalatedTitle}>Escalated to Admin</Text>
                  <Text style={styles.escalatedSub}>This ticket is now with the admin team for further handling.</Text>
                </View>
              </View>
            ) : isClosed ? (
              <View style={styles.escalatedNote}>
                <View style={[styles.escalatedIconBg, { backgroundColor: '#ECFDF5' }]}><Icon name="check-circle" size={18} color="#059669" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.escalatedTitle, { color: '#059669' }]}>Ticket Resolved</Text>
                  <Text style={styles.escalatedSub}>This ticket is closed. No escalation needed.</Text>
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.escalateHint}>Can't resolve this at your level? Route it up to the admin team.</Text>
                <TouchableOpacity style={styles.escalateBtn} onPress={handleEscalate} disabled={escalating} activeOpacity={0.85}>
                  {escalating ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                    <>
                      <Icon name="arrow-upward" size={16} color="#FFFFFF" />
                      <Text style={styles.escalateBtnText}>Escalate to Admin</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Status picker dropdown */}
      <Modal visible={statusPickerVisible} transparent animationType="fade" onRequestClose={() => setStatusPickerVisible(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setStatusPickerVisible(false)}>
          <TouchableOpacity style={styles.pickerCard} activeOpacity={1}>
            <Text style={styles.pickerTitle}>Select Status</Text>
            {STATUS_CHOICES.map(o => {
              const active = selKey === o.key;
              const sp = statusPill(o.key);
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[styles.pickerOption, active && styles.pickerOptionActive]}
                  onPress={() => { setSelectedStatus(o.key); setStatusPickerVisible(false); }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.pickerOptionText, active && { color: sp.text }]}>{o.label}</Text>
                  {active && <Icon name="check" size={18} color={sp.text} />}
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8, backgroundColor: '#20304C' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { marginLeft: 6 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },

  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  retryBtn: { backgroundColor: '#20304C', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },

  // Tabs
  tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12 },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  tabBtnActive: { backgroundColor: '#20304C', borderColor: '#20304C' },
  tabLabel: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  tabLabelActive: { color: '#FFFFFF' },
  tabCount: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  tabCountTextActive: { color: '#FFFFFF' },

  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  // Chat tab (NRI card style). The card hugs its content and grows as the
  // conversation gets longer; maxHeight caps it to the available space, after
  // which the messages area scrolls (flexShrink) while the composer stays fixed.
  chatWrap: { flex: 1, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 16 },
  chatCard: {
    maxHeight: '100%', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  threadHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  threadHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  threadSubject: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', flexShrink: 1 },
  threadDate: { fontSize: 11, color: '#94A3B8' },
  messagesScroll: { flexShrink: 1, marginTop: 14 },
  messagesContent: { gap: 12, paddingBottom: 4 },
  noMsgText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 12, lineHeight: 19 },
  closedNote: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  closedNoteText: { fontSize: 13, color: '#059669', fontFamily: typography.labelMedium.fontFamily },
  cardComposer: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  // Details tab
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 30 },
  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  summaryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  summarySubject: { flex: 1, fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', lineHeight: 22 },
  detailDivider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 14, marginBottom: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10 },
  detailIconBg: { width: 34, height: 34, borderRadius: 11, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  detailLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 2, lineHeight: 19 },

  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 },
  cardTitleText: { fontSize: 15, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A' },
  escalateCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  escalateHint: { fontSize: 13, color: '#64748B', lineHeight: 19, marginBottom: 14 },
  statusCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  selectLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 },
  selectField: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, marginBottom: 14 },
  selectValue: { flex: 1, fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  updateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#20304C', borderRadius: 14, paddingVertical: 13 },
  updateBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  // Status picker dropdown
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', paddingHorizontal: 32 },
  pickerCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 12 },
  pickerTitle: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A', paddingHorizontal: 8, paddingTop: 4, paddingBottom: 8 },
  pickerOption: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13, paddingHorizontal: 10, borderRadius: 12 },
  pickerOptionActive: { backgroundColor: '#F8FAFC' },
  pickerOptionText: { flex: 1, fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  escalateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#DC2626', borderRadius: 14, paddingVertical: 13 },
  escalateBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  escalatedNote: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  escalatedIconBg: { width: 40, height: 40, borderRadius: 13, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center' },
  escalatedTitle: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#DC2626', fontWeight: '700' },
  escalatedSub: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 17 },
  bubbleRow: { maxWidth: '85%', alignSelf: 'flex-start' },
  bubbleRowMe: { alignSelf: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleSupport: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9', borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: '#334565', borderBottomRightRadius: 4 },
  bubbleAuthor: { fontSize: 11, fontWeight: '700', color: '#64748B', marginBottom: 2 },
  bubbleAuthorMe: { color: 'rgba(255,255,255,0.85)' },
  bubbleText: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  bubbleTextMe: { color: '#FFFFFF' },
  bubbleTime: { fontSize: 10, color: '#94A3B8', marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },

  // Custom Plan proposal card
  proposalCard: { alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 16, padding: 14, gap: 6 },
  proposalTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  proposalHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  proposalTitle: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#15803D', fontWeight: '700' },
  proposalPrice: { fontSize: 20, fontFamily: typography.h4.fontFamily, color: '#15803D', fontWeight: '800' },
  proposalMeta: { fontSize: 11, color: '#94A3B8' },
  proposalMessage: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  acceptedPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#D1FAE5', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2 },
  acceptedText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#15803D', fontWeight: '700' },
  awaitingPill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#FEF3E7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginTop: 2 },
  awaitingText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#C2410C', fontWeight: '700' },

  // Internal staff-only note
  internalCard: { alignSelf: 'stretch', backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 14, padding: 12, gap: 4 },
  internalHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  internalHeadText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#B45309', fontWeight: '700' },
  internalMessage: { fontSize: 14, color: '#0F172A', lineHeight: 20 },
  internalTime: { fontSize: 10, color: '#B45309', opacity: 0.7 },

  // Fixed composer bar
  closedBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#ECFDF5', paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#D1FAE5' },
  closedBarText: { fontSize: 13, color: '#059669', fontFamily: typography.labelMedium.fontFamily },
  composer: { backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  internalToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, marginBottom: 4 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  checkboxOn: { backgroundColor: '#B45309', borderColor: '#B45309' },
  internalToggleText: { fontSize: 12, color: '#64748B' },
  replyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  replyInput: { flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', maxHeight: 110, minHeight: 44 },
  replyInputInternal: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  sendBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#D94625', justifyContent: 'center', alignItems: 'center' },
  sendBtnInternal: { backgroundColor: '#B45309' },
  sendBtnDisabled: { opacity: 0.5 },
});

export default SupportTicketDetail;
