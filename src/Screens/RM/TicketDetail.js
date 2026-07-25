import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const STATUS_STYLES = {
  New: { bg: '#EEF2FF', text: '#6366F1' },
  Assigned: { bg: '#DBEAFE', text: '#2563EB' },
  'In Progress': { bg: '#FFEDD5', text: '#C2410C' },
  Completed: { bg: '#D1FAE5', text: '#059669' },
  Resolved: { bg: '#D1FAE5', text: '#059669' },
};

const statusStyle = (s) => STATUS_STYLES[s] || { bg: '#F3F4F6', text: '#4B5563' };

const DETAILS = [
  { icon: 'person', label: 'Customer', value: 'swara' },
  { icon: 'family-restroom', label: 'Family Member', value: 'neha' },
  { icon: 'home-repair-service', label: 'Service', value: 'Scheduled Home Visits by Care Executive' },
  { icon: 'location-on', label: 'Location', value: 'Kolhapur, Maharashtra\nHouse 121 - 12345' },
  { icon: 'schedule', label: 'SLA Deadline', value: '24 Jul 2026, 11:51' },
  { icon: 'event', label: 'Preferred Date', value: '—' },
];

const PRICING = [
  { label: 'Customer Price', value: '₹499.00' },
  { label: 'Express Surcharge', value: '₹0.00' },
  { label: 'GST (18%)', value: '₹89.82' },
];

const TIMELINE = [
  { status: 'New', from: null, time: '23 Jul 2026, 11:51', by: 'swara', note: 'Ticket created' },
  { status: 'Assigned', from: 'New', time: '23 Jul 2026, 12:00', by: 'Telecaller', note: 'Vendor assigned' },
  { status: 'In Progress', from: 'Assigned', time: '23 Jul 2026, 12:02', by: 'Ramesh', note: 'Service started' },
  { status: 'Completed', from: 'In Progress', time: '23 Jul 2026, 12:03', by: 'Ramesh', note: 'Report submitted by vendor' },
];

const INITIAL_CHAT = [
  { id: '1', name: 'swara', isCustomer: true, text: 'Hello', time: '23 Jul, 11:59 AM' },
  { id: '2', name: 'Telecaller', isCustomer: false, text: 'Hello , How can we help you ?', time: '23 Jul, 11:59 AM' },
  { id: '3', name: 'Ramesh', isCustomer: false, text: 'Hello , I will be completing your task .', time: '23 Jul, 12:02 PM' },
  { id: '4', name: 'swara', isCustomer: true, text: 'Thanks', time: '23 Jul, 12:03 PM' },
];

function TicketDetail({ navigation }) {
  const [messages, setMessages] = useState(INITIAL_CHAT);
  const [reply, setReply] = useState('');
  const [internalNote, setInternalNote] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);

  const currentStatus = 'Completed';
  const cur = statusStyle(currentStatus);

  const sendReply = () => {
    const text = reply.trim();
    if (!text) return;
    setMessages(prev => [
      ...prev,
      { id: String(prev.length + 1), name: 'You', isCustomer: false, text, time: 'Now', internal: internalNote },
    ]);
    setReply('');
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>NRI-2026-00022</Text>
          <Text style={styles.headerSub}>Ticket Details</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

   {/* Support Chat entry bar */}
          <TouchableOpacity style={styles.supportChatBar} activeOpacity={0.85} onPress={() => setChatVisible(true)}>
            <View style={styles.supportChatLeftIcon}>
              <Icon name="support-agent" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.supportChatTextWrap}>
              <View style={styles.supportChatTitleRow}>
                <Text style={styles.supportChatTitle}>Support Chat</Text>
                <View style={styles.chatOpenBadge}>
                  <Text style={styles.chatOpenText}>Open</Text>
                </View>
              </View>
              <Text style={styles.supportChatSubtitle} numberOfLines={1}>Continue your conversation</Text>
            </View>
            <View style={styles.supportChatRightIcon}>
              <Icon name="chat-bubble" size={20} color="#FFFFFF" />
              <View style={styles.chatUnreadBadge}>
                <Text style={styles.chatUnreadText}>{messages.length}</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          {/* Summary Card */}
          <View style={styles.card}>
            <View style={styles.topRow}>
              <Text style={styles.ticketNo}>NRI-2026-00022</Text>
              <View style={styles.badgeRow}>
                <Pill text="Completed" {...statusStyle('Completed')} />
                <View style={[styles.pill, { backgroundColor: '#F1F5F9' }]}>
                  <Text style={[styles.pillText, { color: '#475569' }]}>Standard</Text>
                </View>
              </View>
            </View>
            <Text style={styles.service}>Scheduled Home Visits by Care Executive</Text>

            <View style={styles.summaryDivider} />

            {DETAILS.map((d, i) => (
              <View key={d.label} style={[styles.infoRow, i < DETAILS.length - 1 && styles.rowBorder]}>
                <View style={styles.infoIconBg}><Icon name={d.icon} size={18} color="#64748B" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.infoLabel}>{d.label}</Text>
                  <Text style={styles.infoValue}>{d.value}</Text>
                </View>
              </View>
            ))}

            <View style={styles.summaryDivider} />
          </View>

          {/* Assignment */}
          <SectionTitle icon="assignment-ind" title="Assignment" action="Assign" onAction={() => {}} />
          <View style={styles.card}>
            <Text style={styles.subLabel}>Assigned Vendor</Text>
            <View style={styles.vendorBox}>
              <View style={styles.vendorTop}>
                <Text style={styles.vendorName}>Care centre</Text>
                <View style={[styles.pill, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={[styles.pillText, { color: '#6366F1' }]}>Individual</Text>
                </View>
              </View>
              <Text style={styles.vendorMeta}>Contact: Ramesh</Text>
              <View style={styles.ratingRow}>
                <Icon name="star" size={14} color="#F5B301" />
                <Text style={styles.ratingText}>4.5 · Top</Text>
              </View>
              <View style={styles.ratingRow}>
                <Icon name="email" size={13} color="#94A3B8" />
                <Text style={styles.vendorMeta}>ramesh@gmail.com</Text>
              </View>
              <Text style={styles.vendorAssigned}>Assigned 23 Jul 2026, 12:00 (1 day ago)</Text>
            </View>

            <View style={[styles.infoRow, styles.rowBorderTop]}>
              <View style={styles.infoIconBg}><Icon name="support-agent" size={18} color="#64748B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Relationship Manager</Text>
                <Text style={styles.infoValue}>Relationship Manager</Text>
              </View>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.infoIconBg}><Icon name="phone-in-talk" size={18} color="#64748B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>Telecaller</Text>
                <Text style={styles.infoValue}>—</Text>
              </View>
            </View>
          </View>

          {/* Pricing */}
          <SectionTitle icon="receipt-long" title="Pricing" />
          <View style={styles.card}>
            {PRICING.map((p) => (
              <View key={p.label} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{p.label}</Text>
                <Text style={styles.priceValue}>{p.value}</Text>
              </View>
            ))}
            <View style={[styles.priceRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹588.82</Text>
            </View>
            <View style={styles.vendorCostRow}>
              <View style={styles.detailItem}>
                <Icon name="lock" size={13} color="#94A3B8" />
                <Text style={styles.priceLabel}>Vendor Cost</Text>
              </View>
              <Text style={styles.priceValue}>₹250.00</Text>
            </View>
          </View>

          {/* Status Timeline */}
          <SectionTitle icon="timeline" title="Status Timeline" />
          <View style={styles.card}>
            {TIMELINE.map((t, idx) => {
              const s = statusStyle(t.status);
              const isLast = idx === TIMELINE.length - 1;
              return (
                <View key={idx} style={styles.tlRow}>
                  <View style={styles.tlLeft}>
                    <View style={[styles.tlDot, { backgroundColor: s.text }]} />
                    {!isLast && <View style={styles.tlLine} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: isLast ? 0 : 18 }}>
                    <View style={styles.tlHead}>
                      <View style={[styles.pill, { backgroundColor: s.bg }]}>
                        <Text style={[styles.pillText, { color: s.text }]}>{t.status}</Text>
                      </View>
                      {t.from && <Text style={styles.tlFrom}>from {t.from}</Text>}
                    </View>
                    <Text style={styles.tlMeta}>{t.time} · by {t.by}</Text>
                    <Text style={styles.tlNote}>{t.note}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Vendor Report */}
          <SectionTitle icon="description" title="Vendor Report" />
          <View style={styles.card}>
            <Text style={styles.reportText}>
              Work is done and attached the report for review, please share you valuable feedback and ratings
            </Text>
            <Text style={styles.reportMeta}>Submitted 23 Jul 2026, 12:03 by Care centre</Text>

            <TextInput
              style={styles.reviewInput}
              placeholder="Review comment (optional)"
              placeholderTextColor="#94A3B8"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
            />
            <TouchableOpacity
              style={[styles.reviewBtn, reviewed && styles.reviewBtnDone]}
              onPress={() => setReviewed(true)}
              activeOpacity={0.8}
            >
              <Icon name={reviewed ? 'check-circle' : 'check-circle-outline'} size={18} color={reviewed ? '#FFFFFF' : '#B45309'} />
              <Text style={[styles.reviewBtnText, reviewed && { color: '#FFFFFF' }]}>{reviewed ? 'Reviewed' : 'Mark Reviewed'}</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Support Chat Modal */}
      <Modal visible={chatVisible} animationType="slide" onRequestClose={() => setChatVisible(false)}>
        <View style={styles.container}>
          <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
          <View style={styles.header}>
            <TouchableOpacity style={styles.backBtn} onPress={() => setChatVisible(false)}>
              <Icon name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Support Chat</Text>
              <Text style={styles.headerSub}>NRI-2026-00022</Text>
            </View>
            <View style={styles.chatOpenBadge}>
              <Text style={styles.chatOpenText}>Open</Text>
            </View>
          </View>

          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <ScrollView contentContainerStyle={styles.chatScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {messages.map((m) => (
                <View key={m.id} style={[styles.msgWrap, m.isCustomer ? styles.msgRight : styles.msgLeft]}>
                  <Text style={styles.msgName}>{m.name}{m.internal ? ' · Internal' : ''}</Text>
                  <View style={[styles.bubble, m.isCustomer ? styles.bubbleCustomer : (m.internal ? styles.bubbleInternal : styles.bubbleStaff)]}>
                    <Text style={styles.bubbleText}>{m.text}</Text>
                  </View>
                  <Text style={styles.msgTime}>{m.time}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={styles.chatFooter}>
              <TouchableOpacity style={styles.checkRow} onPress={() => setInternalNote(v => !v)} activeOpacity={0.7}>
                <Icon name={internalNote ? 'check-box' : 'check-box-outline-blank'} size={20} color={internalNote ? '#D94625' : '#94A3B8'} />
                <Text style={styles.checkText}>Internal note (staff only, hidden from customer)</Text>
              </TouchableOpacity>

              <View style={styles.replyBox}>
                <TextInput
                  style={styles.replyInput}
                  placeholder="Type a reply..."
                  placeholderTextColor="#94A3B8"
                  value={reply}
                  onChangeText={setReply}
                  multiline
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendReply} activeOpacity={0.8}>
                  <Icon name="send" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.chatActions}>
                <TouchableOpacity style={[styles.outlineBtn, { borderColor: '#FCA5A5', flex: 1 }]} activeOpacity={0.8}>
                  <Icon name="report-problem" size={15} color="#DC2626" />
                  <Text style={[styles.outlineBtnText, { color: '#DC2626' }]}>Escalate to Admin</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.solidBtn, { flex: 1 }]} activeOpacity={0.8}>
                  <Text style={styles.solidBtnText}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

function SectionTitle({ icon, title, action, onAction, actionPill }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.detailItem}>
        <Icon name={icon} size={18} color="#20304C" />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {action ? (
        actionPill ? (
          <View style={[styles.pill, { backgroundColor: '#DBEAFE' }]}>
            <Text style={[styles.pillText, { color: '#2563EB' }]}>{action}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.sectionAction} onPress={onAction} activeOpacity={0.7}>
            <Icon name="add" size={15} color="#2563EB" />
            <Text style={styles.sectionActionText}>{action}</Text>
          </TouchableOpacity>
        )
      ) : null}
    </View>
  );
}

function Pill({ text, bg, textColor, ...rest }) {
  const color = rest.text ? undefined : textColor;
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Text style={[styles.pillText, { color: textColor || '#475569' }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 17, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 1 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 16 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  ticketNo: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#1E293B', flexShrink: 1 },
  badgeRow: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  service: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', lineHeight: 21, marginTop: 10 },
  summaryDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily },

  outlineBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, flex: 1,
  },
  outlineBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily },
  solidBtn: { backgroundColor: '#2563EB', borderRadius: 12, paddingVertical: 11, alignItems: 'center', justifyContent: 'center' },
  solidBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A' },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  sectionActionText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowBorderTop: { borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4 },
  infoIconBg: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#94A3B8' },
  infoValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 2, lineHeight: 19 },

  subLabel: { fontSize: 12, color: '#94A3B8', marginBottom: 8 },
  vendorBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  vendorTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  vendorName: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  vendorMeta: { fontSize: 13, color: '#64748B' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  ratingText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  vendorAssigned: { fontSize: 11, color: '#94A3B8', marginTop: 8 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  priceLabel: { fontSize: 14, color: '#475569' },
  priceValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 4, paddingTop: 12 },
  totalLabel: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  totalValue: { fontSize: 17, fontFamily: typography.h4.fontFamily, color: '#059669' },
  vendorCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  tlRow: { flexDirection: 'row', gap: 12 },
  tlLeft: { alignItems: 'center', width: 16 },
  tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  tlLine: { flex: 1, width: 2, backgroundColor: '#E2E8F0', marginVertical: 2 },
  tlHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tlFrom: { fontSize: 11, color: '#94A3B8' },
  tlMeta: { fontSize: 12, color: '#64748B', marginTop: 5 },
  tlNote: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 2 },

  // Support chat entry bar
  supportChatBar: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#EFF6FF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#DBEAFE', marginTop: 12,
  },
  supportChatLeftIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  supportChatTextWrap: { flex: 1, gap: 2 },
  supportChatTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  supportChatTitle: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  supportChatSubtitle: { fontSize: 12, color: '#3B82F6' },
  supportChatRightIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' },
  chatUnreadBadge: { position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#EFF6FF' },
  chatUnreadText: { fontSize: 10, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  chatOpenBadge: { backgroundColor: '#DBEAFE', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  chatOpenText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB' },

  // Chat modal
  chatScroll: { padding: 16, paddingBottom: 24 },
  chatFooter: { borderTopWidth: 1, borderTopColor: '#F1F5F9', backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },

  msgWrap: { marginBottom: 12, maxWidth: '85%' },
  msgLeft: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  msgRight: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  msgName: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#64748B', marginBottom: 3, marginHorizontal: 4 },
  bubble: { borderRadius: 14, paddingHorizontal: 12, paddingVertical: 9 },
  bubbleStaff: { backgroundColor: '#F1F5F9', borderTopLeftRadius: 4 },
  bubbleCustomer: { backgroundColor: '#E8F1FE', borderTopRightRadius: 4 },
  bubbleInternal: { backgroundColor: '#FEF3C7', borderTopLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: '#1E293B', lineHeight: 19 },
  msgTime: { fontSize: 10, color: '#94A3B8', marginTop: 3, marginHorizontal: 4 },

  replyBox: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 12 },
  replyInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1E293B', maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#D94625', justifyContent: 'center', alignItems: 'center' },

  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkText: { fontSize: 12, color: '#64748B', flex: 1 },
  chatActions: { flexDirection: 'row', gap: 10, marginTop: 12 },

  reportText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  reportMeta: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
  reviewInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1E293B', marginTop: 16, minHeight: 48, textAlignVertical: 'top' },
  reviewBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#FCD34D', backgroundColor: '#FEF9C3', borderRadius: 14, paddingVertical: 13, marginTop: 12 },
  reviewBtnDone: { backgroundColor: '#059669', borderColor: '#059669' },
  reviewBtnText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#B45309' },
});

export default TicketDetail;
