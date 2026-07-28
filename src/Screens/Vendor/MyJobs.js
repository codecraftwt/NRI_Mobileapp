import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useVendorJobs } from '../../Hooks/useVendorJobs';

const TABS = [
  { key: 'all', label: 'All', query: undefined },
  { key: 'assigned', label: 'Assigned', query: 'assigned' },
  { key: 'completed', label: 'Completed', query: 'completed' },
];

function getStatusPill(status) {
  switch (status) {
    case 'Completed': return { bg: '#E8ECF3', text: '#20304C', accent: '#20304C', label: 'Completed' };
    case 'In Progress': return { bg: '#FFEDD5', text: '#C2410C', accent: '#F97316', label: 'In Progress' };
    case 'New': return { bg: '#DBEAFE', text: '#1D4ED8', accent: '#3B82F6', label: 'New' };
    case 'Assigned': return { bg: '#EDE9FE', text: '#6D28D9', accent: '#8B5CF6', label: 'Assigned' };
    default: return { bg: '#F3F4F6', text: '#4B5563', accent: '#94A3B8', label: status || 'New' };
  }
}

function getPriorityStyle(priority) {
  switch ((priority || '').toLowerCase()) {
    case 'urgent':
    case 'high': return { bg: '#FEE2E2', text: '#DC2626', dot: '#EF4444' };
    case 'medium': return { bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B' };
    case 'low': return { bg: '#DCFCE7', text: '#16A34A', dot: '#22C55E' };
    default: return { bg: '#F1F5F9', text: '#64748B', dot: '#94A3B8' };
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
            {jobs.map((job) => {
              const statusPill = getStatusPill(job.status);
              const priority = getPriorityStyle(job.priority);
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate('JobDetail', { ticketId: job.id, status: job.status })}
                >
                  {/* Status header band */}
                  <View style={[styles.cardHeaderBand, { backgroundColor: statusPill.bg }]}>
                    <View style={styles.statusPill}>
                      <View style={[styles.statusDot, { backgroundColor: statusPill.accent }]} />
                      <Text style={[styles.statusPillText, { color: statusPill.text }]}>{statusPill.label}</Text>
                    </View>
                    <View style={styles.headerTicketWrap}>
                      <Icon name="confirmation-number" size={13} color={statusPill.text} />
                      <Text style={[styles.headerTicket, { color: statusPill.text }]}>{job.ticket}</Text>
                    </View>
                  </View>

                  {/* Body */}
                  <View style={styles.cardBody}>
                    <Text style={styles.serviceName} numberOfLines={2}>{job.service}</Text>

                    <View style={styles.metaRow}>
                      <Icon name="location-on" size={15} color="#94A3B8" />
                      <Text style={styles.metaText} numberOfLines={1}>{job.location}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Icon name="schedule" size={15} color="#94A3B8" />
                      <Text style={styles.metaText} numberOfLines={1}>{job.slaDeadline || '—'}</Text>
                    </View>

                    <View style={styles.cardFooter}>
                      <View style={[styles.priorityBadge, { backgroundColor: priority.bg }]}>
                        <View style={[styles.priorityDot, { backgroundColor: priority.dot }]} />
                        <Text style={[styles.priorityText, { color: priority.text }]}>{job.priority}</Text>
                      </View>
                      <View style={styles.viewBtn}>
                        <Text style={styles.viewBtnText}>View details</Text>
                        <Icon name="arrow-forward" size={14} color="#D94625" />
                      </View>
                    </View>
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

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 8, gap: 10 },

  jobCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },

  cardHeaderBand: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
  },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  headerTicketWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTicket: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },

  cardBody: { padding: 14, gap: 8 },
  serviceName: { fontSize: 15, fontWeight: '700', color: '#1E293B', lineHeight: 20 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { fontSize: 12, color: '#64748B', flex: 1 },

  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4,
    paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  priorityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 10, fontWeight: '700', color: '#64748B', textTransform: 'capitalize' },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  viewBtnText: { fontSize: 12, fontWeight: '700', color: '#D94625' },

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
