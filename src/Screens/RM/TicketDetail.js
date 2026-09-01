import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, TextInput, KeyboardAvoidingView, Platform, Modal, ActivityIndicator, Linking, Alert, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useDispatch, useSelector } from 'react-redux';
import { typography } from '../../theme/typography';
import { useToast } from '../../context/ToastContext';
import { useRmRequestDetail } from '../../Hooks/RM/useRmRequestDetail';
import { reviewRmReport, sendRmReport } from '../../Redux/slices/rmReportsSlice';
import { openRemoteFile } from '../../Utils/fileDownload';

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
  const { showToast } = useToast();
  const token = useSelector(s => s.user.token);
  const [previewUri, setPreviewUri] = useState(null);

  // Attachments live behind authenticated storage — opening the raw URL in the
  // browser drops the token and shows a blank page. Images preview in-app (the
  // Image source carries the Bearer token); other files download with the token.
  const isImageUrl = (u) => /\.(png|jpe?g|webp|gif|heic|bmp)(\?|$)/i.test(String(u || ''));
  const openAttachment = async (a) => {
    if (!a?.url) return;
    if (isImageUrl(a.url)) {
      setPreviewUri(a.url);
      return;
    }
    try {
      showToast('Opening attachment…', 'success');
      await openRemoteFile({ url: a.url, filename: a.name || 'attachment', token });
    } catch (e) {
      showToast(e?.message || 'Could not open the attachment', 'error');
    }
  };

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
        showToast('Report marked as reviewed', 'success');
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
        showToast('Report sent to customer', 'success');
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
    // { icon: 'event-note', label: 'Created', value: fmt(detail.createdAt) },
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
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{detail?.ticket || 'Request Details'}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && !detail ? (
        <View style={styles.centerFill}><ActivityIndicator size="large" color="#20304C" /></View>
      ) : failed && !detail ? (
        <View style={styles.centerFill}>
          <Icon name="error-outline" size={44} color="#CBD5E1" />
          <Text style={styles.errorText}>{error?.status === 403 ? 'This request is assigned to another RM.' : (error?.message || 'Could not load this request.')}</Text>
          {error?.status !== 403 && (
            <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

          <KeyboardAwareScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            enableOnAndroid={false}
            extraScrollHeight={80}
            extraHeight={80}
          >

            {/* ---------- OVERVIEW ---------- */}
            {tab === 'overview' && (
              <>
                {/* Hero summary */}
                <View style={styles.hero}>
                  <View style={styles.heroGlow} />
                  <View style={styles.heroTopRow}>
                    <View style={[styles.heroStatusChip, { backgroundColor: cur.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: cur.text }]} />
                      <Text style={[styles.heroStatusText, { color: cur.text }]}>{statusText(detail?.status)}</Text>
                    </View>
                    {!!sla && (
                      <View style={[styles.heroSlaChip, { backgroundColor: sla.bg }]}>
                        <Icon name="schedule" size={12} color={sla.color} />
                        <Text style={[styles.heroSlaText, { color: sla.color }]}>{sla.label}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.heroService}>{detail?.service}</Text>

                  <View style={styles.heroFootRow}>
                    <View style={styles.heroPriority}>
                      <Icon name="flag" size={12} color="#FBBF24" />
                      <Text style={styles.heroPriorityText}>{detail?.priorityLabel || 'Standard'}</Text>
                    </View>
                    {!!detail?.ticket && (
                      <View style={styles.heroTicketWrap}>
                        <Icon name="confirmation-number" size={12} color="#94A3B8" />
                        <Text style={styles.heroTicketText}>{detail.ticket}</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Request details */}
                <CardTitle icon="description" title="Request Details" />
                <View style={styles.card}>
                  <View style={styles.detailList}>
                    {detailRows.map((d, i) => (
                      <View key={d.label} style={[styles.detailRow, i < detailRows.length - 1 && styles.detailRowBorder]}>
                        <View style={styles.infoIconBg}><Icon name={d.icon} size={16} color="#2563EB" /></View>
                        <View style={styles.detailRowText}>
                          <Text style={styles.detailRowLabel}>{d.label}</Text>
                          <Text style={styles.detailRowValue}>{d.value}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

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
                          <View style={styles.vendorHeader}>
                            <View style={styles.vendorAvatar}>
                              <Text style={styles.vendorAvatarText}>{(detail.vendor.name || 'V').charAt(0).toUpperCase()}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.vendorName} numberOfLines={1}>{detail.vendor.name || 'Vendor'}</Text>
                              {(!!detail.vendor.type || !!detail.vendor.ratingLabel) && (
                                <View style={styles.vendorSubRow}>
                                  {!!detail.vendor.type && (
                                    <View style={[styles.pill, { backgroundColor: '#EEF2FF' }]}>
                                      <Text style={[styles.pillText, { color: '#6366F1' }]}>{detail.vendor.type}</Text>
                                    </View>
                                  )}
                                  {!!detail.vendor.ratingLabel && <Text style={styles.vendorRatingLabel}>{detail.vendor.ratingLabel}</Text>}
                                </View>
                              )}
                            </View>
                            {detail.vendor.rating != null && (
                              <View style={styles.ratingBadge}>
                                <Icon name="star" size={13} color="#F5B301" />
                                <Text style={styles.ratingBadgeText}>{detail.vendor.rating.toFixed(1)}</Text>
                              </View>
                            )}
                          </View>

                          {(!!detail.vendor.phone || !!detail.vendor.email) && (
                            <View style={styles.contactRow}>
                              {!!detail.vendor.phone && (
                                <TouchableOpacity style={styles.contactChip} activeOpacity={0.8} onPress={() => Linking.openURL(`tel:${detail.vendor.phone}`)}>
                                  <Icon name="phone" size={14} color="#2563EB" />
                                  <Text style={styles.contactChipText} numberOfLines={1}>{detail.vendor.phone}</Text>
                                </TouchableOpacity>
                              )}
                              {!!detail.vendor.email && (
                                <TouchableOpacity style={styles.contactChip} activeOpacity={0.8} onPress={() => Linking.openURL(`mailto:${detail.vendor.email}`)}>
                                  <Icon name="email" size={14} color="#2563EB" />
                                  <Text style={styles.contactChipText} numberOfLines={1}>{detail.vendor.email}</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          )}

                          {!!detail.vendor.contact && <Text style={styles.vendorMeta}>Contact person: {detail.vendor.contact}</Text>}

                          {!!detail.vendor.assignedAt && (
                            <View style={styles.vendorAssignedRow}>
                              <Icon name="schedule" size={12} color="#94A3B8" />
                              <Text style={styles.vendorAssigned}>Assigned {fmt(detail.vendor.assignedAt)} · {ago(detail.vendor.assignedAt)}</Text>
                            </View>
                          )}
                        </View>
                      )}

                      <View style={[styles.assignPeopleRow, !!detail?.vendor && styles.assignMetaRowSpaced]}>
                        <View style={styles.personTile}>
                          <View style={styles.personIcon}><Icon name="badge" size={16} color="#2563EB" /></View>
                          <Text style={styles.infoLabel}>Relationship Mgr</Text>
                          <Text style={styles.assignValue} numberOfLines={1}>{detail?.rmName || '—'}</Text>
                        </View>
                        <View style={styles.personTile}>
                          <View style={styles.personIcon}><Icon name="headset-mic" size={16} color="#2563EB" /></View>
                          <Text style={styles.infoLabel}>Telecaller</Text>
                          <Text style={styles.assignValue} numberOfLines={1}>{detail?.telecaller || '—'}</Text>
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
                        <View style={styles.reportHeadLeft}>
                          <View style={styles.reportHeadIcon}><Icon name="assignment-turned-in" size={16} color="#20304C" /></View>
                          <Text style={styles.reportHeadTitle}>Field Report</Text>
                        </View>
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

                      <View style={styles.reportBody}>
                        <View style={styles.reportQuoteBar} />
                        <Text style={styles.reportText}>{report.text || '—'}</Text>
                      </View>

                      {report.attachments?.length > 0 && (
                        <>
                          <Text style={styles.attachLabel}>{report.attachments.length} Attachment{report.attachments.length > 1 ? 's' : ''}</Text>
                          <View style={styles.attachWrap}>
                            {report.attachments.map((a) => (
                              <TouchableOpacity
                                key={a.id}
                                style={styles.attachChip}
                                activeOpacity={0.8}
                                disabled={!a.url}
                                onPress={() => openAttachment(a)}
                              >
                                <Icon name="attach-file" size={15} color="#2563EB" />
                                <Text style={styles.attachChipText} numberOfLines={1}>{a.name}</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}

                      {!!report.reviewComment && (
                        <View style={styles.reviewNote}>
                          <Icon name="rate-review" size={14} color="#2563EB" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reviewNoteLabel}>Review Comment</Text>
                            <Text style={styles.reviewNoteText}>{report.reviewComment}</Text>
                          </View>
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

                {/* Support chat action */}
                <TouchableOpacity
                  style={styles.supportChatBar}
                  activeOpacity={0.9}
                  onPress={() => navigation.navigate('RMSupportChat', { ticketId, ticketNumber: detail?.ticket })}
                >
                  <View style={styles.supportChatGlow} pointerEvents="none" />
                  <View style={styles.supportChatLeftIcon}>
                    <Icon name="forum" size={22} color="#FFFFFF" />
                  </View>
                  <View style={styles.supportChatTextWrap}>
                    <Text style={styles.supportChatTitle}>Support Chat</Text>
                    <Text style={styles.supportChatSubtitle} numberOfLines={1}>Chat with the customer about this request</Text>
                  </View>
                  {detail?.supportChat?.unreadCount > 0 && (
                    <View style={styles.chatUnreadBadge}>
                      <Text style={styles.chatUnreadText}>{detail.supportChat.unreadCount > 9 ? '9+' : detail.supportChat.unreadCount}</Text>
                    </View>
                  )}
                  <View style={styles.supportChatArrow}>
                    <Icon name="arrow-forward" size={18} color="#2563EB" />
                  </View>
                </TouchableOpacity>
              </>
            )}

            {/* ---------- ACTIVITY ---------- */}
            {tab === 'activity' && (
              <>
                <CardTitle icon="history" title="Status History" />
                <View style={styles.card}>
                  {detail?.statusHistory?.length > 0 ? (
                    <View style={styles.timelineWrapper}>
                      {detail.statusHistory.map((h, i) => {
                        const hs = statusStyle(h.status);
                        return (
                          <View key={h.id} style={styles.timelineRow}>
                            <View style={styles.timelineDotCol}>
                              <View style={[styles.timelineDotRing, i === 0 && styles.timelineDotRingActive]} />
                              <View style={styles.timelineLine} />
                            </View>
                            <View style={styles.timelineCard}>
                              <View style={styles.timelineCardTop}>
                                <Text style={[styles.timelineStatus, { color: hs.text }]}>{statusText(h.status).toUpperCase()}</Text>
                                <Text style={styles.timelineTime}>{fmt(h.at)}</Text>
                              </View>
                              {!!h.from && <Text style={styles.timelineFrom}>Changed from {statusText(h.from)}</Text>}
                              {!!h.note && <Text style={styles.timelineSub}>{h.note}</Text>}
                              {!!h.by && <Text style={styles.timelineBy}>by {h.by}</Text>}
                            </View>
                          </View>
                        );
                      })}
                      <View style={styles.timelineRow}>
                        <View style={styles.timelineDotCol}>
                          <View style={styles.timelineDotMuted} />
                        </View>
                        <Text style={styles.timelinePlaceholder}>Further updates will appear here…</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.emptyBlock}>
                      <Icon name="history" size={30} color="#CBD5E1" />
                      <Text style={styles.emptyBlockText}>No status updates yet.</Text>
                    </View>
                  )}
                </View>

                {/* Internal Notes */}
                <CardTitle icon="sticky-note-2" title="Internal Notes" />
                <View style={styles.card}>
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
                      style={[styles.composerInputScroll, styles.composerInput]}
                      placeholder="Add an internal note..."
                      placeholderTextColor="#94A3B8"
                      value={noteText}
                      onChangeText={setNoteText}
                      multiline
                      scrollEnabled
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

              

                {/* <CardTitle icon="report-problem" title="Escalations" />
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
                </View> */}
              </>
            )}

          </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Attachment image preview */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <TouchableOpacity style={styles.previewOverlay} activeOpacity={1} onPress={() => setPreviewUri(null)}>
          <TouchableOpacity style={styles.previewClose} onPress={() => setPreviewUri(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          {!!previewUri && (
            <Image
              source={{ uri: previewUri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
        </TouchableOpacity>
      </Modal>

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
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { marginLeft: 6 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
  headerSpacer: { width: 44 },

  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  retryBtn: { backgroundColor: '#20304C', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },

  // Hero summary
  hero: {
    backgroundColor: '#20304C', borderRadius: 20, padding: 18, marginTop: 6, overflow: 'hidden',
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6,
  },
  heroGlow: { position: 'absolute', top: -60, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(217,70,37,0.18)' },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroStatusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  heroStatusText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  heroSlaChip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  heroSlaText: { fontSize: 11, fontWeight: '800' },
  heroService: { fontSize: 19, fontFamily: typography.h4.fontFamily, color: '#FFFFFF', lineHeight: 26, marginTop: 14 },
  heroFootRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' },
  heroPriority: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  heroPriorityText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  heroTicketWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroTicketText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#CBD5E1', letterSpacing: 0.3 },

  // Request details list
  detailList: {},
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  detailRowText: { flex: 1 },
  detailRowLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 },
  detailRowValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 3, lineHeight: 19 },
  customerNote: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 14, backgroundColor: '#F0F9FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#E0F2FE' },
  customerNoteLabel: { fontSize: 11, color: '#0369A1', fontWeight: '700', marginBottom: 2 },
  customerNoteText: { fontSize: 13, color: '#0C4A6E', lineHeight: 18 },

  // Tabs
  tabBar: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 14, backgroundColor: '#FDFBF7' },
  tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  tabBtnActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
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
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIconBg: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 11, color: '#94A3B8', marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  infoValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 3, lineHeight: 19 },

  vendorBox: { backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EEF2F6' },
  vendorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  vendorAvatar: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center' },
  vendorAvatarText: { fontSize: 18, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
  vendorName: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  vendorSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  vendorRatingLabel: { fontSize: 12, color: '#64748B' },
  vendorMeta: { fontSize: 13, color: '#64748B', marginTop: 10 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF9E7', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1, borderColor: '#FCE9B6' },
  ratingBadgeText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#B45309' },
  contactRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  contactChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, maxWidth: '100%' },
  contactChipText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB', flexShrink: 1 },
  vendorAssignedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEF2F6' },
  vendorAssigned: { fontSize: 11, color: '#94A3B8' },
  assignPeopleRow: { flexDirection: 'row', gap: 12 },
  assignMetaRowSpaced: { marginTop: 14 },
  personTile: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  personIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  assignValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginTop: 3 },

  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  priceLabel: { fontSize: 14, color: '#475569' },
  priceValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#E2E8F0', marginTop: 4, paddingTop: 12 },
  totalLabel: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  totalValue: { fontSize: 17, fontFamily: typography.h4.fontFamily, color: '#059669' },
  vendorCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9' },

  reportHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reportHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportHeadIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EEF2F6', justifyContent: 'center', alignItems: 'center' },
  reportHeadTitle: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  sentPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#D1FAE5', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  sentPillText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#059669' },
  reportBody: { flexDirection: 'row', gap: 12 },
  reportQuoteBar: { width: 3, borderRadius: 2, backgroundColor: '#D94625', alignSelf: 'stretch' },
  reportText: { flex: 1, fontSize: 14, color: '#334155', lineHeight: 21 },
  attachLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 16 },
  reviewNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 14, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#DBEAFE' },
  reviewNoteLabel: { fontSize: 11, color: '#2563EB', fontFamily: typography.labelMedium.fontFamily, marginBottom: 3 },
  reviewNoteText: { fontSize: 13, color: '#1E293B', lineHeight: 18 },
  reportActions: { flexDirection: 'row', gap: 10, marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  reportReviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 14, paddingVertical: 12 },
  reportReviewBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB' },
  reportSendBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 12 },
  reportSendBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  attachWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  attachChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, maxWidth: '100%' },
  attachChipText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB', flexShrink: 1 },
  reportMeta: { fontSize: 11, color: '#94A3B8', marginTop: 12 },

  // Support chat entry bar (matches the NRI support-chat card)
  supportChatBar: {
    flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden',
    backgroundColor: '#EFF6FF', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, marginTop: 20,
    borderWidth: 1, borderColor: '#DBEAFE',
    shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 14, elevation: 4,
  },
  supportChatGlow: { position: 'absolute', top: -40, right: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(59,130,246,0.06)' },
  supportChatLeftIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
  supportChatTextWrap: { flex: 1, gap: 3 },
  supportChatTitle: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  supportChatSubtitle: { fontSize: 12, color: '#3B82F6' },
  chatUnreadBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  chatUnreadText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  supportChatArrow: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center' },

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
  composerInputScroll: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, maxHeight: 100, minHeight: 44 },
  composerInput: { paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1E293B', minHeight: 44 },
  composerBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center' },
  btnDisabled: { opacity: 0.5 },

  escalateBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', borderRadius: 14, paddingVertical: 13, marginTop: 14 },
  escalateBtnText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#DC2626' },

  // Timeline (matches NRI request timeline)
  timelineWrapper: { marginTop: 4 },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineDotCol: { alignItems: 'center', width: 18 },
  timelineDotRing: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', marginTop: 4 },
  timelineDotRingActive: { borderColor: '#D94625' },
  timelineDotMuted: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', marginTop: 2 },
  timelineLine: { flex: 1, width: 0, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', marginVertical: 2, minHeight: 16 },
  timelineCard: { flex: 1, backgroundColor: '#EFF4FF', borderRadius: 12, padding: 14, marginBottom: 16 },
  timelineCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  timelineStatus: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  timelineTime: { fontSize: 11, color: '#64748B' },
  timelineFrom: { fontSize: 12, color: '#64748B', marginTop: 6 },
  timelineSub: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginTop: 4, lineHeight: 18 },
  timelineBy: { fontSize: 11, color: '#94A3B8', marginTop: 6 },
  timelinePlaceholder: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic', flex: 1, marginTop: 2 },

  // Attachment image preview
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', top: 48, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  previewImage: { width: '92%', height: '80%' },

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
