import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
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
      case 'Health': return '#10B981';
      case 'Property': return '#F59E0B';
      case 'Lab': return '#8B5CF6';
      case 'Maintenance': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Reports & Media" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
        <View style={styles.topRow}>
          <Text style={styles.countText}>{reports.length} report(s) · {mediaCount} media file(s) on this page</Text>
          <TouchableOpacity style={styles.summaryBtn} onPress={() => navigation.navigate('Annual Summary')}>
            <Icon name="event-note" size={16} color="#007AFF" />
            <Text style={styles.summaryBtnText}>Annual Summary</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
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
            <Icon name="image" size={40} color="#C4C9D2" />
            <Text style={styles.emptyText}>No reports shared with you yet. After each service visit, your report and photos will appear here.</Text>
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
                  <View style={[styles.reportStatus, { backgroundColor: r.status === 'New' ? '#E5F1FF' : '#F3F4F6' }]}>
                    <Text style={[styles.reportStatusText, { color: r.status === 'New' ? '#007AFF' : '#666' }]}>{r.status}</Text>
                  </View>
                )}
              </View>
              <View style={styles.reportFooter}>
                <Icon name="calendar-today" size={12} color="#999" />
                <Text style={styles.reportDate}>{r.date}</Text>
                <TouchableOpacity style={styles.viewBtn}>
                  <Text style={styles.viewBtnText}>View Report</Text>
                  <Icon name="chevron-right" size={14} color="#007AFF" />
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
              <Icon name="chevron-left" size={18} color={meta.currentPage <= 1 ? '#C4C9D2' : '#007AFF'} />
            </TouchableOpacity>
            <Text style={styles.pagerText}>Page {meta.currentPage} of {meta.lastPage}</Text>
            <TouchableOpacity
              style={[styles.pagerBtn, meta.currentPage >= meta.lastPage && styles.pagerBtnDisabled]}
              disabled={meta.currentPage >= meta.lastPage}
              onPress={() => fetchPage(meta.currentPage + 1)}
            >
              <Icon name="chevron-right" size={18} color={meta.currentPage >= meta.lastPage ? '#C4C9D2' : '#007AFF'} />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  countText: { fontSize: 12, color: '#6B7280', flex: 1 },
  summaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  summaryBtnText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  emptyCard: { backgroundColor: 'white', borderRadius: 14, paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  emptyText: { fontSize: 13, color: '#6B7280', textAlign: 'center', lineHeight: 19 },
  reportCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  reportTypeIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  reportTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  reportVendor: { fontSize: 11, color: '#666', marginTop: 2 },
  reportStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  reportStatusText: { fontSize: 10, fontWeight: 'bold' },
  reportFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reportDate: { fontSize: 11, color: '#999', flex: 1 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewBtnText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 8 },
  pagerBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { fontSize: 12.5, color: '#374151', fontWeight: '600' },
});

export default ReportsMedia;
