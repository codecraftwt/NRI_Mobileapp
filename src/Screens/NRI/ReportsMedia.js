import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Linking } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useReports } from '../../Hooks/useReports';
import { downloadDocumentFile } from '../../Utils/fileDownload';

function formatReportDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ReportsMedia({ navigation }) {
  const { reports, meta, loading, failed, retry, fetchPage } = useReports();
  const mediaCount = reports.reduce((sum, r) => sum + (r.mediaCount || 0), 0);
  const token = useSelector(state => state.user.token);
  const { showAlert, alertProps } = useAppAlert();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  // `retry` is a new function reference every render (not memoized by the
  // hook) — keeping it out of these deps avoids an infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const [viewingReport, setViewingReport] = useState(null);
  const [downloadingKey, setDownloadingKey] = useState(null);

  const handleViewAttachment = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => showAlert('Could Not Open', 'This attachment could not be opened.'));
  };

  const handleDownload = async (report, media, idx) => {
    const key = `${report.id}-${idx}`;
    setDownloadingKey(key);
    try {
      await downloadDocumentFile({
        url: media.url,
        filename: `${report.service || report.title || 'Service Report'} - Attachment ${idx + 1}`,
        token,
      });
      showAlert('Download Complete', 'The attachment has been saved to your Downloads folder.');
    } catch (error) {
      showAlert('Download Failed', error?.message || 'Could not download this attachment.');
    } finally {
      setDownloadingKey(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Reports & Media" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Your Reports</Text>
            {reports.length > 0 && (
              <Text style={styles.countText}>{reports.length} report{reports.length !== 1 ? 's' : ''} available</Text>
            )}
          </View>
          <TouchableOpacity style={styles.summaryBtn} onPress={() => navigation.navigate('Annual Summary')}>
            <Icon name="event-note" size={16} color={colors.onAccent} />
            <Text style={styles.summaryBtnText}>Annual Summary</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading reports…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load reports. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {!loading && reports.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Icon name="folder-open" size={36} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No reports yet</Text>
            <Text style={styles.emptyText}>After each service visit, your detailed reports and photos will securely appear here.</Text>
          </View>
        ) : (
          reports.map(r => (
            <TouchableOpacity key={r.id} style={styles.reportCard} activeOpacity={0.7} onPress={() => setViewingReport(r)}>
              <View style={styles.reportHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle} numberOfLines={1}>{r.service || r.title}</Text>
                  {!!r.vendor && <Text style={styles.reportVendor}>{r.vendor}</Text>}
                </View>
                {!!r.status && (
                  <View style={[styles.reportStatus, { backgroundColor: r.status === 'New' ? colors.primary + '1A' : colors.surfaceSecondary }]}>
                    <Text style={[styles.reportStatusText, { color: r.status === 'New' ? colors.primary : colors.textSecondary }]}>{r.status}</Text>
                  </View>
                )}
              </View>
              <View style={styles.reportFooter}>
                <Icon name="calendar-today" size={14} color={colors.textSecondary} />
                <Text style={styles.reportDate}>{formatReportDate(r.date)}</Text>
                <TouchableOpacity style={styles.viewBtn} onPress={() => setViewingReport(r)}>
                  <Text style={styles.viewBtnText}>View Report</Text>
                  <Icon name="chevron-right" size={16} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))
        )}

        {meta.lastPage > 1 && (
          <View style={styles.pagerRow}>
            <TouchableOpacity
              style={[styles.pagerBtn, meta.currentPage <= 1 && styles.pagerBtnDisabled]}
              disabled={meta.currentPage <= 1}
              onPress={() => fetchPage(meta.currentPage - 1)}
            >
              <Icon name="chevron-left" size={18} color={meta.currentPage <= 1 ? colors.textPlaceholder : colors.primary} />
            </TouchableOpacity>
            <Text style={styles.pagerText}>Page {meta.currentPage} of {meta.lastPage}</Text>
            <TouchableOpacity
              style={[styles.pagerBtn, meta.currentPage >= meta.lastPage && styles.pagerBtnDisabled]}
              disabled={meta.currentPage >= meta.lastPage}
              onPress={() => fetchPage(meta.currentPage + 1)}
            >
              <Icon name="chevron-right" size={18} color={meta.currentPage >= meta.lastPage ? colors.textPlaceholder : colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <Modal visible={!!viewingReport} transparent animationType="fade" onRequestClose={() => setViewingReport(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setViewingReport(null)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalHandle} />
            {!!viewingReport && (
              <>
                <View style={styles.modalHeaderRow}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.modalTitle}>{viewingReport.service || viewingReport.title}</Text>
                    {!!(viewingReport.vendor || viewingReport.date) && (
                      <Text style={styles.modalSubtitle}>
                        {[viewingReport.vendor, formatReportDate(viewingReport.date)].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => setViewingReport(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.modalCloseBtn}>
                    <Icon name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                {!!viewingReport.title && <Text style={styles.modalReportText}>{viewingReport.title}</Text>}

                {viewingReport.media.length > 0 ? (
                  <View style={styles.modalAttachmentsList}>
                    <Text style={styles.modalAttachmentsLabel}>
                      Attachment{viewingReport.media.length !== 1 ? 's' : ''} ({viewingReport.media.length})
                    </Text>
                    {viewingReport.media.map((m, idx) => {
                      const key = `${viewingReport.id}-${idx}`;
                      const isDownloading = downloadingKey === key;
                      return (
                        <View key={key} style={styles.attachmentItem}>
                          <View style={styles.attachmentIconBox}>
                            <Icon name="picture-as-pdf" size={22} color="#A64416" />
                          </View>
                          <Text style={styles.attachmentItemText} numberOfLines={1}>
                            {viewingReport.media.length > 1 ? `Attachment ${idx + 1}` : 'Attachment'}
                          </Text>
                          <View style={styles.attachmentActions}>
                            <TouchableOpacity style={styles.attachmentActionBtn} onPress={() => handleViewAttachment(m.url)}>
                              <Icon name="visibility" size={18} color="#FFFFFF" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.attachmentActionBtn}
                              onPress={() => handleDownload(viewingReport, m, idx)}
                              disabled={isDownloading}
                            >
                              {isDownloading ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                              ) : (
                                <Icon name="file-download" size={18} color="#FFFFFF" />
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.modalEmptyText}>No attachments were shared with this report.</Text>
                )}
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A' },
  countText: { fontSize: 13, fontWeight: '600', color: '#64748B', marginTop: 4 },
  summaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#A64416', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  summaryBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 14, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 13, color: '#EF4444' },
  emptyCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: '#E0E7FF', 
    paddingVertical: 48, 
    paddingHorizontal: 24, 
    alignItems: 'center', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 24, 
    elevation: 4 
  },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  reportCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    borderWidth: 1, 
    borderColor: '#E0E7FF', 
    padding: 24, 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 24, 
    elevation: 4 
  },
  reportHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 20 },
  reportTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  reportVendor: { fontSize: 13, fontWeight: '600', color: '#475569' },
  reportStatus: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  reportStatusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  reportFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16 },
  reportDate: { fontSize: 13, fontWeight: '600', color: '#64748B', flex: 1 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtnText: { fontSize: 14, fontWeight: '700', color: '#1E3A8A' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pagerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '85%', paddingHorizontal: 24, paddingBottom: 48, paddingTop: 16 },
  modalHandle: { width: 48, height: 6, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 24 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#0F172A', marginBottom: 8, lineHeight: 28 },
  modalSubtitle: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  modalReportText: { fontSize: 15, color: '#475569', marginTop: 8, paddingBottom: 24, borderBottomWidth: 1, borderBottomColor: '#E2E8F0', lineHeight: 24 },
  modalAttachmentsList: { marginTop: 24, gap: 16 },
  modalAttachmentsLabel: { fontSize: 13, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  modalEmptyText: { fontSize: 14, color: '#94A3B8', marginTop: 24, fontStyle: 'italic', textAlign: 'center' },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, padding: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  attachmentIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center' },
  attachmentItemText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B' },
  attachmentActions: { flexDirection: 'row', gap: 8 },
  attachmentActionBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center', shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
});

export default ReportsMedia;
