import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Linking, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch } from 'react-redux';
import { typography } from '../../theme/typography';
import { useRmRequestDetail } from '../../Hooks/RM/useRmRequestDetail';
import { reviewRmReport, sendRmReport } from '../../Redux/slices/rmReportsSlice';

const norm = (s) => String(s || '').toLowerCase();

const STATUS_STYLES = {
  new: { bg: '#EEF2FF', text: '#6366F1' },
  assigned: { bg: '#DBEAFE', text: '#2563EB' },
  in_progress: { bg: '#FFEDD5', text: '#C2410C' },
  completed: { bg: '#D1FAE5', text: '#059669' },
  resolved: { bg: '#D1FAE5', text: '#059669' },
};
const statusStyle = (s) => STATUS_STYLES[norm(s)] || { bg: '#F3F4F6', text: '#4B5563' };
const statusText = (s) => norm(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function fmt(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ago(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '';
  const day = 86400000;
  if (diff < day) return 'today';
  const days = Math.round(diff / day);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function inr(v) {
  if (v == null || v === '') return null;
  return `₹${Number(v).toFixed(2)}`;
}

// Glanceable SLA badge: red when overdue, amber when due, green when done.
function slaBadge(deadline, overdue, status) {
  const s = norm(status);
  if (s === 'resolved' || s === 'completed') return { label: 'Resolved', bg: '#D1FAE5', color: '#059669' };
  if (!deadline) return overdue ? { label: 'Overdue', bg: '#FEE2E2', color: '#DC2626' } : null;
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.round(Math.abs(diff) / 86400000);
  const isOverdue = overdue || diff < 0;
  if (isOverdue) return { label: days <= 0 ? 'Overdue' : `Overdue ${days}d`, bg: '#FEE2E2', color: '#DC2626' };
  return { label: days <= 0 ? 'Due today' : `Due in ${days}d`, bg: '#FEF3E7', color: '#C2410C' };
}

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'info-outline' },
  { key: 'activity', label: 'Activity', icon: 'history' },
];

function TicketDetail({ navigation, route }) {
  const ticketId = route?.params?.ticketId;
  const {
    detail, loading, failed, error, refresh,
    addNote, addingNote,
    escalate, escalating, escalateError,
  } = useRmRequestDetail(ticketId);

  const dispatch = useDispatch();

  const [tab, setTab] = useState('overview');
  const [noteText, setNoteText] = useState('');
  const [escalateVisible, setEscalateVisible] = useState(false);
  const [reason, setReason] = useState('');
  const [reviewVisible, setReviewVisible] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [sending, setSending] = useState(false);

  const report = detail?.vendorReport;

  const handleAddNote = () => {
    const text = noteText.trim();
    if (!text || addingNote) return;
    addNote(text).unwrap?.().then(() => setNoteText('')).catch(() => {});
  };

  const openReview = () => {
    setReviewComment(report?.reviewComment || '');
    setReviewVisible(true);
  };

  // POST /rm/reports/{report}/review — mark reviewed (optional comment).
  const submitReview = () => {
    if (!report?.id || reviewing) return;
    setReviewing(true);
    dispatch(reviewRmReport({ report: report.id, comment: reviewComment.trim() })).unwrap()
      .then(() => {
        setReviewVisible(false);
        refresh();
        Alert.alert('Report Reviewed', 'The vendor report has been marked as reviewed.');
      })
      .catch((e) => Alert.alert('Could Not Review', e?.status === 403 ? "This report belongs to another RM's ticket." : (e?.message || 'Please try again.')))
      .finally(() => setReviewing(false));
  };

  // POST /rm/reports/{report}/send — dispatch to the customer (422 if unreviewed).
  const handleSend = () => {
    if (!report?.id || sending) return;
    setSending(true);
    dispatch(sendRmReport({ report: report.id })).unwrap()
      .then(() => {
        refresh();
        Alert.alert('Report Sent', 'The report has been dispatched to the customer.');
      })
      .catch((e) => Alert.alert('Could Not Send', e?.status === 422 ? 'Review the report before sending it.' : (e?.message || 'Please try again.')))
      .finally(() => setSending(false));
  };

  const handleEscalate = () => {
    const r = reason.trim();
    if (!r || escalating) return;
    escalate({ reason: r }).unwrap?.().then(() => {
      setEscalateVisible(false);
      setReason('');
    }).catch(() => {});
  };

  const cur = statusStyle(detail?.status);
  const sla = detail ? slaBadge(detail.slaDeadline, detail.overdue, detail.status) : null;

  const detailRows = detail ? [
    { icon: 'person', label: 'Customer', value: detail.customer || '—' },
    detail.familyMember && { icon: 'family-restroom', label: 'Family Member', value: detail.familyMember },
    detail.location && { icon: 'location-on', label: 'Location', value: detail.location },
    { icon: 'schedule', label: 'SLA Deadline', value: fmt(detail.slaDeadline) },
    { icon: 'event', label: 'Preferred Date', value: detail.preferredDate ? fmt(detail.preferredDate) : '—' },
    { icon: 'event-note', label: 'Created', value: fmt(detail.createdAt) },
  ].filter(Boolean) : [];

  const pricingRows = detail ? [
    ['Customer Price', inr(detail.pricing.customerPrice)],
    ['Express Surcharge', inr(detail.pricing.expressSurcharge)],
    ['GST', inr(detail.pricing.gst)],
  ].filter(r => r[1] != null) : [];

  const noteCount = detail?.internalNotes?.length || 0;
  const activityCount = noteCount + (detail?.statusHistory?.length || 0) + (detail?.escalations?.length || 0);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{detail?.ticket || 'Request Details'}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading && !detail ? (
        <View style={styles.centerFill}><ActivityIndicator size="large" color="#20304C" /></View>
      ) : failed && !detail ? (
        <View style={styles.centerFill}>
          <Icon name="error-outline" size={44} color="#CBD5E1" />
          <Text style={styles.errorText}>{error?.message || 'Could not load this request.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          {/* Segmented tabs */}
          <View style={styles.tabBar}>
            {TABS.map(t => {
              const active = tab === t.key;
              const count = t.key === 'activity' ? activityCount : 0;
              return (
                <TouchableOpacity key={t.key} style={[styles.tabBtn, active && styles.tabBtnActive]} onPress={() => setTab(t.key)} activeOpacity={0.8}>
                  <Icon name={t.icon} size={16} color={active ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>{t.label}</Text>
                  {count > 0 && (
                    <View style={[styles.tabCount, active && styles.tabCountActive]}>
                      <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ---------- OVERVIEW ---------- */}
            {tab === 'overview' && (
              <>
                {/* Support chat action */}
                <TouchableOpacity
                  style={styles.supportChatBar}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('RMSupportChat', { ticketId, ticketNumber: detail?.ticket })}
                >
                  <View style={styles.supportChatLeftIcon}>
                    <Icon name="support-agent" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.supportChatTextWrap}>
                    <Text style={styles.supportChatTitle}>Support Chat</Text>
                    <Text style={styles.supportChatSubtitle} numberOfLines={1}>Chat with the customer about this request</Text>
                  </View>
                  {detail?.supportChat?.unreadCount > 0 ? (
                    <View style={styles.chatUnreadBadge}>
                      <Text style={styles.chatUnreadText}>{detail.supportChat.unreadCount > 9 ? '9+' : detail.supportChat.unreadCount}</Text>
                    </View>
                  ) : (
                    <Icon name="chevron-right" size={22} color="#3B82F6" />
                  )}
                </TouchableOpacity>

                {/* Request details */}
                <CardTitle icon="description" title="Request Details" />
                <View style={styles.card}>
                  {/* Status + SLA banner */}
                  <View style={[styles.statusBanner, { backgroundColor: cur.bg }]}>
                    <View style={styles.statusBannerLeft}>
                      <View style={[styles.statusDot, { backgroundColor: cur.text }]} />
                      <Text style={[styles.statusBannerText, { color: cur.text }]}>{statusText(detail?.status)}</Text>
                    </View>
                    {!!sla && (
                      <View style={styles.slaBannerWrap}>
                        <Icon name="schedule" size={13} color={sla.color} />
                        <Text style={[styles.slaBannerText, { color: sla.color }]}>{sla.label}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.detailService}>{detail?.service}</Text>
                  <View style={styles.priorityPill}>
                    <Icon name="flag" size={12} color="#475569" />
                    <Text style={styles.priorityPillText}>{detail?.priorityLabel || 'Standard'}</Text>
                  </View>

                  <View style={styles.detailDivider} />

                  {detailRows.map((d, i) => (
                    <View key={d.label} style={[styles.infoRow, i < detailRows.length - 1 && styles.rowBorder]}>
                      <View style={styles.infoIconBg}><Icon name={d.icon} size={18} color="#2563EB" /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>{d.label}</Text>
                        <Text style={styles.infoValue}>{d.value}</Text>
                      </View>
                    </View>
                  ))}

                  {!!detail?.customerNotes && (
                    <View style={styles.customerNote}>
                      <Icon name="chat" size={15} color="#0369A1" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.customerNoteLabel}>Customer Notes</Text>
                        <Text style={styles.customerNoteText}>{detail.customerNotes}</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Assignment */}
                {(!!detail?.vendor || !!detail?.rmName || !!detail?.telecaller) && (
                  <>
                    <CardTitle icon="assignment-ind" title="Assignment" />
                    <View style={styles.card}>
                      {!!detail?.vendor && (
                        <View style={styles.vendorBox}>
                          <View style={styles.vendorTop}>
                            <Text style={styles.vendorName}>{detail.vendor.name || 'Vendor'}</Text>
                            {!!detail.vendor.type && (
                              <View style={[styles.pill, { backgroundColor: '#EEF2FF' }]}>
                                <Text style={[styles.pillText, { color: '#6366F1' }]}>{detail.vendor.type}</Text>
                              </View>
                            )}
                          </View>
                          {!!detail.vendor.contact && <Text style={styles.vendorMeta}>Contact: {detail.vendor.contact}</Text>}
                          {detail.vendor.rating != null && (
                            <View style={styles.ratingRow}>
                              <Icon name="star" size={14} color="#F5B301" />
                              <Text style={styles.ratingText}>{detail.vendor.rating.toFixed(1)}{detail.vendor.ratingLabel ? ` · ${detail.vendor.ratingLabel}` : ''}</Text>
                            </View>
                          )}
                          {!!detail.vendor.phone && (
                            <View style={styles.ratingRow}>
                              <Icon name="phone" size={13} color="#94A3B8" />
                              <Text style={styles.vendorMeta}>{detail.vendor.phone}</Text>
                            </View>
                          )}
                          {!!detail.vendor.email && (
                            <View style={styles.ratingRow}>
                              <Icon name="email" size={13} color="#94A3B8" />
                              <Text style={styles.vendorMeta}>{detail.vendor.email}</Text>
                            </View>
                          )}
                          {!!detail.vendor.assignedAt && (
                            <Text style={styles.vendorAssigned}>Assigned {fmt(detail.vendor.assignedAt)} ({ago(detail.vendor.assignedAt)})</Text>
                          )}
                        </View>
                      )}

                      <View style={[styles.assignMetaRow, !!detail?.vendor && styles.assignMetaRowSpaced]}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.infoLabel}>Relationship Manager</Text>
                          <Text style={styles.assignValue}>{detail?.rmName || '—'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.infoLabel}>Telecaller</Text>
                          <Text style={styles.assignValue}>{detail?.telecaller || '—'}</Text>
                        </View>
                      </View>
                    </View>
                  </>
                )}

                {/* Pricing */}
                {(pricingRows.length > 0 || inr(detail?.pricing.total)) && (
                  <>
                    <CardTitle icon="receipt-long" title="Pricing" />
                    <View style={styles.card}>
                      {pricingRows.map(([label, value]) => (
                        <View key={label} style={styles.priceRow}>
                          <Text style={styles.priceLabel}>{label}</Text>
                          <Text style={styles.priceValue}>{value}</Text>
                        </View>
                      ))}
                      {!!inr(detail?.pricing.total) && (
                        <View style={[styles.priceRow, styles.totalRow]}>
                          <Text style={styles.totalLabel}>Total</Text>
                          <Text style={styles.totalValue}>{inr(detail.pricing.total)}</Text>
                        </View>
                      )}
                      {!!inr(detail?.pricing.vendorCost) && (
                        <View style={styles.vendorCostRow}>
                          <View style={styles.detailItem}>
                            <Icon name="lock" size={13} color="#94A3B8" />
                            <Text style={styles.priceLabel}>Vendor Cost</Text>
                          </View>
                          <Text style={styles.priceValue}>{inr(detail.pricing.vendorCost)}</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {/* Vendor Report */}
                {!!report && (
                  <>
                    <CardTitle icon="fact-check" title="Vendor Report" />
                    <View style={styles.card}>
                      <View style={styles.reportHead}>
                        {report.sent ? (
                          <View style={styles.sentPill}>
                            <Icon name="check-circle" size={13} color="#059669" />
                            <Text style={styles.sentPillText}>Sent{report.sentAt ? ` ${fmt(report.sentAt)}` : ''}</Text>
                          </View>
                        ) : report.reviewed ? (
                          <View style={[styles.sentPill, { backgroundColor: '#DBEAFE' }]}>
                            <Icon name="rate-review" size={13} color="#2563EB" />
                            <Text style={[styles.sentPillText, { color: '#2563EB' }]}>Reviewed</Text>
                          </View>
                        ) : (
                          <View style={[styles.sentPill, { backgroundColor: '#FEF3E7' }]}>
                            <Icon name="hourglass-empty" size={13} color="#C2410C" />
                            <Text style={[styles.sentPillText, { color: '#C2410C' }]}>Pending review</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.reportText}>{report.text || '—'}</Text>

                      {report.attachments?.length > 0 && (
                        <View style={styles.attachWrap}>
                          {report.attachments.map((a) => (
                            <TouchableOpacity
                              key={a.id}
                              style={styles.attachChip}
                              activeOpacity={0.8}
                              disabled={!a.url}
                              onPress={() => a.url && Linking.openURL(a.url)}
                            >
                              <Icon name="attach-file" size={15} color="#2563EB" />
                              <Text style={styles.attachChipText} numberOfLines={1}>{a.name}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {!!report.reviewComment && (
                        <View style={styles.reviewNote}>
                          <Icon name="rate-review" size={14} color="#2563EB" />
                          <Text style={styles.reviewNoteText}>{report.reviewComment}</Text>
                        </View>
                      )}

                      {(!!report.submittedAt || !!report.submittedBy || !!report.reviewedBy) && (
                        <Text style={styles.reportMeta}>
                          Submitted {fmt(report.submittedAt)}{report.submittedBy ? ` by ${report.submittedBy}` : ''}
                          {report.reviewedBy ? ` · Reviewed by ${report.reviewedBy}${report.reviewedAt ? ` at ${fmtDate(report.reviewedAt)}` : ''}` : ''}
                        </Text>
                      )}

                      {/* Review / Send actions */}
                      {!report.sent && (
                        report.id == null ? null : (
                          <View style={styles.reportActions}>
                            <TouchableOpacity
                              style={[styles.reportReviewBtn, reviewing && styles.btnDisabled]}
                              onPress={openReview}
                              disabled={reviewing}
                              activeOpacity={0.85}
                            >
                              <Icon name={report.reviewed ? 'edit' : 'check-circle-outline'} size={16} color="#2563EB" />
                              <Text style={styles.reportReviewBtnText}>{report.reviewed ? 'Edit Review' : 'Review'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.reportSendBtn, (!report.reviewed || sending) && styles.btnDisabled]}
                              onPress={handleSend}
                              disabled={!report.reviewed || sending}
                              activeOpacity={0.85}
                            >
                              {sending ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                                <>
                                  <Icon name="send" size={15} color="#FFFFFF" />
                                  <Text style={styles.reportSendBtnText}>Send to Customer</Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        )
                      )}
                    </View>
                  </>
                )}
              </>
            )}

            {/* ---------- ACTIVITY ---------- */}
            {tab === 'activity' && (
              <>
                {/* Internal Notes */}
                <CardTitle icon="sticky-note-2" title="Internal Notes" />
                <View style={styles.card}>
                  <View style={styles.notesHead}>
                    <Icon name="lock" size={14} color="#B45309" />
                    <Text style={styles.notesHeadText}>Staff only — not visible to the customer</Text>
                  </View>

                  {noteCount > 0 ? (
                    detail.internalNotes.map((n, i) => (
                      <View key={n.id} style={[styles.noteItem, i < noteCount - 1 && styles.rowBorder]}>
                        <View style={styles.noteAvatar}><Text style={styles.noteAvatarText}>{(n.author || 'S').charAt(0).toUpperCase()}</Text></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.noteText}>{n.note}</Text>
                          <Text style={styles.noteMeta}>{n.author}{n.createdAt ? ` · ${fmt(n.createdAt)}` : ''}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyBlock}>
                      <Icon name="sticky-note-2" size={30} color="#CBD5E1" />
                      <Text style={styles.emptyBlockText}>No internal notes yet.</Text>
                    </View>
                  )}

                  <View style={styles.composerRow}>
                    <TextInput
                      style={styles.composerInput}
                      placeholder="Add an internal note..."
                      placeholderTextColor="#94A3B8"
                      value={noteText}
                      onChangeText={setNoteText}
                      multiline
                    />
                    <TouchableOpacity
                      style={[styles.composerBtn, (!noteText.trim() || addingNote) && styles.btnDisabled]}
                      onPress={handleAddNote}
                      disabled={!noteText.trim() || addingNote}
                      activeOpacity={0.85}
                    >
                      {addingNote ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="send" size={18} color="#FFFFFF" />}
                    </TouchableOpacity>
                  </View>
                </View>

                <CardTitle icon="history" title="Status History" />
                <View style={styles.card}>
                  {detail?.statusHistory?.length > 0 ? (
                    detail.statusHistory.map((h, i) => {
                      const hs = statusStyle(h.status);
                      return (
                        <View key={h.id} style={styles.tlRow}>
                          <View style={styles.tlLeft}>
                            <View style={[styles.tlDot, { backgroundColor: hs.text }]} />
                            {i < detail.statusHistory.length - 1 && <View style={styles.tlLine} />}
                          </View>
                          <View style={{ flex: 1, paddingBottom: 16 }}>
                            <View style={styles.tlHead}>
                              <Text style={[styles.pillText, { color: hs.text }]}>{statusText(h.status)}</Text>
                              {!!h.from && <Text style={styles.tlFrom}>from {statusText(h.from)}</Text>}
                            </View>
                            {!!h.note && <Text style={styles.tlNote}>{h.note}</Text>}
                            <Text style={styles.tlMeta}>{fmt(h.at)}{h.by ? ` · ${h.by}` : ''}</Text>
                          </View>
                        </View>
                      );
                    })
                  ) : (
                    <View style={styles.emptyBlock}>
                      <Icon name="history" size={30} color="#CBD5E1" />
                      <Text style={styles.emptyBlockText}>No status updates yet.</Text>
                    </View>
                  )}
                </View>

                <CardTitle icon="report-problem" title="Escalations" />
                <View style={styles.card}>
                  {detail?.escalations?.length > 0 ? (
                    detail.escalations.map((e, i) => (
                      <View key={e.id} style={[styles.noteItem, i < detail.escalations.length - 1 && styles.rowBorder]}>
                        <View style={[styles.noteAvatar, { backgroundColor: '#FEE2E2' }]}><Icon name="north-east" size={15} color="#DC2626" /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.noteText}>{e.reason}</Text>
                          <Text style={styles.noteMeta}>{e.escalatedTo ? `To ${e.escalatedTo} · ` : ''}{e.statusLabel}{e.createdAt ? ` · ${fmt(e.createdAt)}` : ''}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.emptyBlock}>
                      <Icon name="verified" size={30} color="#CBD5E1" />
                      <Text style={styles.emptyBlockText}>No escalations raised.</Text>
                    </View>
                  )}
                  <TouchableOpacity style={styles.escalateBtn} onPress={() => setEscalateVisible(true)} activeOpacity={0.85}>
                    <Icon name="report-problem" size={16} color="#DC2626" />
                    <Text style={styles.escalateBtnText}>Escalate Request</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Review Report Modal */}
      <Modal visible={reviewVisible} transparent animationType="fade" onRequestClose={() => setReviewVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Review Report</Text>
            <Text style={styles.modalSub}>Add an optional review comment, then mark this report reviewed.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Review comment (optional)..."
              placeholderTextColor="#94A3B8"
              value={reviewComment}
              onChangeText={setReviewComment}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setReviewVisible(false)} activeOpacity={0.8}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnPrimary, reviewing && styles.btnDisabled]}
                onPress={submitReview}
                disabled={reviewing}
                activeOpacity={0.85}
              >
                {reviewing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalBtnDangerText}>Mark Reviewed</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Escalate Modal */}
      <Modal visible={escalateVisible} transparent animationType="fade" onRequestClose={() => setEscalateVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Escalate Request</Text>
            <Text style={styles.modalSub}>Routes up: district partner → state admin → super admin.</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Reason for escalation..."
              placeholderTextColor="#94A3B8"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            {!!escalateError && <Text style={styles.modalErrorText}>{escalateError.message}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setEscalateVisible(false)} activeOpacity={0.8}>
                <Text style={styles.modalBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnDanger, (!reason.trim() || escalating) && styles.btnDisabled]}
                onPress={handleEscalate}
                disabled={!reason.trim() || escalating}
                activeOpacity={0.85}
              >
                {escalating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalBtnDangerText}>Escalate</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function CardTitle({ icon, title }) {
  return (
    <View style={styles.cardTitleRow}>
      <Icon name={icon} size={16} color="#20304C" />
      <Text style={styles.cardTitleText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 8, backgroundColor: '#20304C' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },

  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  retryBtn: { backgroundColor: '#20304C', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },

  // Request Details
  statusBanner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  statusBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBannerText: { fontSize: 13, fontWeight: '800' },
  slaBannerWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slaBannerText: { fontSize: 12, fontWeight: '700' },
  detailService: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', lineHeight: 22, marginTop: 14 },
  priorityPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginTop: 10 },
  priorityPillText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#475569' },
  detailDivider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 14, marginBottom: 2 },
  customerNote: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 14, backgroundColor: '#F0F9FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E0F2FE' },
  customerNoteLabel: { fontSize: 11, color: '#0369A1', fontWeight: '700', marginBottom: 2 },
  customerNoteText: { fontSize: 13, color: '#0C4A6E', lineHeight: 18 },

  // Tabs
  tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#FDFBF7' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  tabBtnActive: { backgroundColor: '#20304C', borderColor: '#20304C' },
  tabLabel: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  tabLabelActive: { color: '#FFFFFF' },
  tabCount: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabCountText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
  tabCountTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 2 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 20, marginBottom: 10 },
  cardTitleText: { fontSize: 15, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A' },

  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily },

  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIconBg: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#94A3B8' },
  infoValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 2, lineHeight: 19 },

  vendorBox: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  vendorTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  vendorName: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  vendorMeta: { fontSize: 13, color: '#64748B' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  ratingText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  vendorAssigned: { fontSize: 11, color: '#94A3B8', marginTop: 8 },
  assignMetaRow: { flexDirection: 'row', gap: 16 },
  assignMetaRowSpaced: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  assignValue: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginTop: 4 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  priceLabel: { fontSize: 14, color: '#475569' },
  priceValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 4, paddingTop: 12 },
  totalLabel: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  totalValue: { fontSize: 17, fontFamily: typography.h4.fontFamily, color: '#059669' },
  vendorCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  reportHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sentPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#D1FAE5', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, marginRight: 'auto' },
  sentPillText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#059669' },
  reportText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  reviewNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 12, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12 },
  reviewNoteText: { flex: 1, fontSize: 13, color: '#1E293B', lineHeight: 18 },
  reportActions: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  reportReviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 14, paddingVertical: 12 },
  reportReviewBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB' },
  reportSendBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 12 },
  reportSendBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  attachWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  attachChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, maxWidth: '100%' },
  attachChipText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB', flexShrink: 1 },
  reportMeta: { fontSize: 11, color: '#94A3B8', marginTop: 12 },

  // Support chat entry bar
  supportChatBar: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#EFF6FF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#DBEAFE', marginTop: 6,
  },
  supportChatLeftIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  supportChatTextWrap: { flex: 1, gap: 2 },
  supportChatTitle: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  supportChatSubtitle: { fontSize: 12, color: '#3B82F6' },
  chatUnreadBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  chatUnreadText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },

  // Notes / escalations list
  notesHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 12, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  notesHeadText: { fontSize: 12, color: '#B45309', fontFamily: typography.labelMedium.fontFamily },
  noteItem: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', paddingVertical: 12 },
  noteAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  noteAvatarText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#B45309' },
  noteText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  noteMeta: { fontSize: 11, color: '#94A3B8', marginTop: 4 },
  emptyBlock: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  emptyBlockText: { fontSize: 13, color: '#94A3B8' },

  composerRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  composerInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1E293B', maxHeight: 100, minHeight: 44 },
  composerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },

  escalateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: 13, marginTop: 14 },
  escalateBtnText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#DC2626' },

  // Timeline
  tlRow: { flexDirection: 'row', gap: 12 },
  tlLeft: { alignItems: 'center', width: 16 },
  tlDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
  tlLine: { flex: 1, width: 2, backgroundColor: '#E2E8F0', marginVertical: 2 },
  tlHead: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tlFrom: { fontSize: 11, color: '#94A3B8' },
  tlMeta: { fontSize: 12, color: '#64748B', marginTop: 5 },
  tlNote: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 2 },

  // Escalate modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 18 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1E293B', marginTop: 14, minHeight: 80, textAlignVertical: 'top' },
  modalErrorText: { fontSize: 12, color: '#DC2626', marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  modalBtnGhost: { backgroundColor: '#F1F5F9' },
  modalBtnGhostText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#475569' },
  modalBtnDanger: { backgroundColor: '#DC2626' },
  modalBtnDangerText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  modalBtnPrimary: { backgroundColor: '#2563EB' },
});

export default TicketDetail;
