import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useRmEscalations } from '../../Hooks/RM/useRmEscalations';

const norm = (s) => String(s || '').toLowerCase();

function priorityBadge(p) {
  switch (norm(p)) {
    case 'critical': return { bg: '#FEE2E2', color: '#DC2626' };
    case 'high': return { bg: '#FFEDD5', color: '#C2410C' };
    default: return { bg: '#FEF3C7', color: '#CA8A04' };
  }
}
function statusBadge(s) {
  switch (norm(s)) {
    case 'resolved': case 'closed': return { bg: '#D1FAE5', color: '#059669' };
    case 'in review': case 'in_review': case 'in progress': case 'in_progress': return { bg: '#DBEAFE', color: '#2563EB' };
    default: return { bg: '#FEE2E2', color: '#DC2626' };
  }
}
function label(s) {
  return norm(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Windowed page numbers around the current page (e.g. [1,2,3]).
function pageWindow(current, last, size = 3) {
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = Math.min(last, start + size - 1);
  start = Math.max(1, end - size + 1);
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

// Relative "x days ago" from an ISO timestamp.
function ago(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  if (isNaN(diff)) return '';
  const day = 86400000;
  if (diff < day) return 'Today';
  const days = Math.round(diff / day);
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  const months = Math.round(days / 30);
  return `${months} month${months > 1 ? 's' : ''} ago`;
}

function Escalations({ navigation }) {
  const [activeTab, setActiveTab] = useState('All');
  const { escalations, loading, meta, fetchPage } = useRmEscalations();
  const tabs = ['All', 'Open', 'In Review', 'Resolved'];

  const currentPage = meta?.currentPage || 1;
  const lastPage = meta?.lastPage || 1;
  const perPage = meta?.perPage || escalations.length || 0;
  const total = meta?.total || 0;
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  const goToPage = (p) => {
    if (loading || p < 1 || p > lastPage || p === currentPage) return;
    fetchPage(p);
  };

  const tabMatch = (tab, e) => {
    if (tab === 'All') return true;
    const s = norm(e.status);
    if (tab === 'Open') return s === 'open' || s === 'raised' || s === 'pending';
    if (tab === 'In Review') return s === 'in review' || s === 'in_review' || s === 'in progress' || s === 'in_progress';
    if (tab === 'Resolved') return s === 'resolved' || s === 'closed';
    return true;
  };

  const filtered = escalations.filter(e => tabMatch(activeTab, e));

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escalations</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity key={tab} style={[styles.tab, isActive && styles.tabActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && escalations.length === 0 ? (
          <View style={styles.emptyState}><ActivityIndicator size="large" color="#20304C" /></View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="verified" size={44} color="#CBD5E1" />
            <Text style={styles.emptyText}>No escalations to show.</Text>
          </View>
        ) : (
          filtered.map(e => {
            const p = priorityBadge(e.priority);
            const s = statusBadge(e.status);
            return (
              <TouchableOpacity
                key={e.id}
                style={styles.card}
                activeOpacity={0.7}
                disabled={e.ticketId == null}
                onPress={() => e.ticketId != null && navigation.navigate('TicketDetail', { ticketId: e.ticketId })}
              >
                <View style={styles.cardTop}>
                  <View style={[styles.alertIcon, { backgroundColor: p.bg }]}>
                    <Icon name="priority-high" size={20} color={p.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticket}>{e.ticket || 'Request'}</Text>
                    <Text style={styles.issue} numberOfLines={2}>{e.reason}</Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.metaRow}>
                  {!!e.customer && (
                    <View style={styles.metaItem}>
                      <Icon name="person" size={14} color="#94A3B8" />
                      <Text style={styles.metaText}>{e.customer}</Text>
                    </View>
                  )}
                  {!!e.createdAt && (
                    <View style={styles.metaItem}>
                      <Icon name="schedule" size={14} color="#94A3B8" />
                      <Text style={styles.metaText}>{ago(e.createdAt)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.badgeRow}>
                  {!!e.priority && (
                    <View style={[styles.badge, { backgroundColor: p.bg }]}>
                      <Text style={[styles.badgeText, { color: p.color }]}>{label(e.priority)}</Text>
                    </View>
                  )}
                  <View style={[styles.badge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.badgeText, { color: s.color }]}>{e.statusLabel || label(e.status)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Pagination */}
        {!!meta && total > 0 && lastPage > 1 && (
          <View style={styles.pagination}>
            <Text style={styles.pageInfo}>Showing {from} to {to} of {total} results</Text>
            <View style={styles.pageRow}>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
                onPress={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                activeOpacity={0.7}
              >
                <Icon name="chevron-left" size={18} color={currentPage <= 1 ? '#CBD5E1' : '#475569'} />
              </TouchableOpacity>
              {pageWindow(currentPage, lastPage).map(p => {
                const active = p === currentPage;
                return (
                  <TouchableOpacity key={p} style={[styles.pageNum, active && styles.pageNumActive]} onPress={() => goToPage(p)} activeOpacity={0.7}>
                    <Text style={[styles.pageNumText, active && styles.pageNumTextActive]}>{p}</Text>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity
                style={[styles.pageBtn, currentPage >= lastPage && styles.pageBtnDisabled]}
                onPress={() => goToPage(currentPage + 1)}
                disabled={currentPage >= lastPage}
                activeOpacity={0.7}
              >
                <Icon name="chevron-right" size={18} color={currentPage >= lastPage ? '#CBD5E1' : '#475569'} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { marginLeft: 6 },
  headerTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#FFFFFF' },

  tabsContainer: { paddingTop: 16, paddingBottom: 8 },
  tabsScroll: { paddingHorizontal: 20, gap: 10 },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  tabActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8, gap: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  alertIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  ticket: { fontSize: 14, fontWeight: '700', color: '#1E293B', fontFamily: typography.labelMedium.fontFamily },
  issue: { fontSize: 13, color: '#475569', lineHeight: 18, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  metaRow: { flexDirection: 'row', gap: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748B' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  emptyState: { paddingVertical: 70, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },

  pagination: { alignItems: 'center', gap: 12, marginTop: 8, paddingTop: 8 },
  pageInfo: { fontSize: 13, color: '#64748B' },
  pageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  pageBtnDisabled: { backgroundColor: '#F8FAFC' },
  pageNum: { minWidth: 36, height: 36, borderRadius: 18, paddingHorizontal: 6, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  pageNumActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  pageNumText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  pageNumTextActive: { color: '#FFFFFF' },
});

export default Escalations;
