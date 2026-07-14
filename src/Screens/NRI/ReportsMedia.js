import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useReports } from '../../Hooks/useReports';

function ReportsMedia({ navigation }) {
  const { reports, meta, loading, failed, retry, fetchPage } = useReports();
  const mediaCount = reports.reduce((sum, r) => sum + (r.mediaCount || 0), 0);

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

  const getTypeColor = (type) => {
    switch (type) {
      case 'Health': return colors.success;
      case 'Property': return colors.warning;
      case 'Lab': return '#8B5CF6';
      case 'Maintenance': return colors.primary;
      default: return colors.textSecondary;
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
            <TouchableOpacity key={r.id} style={styles.reportCard} activeOpacity={0.7}>
              <View style={styles.reportHeader}>
                <View style={[styles.reportTypeIcon, { backgroundColor: getTypeColor(r.type) + '20' }]}>
                  <Icon name={r.type === 'Health' ? 'favorite' : r.type === 'Property' ? 'location-city' : r.type === 'Lab' ? 'science' : 'build'} size={18} color={getTypeColor(r.type)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportTitle} numberOfLines={1}>{r.title}</Text>
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
                <Text style={styles.reportDate}>{r.date}</Text>
                <TouchableOpacity style={styles.viewBtn}>
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
  reportTypeIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
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
});

export default ReportsMedia;
