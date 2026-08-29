import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, KeyboardAvoidingView, StatusBar, TextInput, Modal, ActivityIndicator, RefreshControl, Image, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useToast } from '../../context/ToastContext';
import { useRmReports } from '../../Hooks/RM/useRmReports';
import { openRemoteFile } from '../../Utils/fileDownload';

const FILTERS = [
  { key: 'pending', label: 'Pending' },
  { key: 'reviewed', label: 'Reviewed' },
  { key: 'all', label: 'All' },
];

function statusPill(label) {
  switch ((label || '').toLowerCase()) {
    case 'sent': return { bg: '#D1FAE5', text: '#059669' };
    case 'reviewed': return { bg: '#DBEAFE', text: '#2563EB' };
    default: return { bg: '#FEF3E7', text: '#C2410C' };
  }
}

function fmt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function Reports({ navigation }) {
  const [filter, setFilter] = useState('pending');
  // "Pending" = not yet sent to the customer (sent_to_customer_at is null →
  // mapReport sets sent = false), whether or not it's been reviewed. We fetch
  // the full list and keep the not-sent ones so a report stays here through
  // review and only leaves once it's actually sent — from this screen or from
  // TicketDetail (both dispatch the same rmReports thunks / share the store).
  const apiFilter = filter === 'pending' ? 'all' : filter;
  const { reports: fetchedReports, loading, review, reviewingId, send, sendingId, refresh } = useRmReports(apiFilter);
  // Treat a report as sent if ANY sent signal is present (sent flag, the
  // sent_to_customer_at timestamp, or the "Sent" label) — so a sent report can
  // never linger under Pending.
  const isSent = (r) => r.sent === true || !!r.sentAt || (r.statusLabel || '').toLowerCase() === 'sent';
  const reports = filter === 'pending' ? fetchedReports.filter(r => !isSent(r)) : fetchedReports;
  const { showAlert, alertProps } = useAppAlert();
  const { showToast } = useToast();
  const token = useSelector(s => s.user.token);
  const [previewUri, setPreviewUri] = useState(null);

  // Raw storage URLs open blank in the browser (token isn't sent). Images
  // preview in-app with the Bearer token; other files download with the token.
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

  const [reviewFor, setReviewFor] = useState(null); // the report being reviewed
  const [comment, setComment] = useState('');

  // Auto-refresh the list every time the screen comes into focus so it stays in
  // sync after reviewing/sending (or actions taken elsewhere).
  useFocusEffect(useCallback(() => { refresh(); }, [filter]));

  const openReview = (report) => {
    setReviewFor(report);
    setComment(report.reviewComment || '');
  };

  const submitReview = () => {
    if (!reviewFor || reviewingId) return;
    review(reviewFor.id, comment.trim()).unwrap?.().then(() => {
      setReviewFor(null);
      setComment('');
      // Don't refetch here — the slice flips the report to "reviewed" in place,
      // so it stays on screen (a pending-list refetch would drop it). Same
      // behavior as the vendor report in TicketDetail.
      showToast('Report marked as reviewed', 'success');
    }).catch((e) => {
      showAlert('Could Not Review', e?.status === 403 ? "This report belongs to another RM's ticket." : (e?.message || 'Please try again.'));
    });
  };

  const handleSend = (report) => {
    if (sendingId) return;
    send(report.id).unwrap?.().then(() => {
      // Once sent, it leaves this screen — refetch so the dispatched report
      // drops out of the pending list. (Reviewing keeps it; only sending removes it.)
      showToast('Report sent to customer', 'success');
      refresh();
    }).catch((e) => {
      showAlert('Could Not Send', e?.status === 422 ? 'Review the report before sending it.' : (e?.message || 'Please try again.'));
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.backIcon} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Vendor Reports</Text>
          <Text style={styles.headerSub}>Review & dispatch to customers</Text>
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {FILTERS.map(f => {
            const active = filter === f.key;
            return (
              <TouchableOpacity key={f.key} style={[styles.tab, active && styles.tabActive]} onPress={() => setFilter(f.key)} activeOpacity={0.7}>
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{f.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading && reports.length > 0} onRefresh={refresh} colors={['#20304C']} tintColor="#20304C" />}
      >
        {loading && reports.length === 0 ? (
          <View style={styles.emptyState}><ActivityIndicator size="large" color="#20304C" /></View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="fact-check" size={44} color="#CBD5E1" />
            <Text style={styles.emptyText}>No {filter === 'all' ? '' : filter} reports to show.</Text>
          </View>
        ) : (
          reports.map(r => {
            const pill = statusPill(r.statusLabel);
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticket}>{r.ticketNumber || 'Request'}</Text>
                    <Text style={styles.service} numberOfLines={2}>{r.service}</Text>
                  </View>
                  <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.pillText, { color: pill.text }]}>{r.statusLabel}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  {!!r.customer && (
                    <View style={styles.metaItem}><Icon name="person" size={13} color="#94A3B8" /><Text style={styles.metaText}>{r.customer}</Text></View>
                  )}
                  {!!r.vendor && (
                    <View style={styles.metaItem}><Icon name="store" size={13} color="#94A3B8" /><Text style={styles.metaText}>{r.vendor}</Text></View>
                  )}
                </View>

                {!!r.text && <Text style={styles.reportText} numberOfLines={4}>{r.text}</Text>}

                {r.attachments?.length > 0 && (
                  <View style={styles.attachWrap}>
                    {r.attachments.map(a => (
                      <TouchableOpacity key={a.id} style={styles.attachChip} disabled={!a.url} onPress={() => openAttachment(a)} activeOpacity={0.8}>
                        <Icon name="attach-file" size={14} color="#2563EB" />
                        <Text style={styles.attachChipText} numberOfLines={1}>{a.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {!!r.reviewComment && (
                  <View style={styles.reviewNote}>
                    <Icon name="rate-review" size={14} color="#2563EB" />
                    <Text style={styles.reviewNoteText}>{r.reviewComment}</Text>
                  </View>
                )}

                {!!r.submittedAt && <Text style={styles.submittedMeta}>Submitted {fmt(r.submittedAt)}</Text>}

                {/* Actions */}
                {!r.sent && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      style={[styles.reviewBtn, reviewingId === r.id && styles.btnDisabled]}
                      onPress={() => openReview(r)}
                      disabled={reviewingId === r.id}
                      activeOpacity={0.85}
                    >
                      <Icon name={r.reviewed ? 'edit' : 'check-circle-outline'} size={16} color="#2563EB" />
                      <Text style={styles.reviewBtnText}>{r.reviewed ? 'Edit Review' : 'Review'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.sendBtn, (!r.reviewed || sendingId === r.id) && styles.btnDisabled]}
                      onPress={() => handleSend(r)}
                      disabled={!r.reviewed || sendingId === r.id}
                      activeOpacity={0.85}
                    >
                      {sendingId === r.id ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                        <>
                          <Icon name="send" size={15} color="#FFFFFF" />
                          <Text style={styles.sendBtnText}>Send to Customer</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
                {r.sent && (
                  <View style={styles.sentRow}>
                    <Icon name="check-circle" size={15} color="#059669" />
                    <Text style={styles.sentRowText}>Sent to customer{r.sentAt ? ` · ${fmt(r.sentAt)}` : ''}</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

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

      {/* Review modal */}
      <Modal visible={!!reviewFor} transparent animationType="fade" onRequestClose={() => setReviewFor(null)}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setReviewFor(null)}>
            <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Review Report</Text>
                <Text style={styles.modalSub}>Add an optional review comment, then mark this report reviewed.</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Review comment (optional)..."
                  placeholderTextColor="#94A3B8"
                  value={comment}
                  onChangeText={setComment}
                  multiline
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity style={[styles.modalBtn, styles.modalBtnGhost]} onPress={() => setReviewFor(null)} activeOpacity={0.8}>
                    <Text style={styles.modalBtnGhostText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalBtn, styles.modalBtnPrimary, reviewingId && styles.btnDisabled]}
                    onPress={submitReview}
                    disabled={!!reviewingId}
                    activeOpacity={0.85}
                  >
                    {reviewingId ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalBtnPrimaryText}>Mark Reviewed</Text>}
                  </TouchableOpacity>
                </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { marginLeft: 6 },
  headerTitle: { fontSize: 18, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
  headerSub: { fontSize: 12, color: '#94A3B8', marginTop: 1 },

  tabsContainer: { paddingTop: 16, paddingBottom: 8 },
  tabsScroll: { paddingHorizontal: 20, gap: 10 },
  tab: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  tabActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8, gap: 14 },
  emptyState: { paddingVertical: 70, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8', textTransform: 'capitalize' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  ticket: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#1E293B' },
  service: { fontSize: 13, color: '#475569', lineHeight: 18, marginTop: 3 },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  pillText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748B' },

  reportText: { fontSize: 13, color: '#334155', lineHeight: 19, marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12 },

  attachWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  attachChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, maxWidth: '100%' },
  attachChipText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB', flexShrink: 1 },

  reviewNote: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 12, backgroundColor: '#EFF6FF', borderRadius: 12, padding: 12 },
  reviewNoteText: { flex: 1, fontSize: 13, color: '#1E293B', lineHeight: 18 },

  submittedMeta: { fontSize: 11, color: '#94A3B8', marginTop: 12 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  reviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 14, paddingVertical: 12 },
  reviewBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB' },
  sendBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 12 },
  sendBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  btnDisabled: { opacity: 0.5 },

  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  sentRowText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#059669' },

  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  previewClose: { position: 'absolute', top: 48, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  previewImage: { width: '92%', height: '80%' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20 },
  modalTitle: { fontSize: 18, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  modalSub: { fontSize: 12, color: '#64748B', marginTop: 4, lineHeight: 18 },
  modalInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#1E293B', marginTop: 14, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  modalBtnGhost: { backgroundColor: '#F1F5F9' },
  modalBtnGhostText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#475569' },
  modalBtnPrimary: { backgroundColor: '#2563EB' },
  modalBtnPrimaryText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
});

export default Reports;
