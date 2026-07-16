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
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle} numberOfLines={2}>{viewingReport.service || viewingReport.title}</Text>
                    {!!(viewingReport.vendor || viewingReport.date) && (
                      <Text style={styles.modalSubtitle}>
                        {[viewingReport.vendor, formatReportDate(viewingReport.date)].filter(Boolean).join(' · ')}
                      </Text>
                    )}
                  </View>
                  {!!viewingReport.status && (
                    <View style={[styles.reportStatus, { backgroundColor: viewingReport.status === 'New' ? colors.primary + '1A' : colors.surfaceSecondary }]}>
                      <Text style={[styles.reportStatusText, { color: viewingReport.status === 'New' ? colors.primary : colors.textSecondary }]}>{viewingReport.status}</Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => setViewingReport(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.modalCloseBtn}>
                    <Icon name="close" size={20} color={colors.textSecondary} />
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
                          <Icon name="picture-as-pdf" size={20} color={colors.accent} />
                          <Text style={styles.attachmentItemText} numberOfLines={1}>
                            {viewingReport.media.length > 1 ? `Attachment ${idx + 1}` : 'Attachment'}
                          </Text>
                          <TouchableOpacity style={styles.attachmentActionBtn} onPress={() => handleViewAttachment(m.url)}>
                            <Icon name="visibility" size={18} color={colors.primary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.attachmentActionBtn}
                            onPress={() => handleDownload(viewingReport, m, idx)}
                            disabled={isDownloading}
                          >
                            {isDownloading ? (
                              <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                              <Icon name="file-download" size={18} color={colors.primary} />
                            )}
                          </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 8 },
  pageTitle: { ...typography.h3, color: colors.textPrimary },
  countText: { ...typography.labelMedium, color: colors.textSecondary, marginTop: 4 },
  summaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10 },
  summaryBtnText: { ...typography.labelLarge, color: colors.onAccent },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { ...typography.labelMedium, color: colors.error },
  emptyCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  emptyIconBox: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.surfaceMuted, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emptyTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 8 },
  emptyText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  reportCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  reportTitle: { ...typography.h4, color: colors.textPrimary },
  reportVendor: { ...typography.labelMedium, color: colors.textSecondary, marginTop: 4 },
  reportStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  reportStatusText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily },
  reportFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: colors.surfaceSecondary, paddingTop: 16 },
  reportDate: { ...typography.labelMedium, color: colors.textSecondary, flex: 1 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtnText: { ...typography.labelLarge, color: colors.primary },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 12 },
  pagerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { ...typography.labelLarge, color: colors.textPrimary },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%', paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  modalTitle: { ...typography.h4, color: colors.textPrimary },
  modalSubtitle: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  modalCloseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center' },
  modalReportText: { ...typography.body, color: colors.textPrimary, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surfaceSecondary },
  modalAttachmentsList: { marginTop: 16, gap: 10 },
  modalAttachmentsLabel: { ...typography.labelMedium, color: colors.textSecondary },
  modalEmptyText: { ...typography.body, color: colors.textPlaceholder, marginTop: 16 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  attachmentItemText: { flex: 1, ...typography.body, color: colors.textPrimary },
  attachmentActionBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
});

export default ReportsMedia;
