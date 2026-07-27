import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useVendorJobs } from '../../Hooks/useVendorJobs';

const TABS = [
  { key: 'all', label: 'All', query: undefined },
  { key: 'assigned', label: 'Assigned', query: 'assigned' },
  { key: 'in_progress', label: 'In Progress', query: 'in_progress' },
  { key: 'completed', label: 'Completed', query: 'completed' },
];

function getStatusPill(status) {
  switch (status) {
    case 'Completed': return { bg: '#D1FAE5', text: '#059669', label: 'Completed' };
    case 'In Progress': return { bg: '#FFEDD5', text: '#C2410C', label: 'In Progress' };
    case 'New': return { bg: '#DBEAFE', text: '#1D4ED8', label: 'New' };
    case 'Assigned': return { bg: '#FEF9C3', text: '#CA8A04', label: 'Assigned' };
    default: return { bg: '#F3F4F6', text: '#4B5563', label: status || 'New' };
  }
}

function MyJobs({ navigation }) {
  const [activeTab, setActiveTab] = useState('all');
  const { jobs, counts, meta, loading, failed, error, fetch, retry } = useVendorJobs({ page: 1 });

  const currentPage = meta.currentPage;
  const totalPages = meta.lastPage || 1;

  const getTabCount = (tabKey) => {
    if (tabKey === 'all') return (counts.assigned || 0) + (counts.in_progress || 0) + (counts.completed || 0);
    return counts[tabKey] || 0;
  };

  const activeQuery = TABS.find(t => t.key === activeTab)?.query;

  // Refresh on focus so job-status changes made in JobDetail (accept / reject /
  // complete) are reflected when returning to the list. `fetch` is a fresh
  // reference each render, so it's kept out of deps to avoid a refetch loop.
  useFocusEffect(
    useCallback(() => {
      fetch({ status: activeQuery, page: currentPage });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab])
  );

  const handleTabPress = (tab) => {
    setActiveTab(tab.key);
    fetch({ status: tab.query, page: 1 });
  };

  const goToPage = (p) => {
    fetch({ status: activeQuery, page: p });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Jobs</Text>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map(tab => {
            const count = getTabCount(tab.key);
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => handleTabPress(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="small" color="#D94625" />
            <Text style={styles.emptyText}>Loading jobs...</Text>
          </View>
        ) : failed ? (
          <TouchableOpacity style={styles.emptyState} onPress={retry} activeOpacity={0.7}>
            <Icon name="refresh" size={40} color="#DC2626" />
            <Text style={styles.emptyTitle}>Couldn't load jobs</Text>
            <Text style={styles.emptyText}>{error?.message || 'Tap to retry.'}</Text>
          </TouchableOpacity>
        ) : jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="work-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Jobs Found</Text>
            <Text style={styles.emptyText}>You do not have any jobs here.</Text>
          </View>
        ) : (
          <>
            {jobs.map((job, idx) => {
              const statusPill = getStatusPill(job.status);
              const rowNum = (currentPage - 1) * meta.perPage + idx + 1;
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('JobDetail', { ticketId: job.id, status: job.status })}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.rowNumWrap}>
                      <Text style={styles.rowNum}>{rowNum}</Text>
                    </View>
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketNumber}>{job.ticket}</Text>
                      <Text style={styles.serviceName} numberOfLines={2}>{job.service}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
                      <Text style={[styles.statusPillText, { color: statusPill.text }]}>{statusPill.label}</Text>
                    </View>
                  </View>

                  <View style={styles.cardDivider} />

                  <View style={styles.cardDetailsRow}>
                    <View style={styles.detailItem}>
                      <Icon name="location-on" size={14} color="#94A3B8" />
                      <Text style={styles.detailText} numberOfLines={1}>{job.location}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Icon name="schedule" size={14} color="#94A3B8" />
                      <Text style={styles.detailText}>{job.slaDeadline || '—'}</Text>
                    </View>
                  </View>

                  <View style={styles.cardActionRow}>
                    <View style={styles.priorityBadge}>
                      <Text style={styles.priorityText}>{job.priority}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      onPress={() => navigation.navigate('JobDetail', { ticketId: job.id, status: job.status })}
                    >
                      <Icon name="visibility" size={18} color="#3B82F6" />
                      <Text style={styles.viewBtnText}>View</Text>
                      <Icon name="chevron-right" size={16} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}

            <View style={styles.paginationRow}>
              <Text style={styles.paginationInfo}>
                Showing {((currentPage - 1) * meta.perPage) + 1} to {Math.min(currentPage * meta.perPage, meta.total)} of {meta.total} entries
              </Text>
              <View style={styles.paginationControls}>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                  onPress={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <Icon name="chevron-left" size={20} color={currentPage === 1 ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
                <View style={styles.pageNumActive}>
                  <Text style={styles.pageNumActiveText}>{currentPage}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                  onPress={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  <Icon name="chevron-right" size={20} color={currentPage === totalPages ? '#CBD5E1' : '#64748B'} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },

  tabsContainer: { paddingTop: 20, paddingBottom: 12 },
  tabsScroll: { paddingHorizontal: 20, gap: 12 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  tabActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  tabCount: {
    backgroundColor: '#F1F5F9', borderRadius: 10, minWidth: 22, height: 22,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6,
  },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  tabCountTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 8, gap: 12 },

  jobCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowNumWrap: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  rowNum: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  ticketInfo: { flex: 1, gap: 4 },
  ticketNumber: { fontSize: 15, fontWeight: '700', color: '#1E293B', fontFamily: typography.labelMedium?.fontFamily },
  serviceName: { fontSize: 13, color: '#475569', lineHeight: 18 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },

  cardDetailsRow: { flexDirection: 'row', gap: 20 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  detailText: { fontSize: 12, color: '#64748B', flex: 1 },

  cardActionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  priorityBadge: {
    backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  priorityText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtnText: { fontSize: 13, fontWeight: '600', color: '#3B82F6' },

  paginationRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingHorizontal: 4,
  },
  paginationInfo: { fontSize: 12, color: '#94A3B8' },
  paginationControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBtn: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  pageBtnDisabled: { backgroundColor: '#F8FAFC' },
  pageNumActive: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: '#D94625',
    justifyContent: 'center', alignItems: 'center',
  },
  pageNumActiveText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 14, color: '#64748B' },
});

export default MyJobs;
