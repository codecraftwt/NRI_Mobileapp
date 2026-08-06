import React, { useState, useCallback, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, TextInput, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { getRmSupportTickets } from '../../Api/RM/rmSupportApi';

const norm = (s) => String(s || '').toLowerCase();

// Status filter options (shown as icon tiles in the filter sheet).
const STATUS_OPTIONS = [
  { key: 'all', label: 'All Statuses', icon: 'inbox' },
  { key: 'pending', label: 'Pending', icon: 'hourglass-empty' },
  { key: 'open', label: 'Open', icon: 'mark-email-unread' },
  { key: 'escalated', label: 'Escalated', icon: 'arrow-upward' },
  { key: 'resolved', label: 'Resolved', icon: 'check-circle' },
];

const CATEGORY_ICON = {
  custom_plan: 'tune',
  rm: 'support-agent',
  general: 'help-outline',
  vendor: 'store',
  telecaller: 'headset-mic',
};

function statusText(s) {
  return norm(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getStatusPill(status) {
  switch (norm(status)) {
    case 'resolved': case 'closed': return { bg: '#D1FAE5', text: '#059669' };
    case 'escalated': return { bg: '#FEE2E2', text: '#DC2626' };
    case 'open': return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'pending': return { bg: '#FEF3E7', text: '#C2410C' };
    default: return { bg: '#F3F4F6', text: '#4B5563' };
  }
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

// Short date for the card header band, e.g. "24/09/2024" (pinned to UTC).
function dateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function GeneralSupport({ navigation }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterVisible, setFilterVisible] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const fetchPage = useCallback(async (page = 1) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await getRmSupportTickets({ page });
      setTickets(res.tickets);
      setMeta(res.meta);
    } catch (e) {
      // keep whatever's shown; surface nothing destructive
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchPage(1); }, [fetchPage]));

  const currentPage = meta?.currentPage || 1;
  const lastPage = meta?.lastPage || 1;
  const perPage = meta?.perPage || tickets.length || 0;
  const total = meta?.total || 0;
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  const goToPage = (p) => {
    if (loading || p < 1 || p > lastPage || p === currentPage) return;
    fetchPage(p);
  };

  const matchesStatus = (t) => {
    if (statusFilter === 'all') return true;
    const s = norm(t.status);
    if (statusFilter === 'escalated') return t.escalated || s === 'escalated';
    if (statusFilter === 'resolved') return s === 'resolved' || s === 'closed';
    return s === statusFilter;
  };

  const matchesSearch = (t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (t.customer?.name || '').toLowerCase().includes(q)
      || (t.ticketNumber || '').toLowerCase().includes(q)
      || (t.subject || '').toLowerCase().includes(q);
  };

  const filtered = tickets.filter(t => matchesStatus(t) && matchesSearch(t));
  const activeStatusLabel = STATUS_OPTIONS.find(o => o.key === statusFilter)?.label;

  const countFor = (key) => {
    if (key === 'all') return tickets.length;
    return tickets.filter(t => {
      const s = norm(t.status);
      if (key === 'escalated') return t.escalated || s === 'escalated';
      if (key === 'resolved') return s === 'resolved' || s === 'closed';
      return s === key;
    }).length;
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>General Support</Text>
            <Text style={styles.headerSub}>Tickets raised by your customers</Text>
          </View>
          {total > 0 && (
            <View style={styles.headerCount}>
              <Icon name="support-agent" size={15} color="#FDE68A" />
              <Text style={styles.headerCountText}>{total}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customer, subject or ticket no..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, statusFilter !== 'all' && styles.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
          activeOpacity={0.8}
        >
          <Icon name="tune" size={22} color={statusFilter !== 'all' ? '#FFFFFF' : '#20304C'} />
          {statusFilter !== 'all' && <View style={styles.filterDot} />}
        </TouchableOpacity>
      </View>

      {/* Active status filter chip */}
      {statusFilter !== 'all' && (
        <View style={styles.activeFilterRow}>
          <View style={[styles.activeFilterChip, { backgroundColor: getStatusPill(statusFilter).bg }]}>
            <Text style={[styles.activeFilterText, { color: getStatusPill(statusFilter).text }]}>{activeStatusLabel}</Text>
            <TouchableOpacity onPress={() => setStatusFilter('all')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={14} color={getStatusPill(statusFilter).text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && tickets.length === 0 ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#20304C" />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="support-agent" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Tickets Found</Text>
          </View>
        ) : (
          filtered.map((t) => {
            const pill = getStatusPill(t.status);
            const icon = CATEGORY_ICON[t.category] || 'confirmation-number';
            const hasUnread = t.unreadCount > 0;
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('RMSupportTicketDetail', { ticketId: t.id, ticketNumber: t.ticketNumber })}
              >
                {/* Faint header band (single brand-matched tone) */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardHeaderCode}>{t.ticketNumber}</Text>
                  <Text style={styles.cardHeaderDate}>{dateShort(t.createdAt)}</Text>
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  <View style={styles.cardBodyTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardSubtitle} numberOfLines={1}>{t.customer?.name || 'Customer'}</Text>
                      <Text style={styles.cardTitle} numberOfLines={2}>{t.subject || 'Support request'}</Text>
                    </View>
                    <View style={[styles.statusChip, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.statusChipText, { color: pill.text }]}>{statusText(t.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.cardBodyBottom}>
                    <View style={styles.bottomLeft}>
                      <View style={styles.categoryChip}>
                        <Icon name={icon} size={13} color="#64748B" />
                        <Text style={styles.categoryChipText} numberOfLines={1}>{t.categoryLabel || 'General'}</Text>
                      </View>
                      {t.escalated && (
                        <View style={styles.escalatedTag}>
                          <Icon name="arrow-upward" size={11} color="#DC2626" />
                          <Text style={styles.escalatedTagText}>Escalated</Text>
                        </View>
                      )}
                      {hasUnread && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadText}>{t.unreadCount > 9 ? '9+' : t.unreadCount}</Text>
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      style={styles.viewBtn}
                      activeOpacity={0.85}
                      onPress={() => navigation.navigate('RMSupportTicketDetail', { ticketId: t.id, ticketNumber: t.ticketNumber })}
                    >
                      <Text style={styles.viewBtnText}>View Detail</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Pagination */}
        {!!meta && total > 0 && tickets.length > 0 && (
          <View style={styles.pagination}>
            <Text style={styles.pageInfo}>Showing {from} to {to} of {total} results</Text>
            {lastPage > 1 && (
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
                    <TouchableOpacity
                      key={p}
                      style={[styles.pageNum, active && styles.pageNumActive]}
                      onPress={() => goToPage(p)}
                      activeOpacity={0.7}
                    >
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
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter sheet */}
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setFilterVisible(false)}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filter by Status</Text>
              {statusFilter !== 'all' && (
                <TouchableOpacity onPress={() => { setStatusFilter('all'); setFilterVisible(false); }}>
                  <Text style={styles.sheetReset}>Reset</Text>
                </TouchableOpacity>
              )}
            </View>
            {STATUS_OPTIONS.map(opt => {
              const active = statusFilter === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.filterOption, active && styles.filterOptionActive]}
                  onPress={() => { setStatusFilter(opt.key); setFilterVisible(false); }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.filterOptionIcon, active && styles.filterOptionIconActive]}>
                    <Icon name={opt.icon} size={19} color={active ? '#FFFFFF' : '#64748B'} />
                  </View>
                  <Text style={[styles.filterOptionLabel, active && styles.filterOptionLabelActive]}>{opt.label}</Text>
                  <View style={[styles.filterOptionCount, active && styles.filterOptionCountActive]}>
                    <Text style={[styles.filterOptionCountText, active && styles.filterOptionCountTextActive]}>{countFor(opt.key)}</Text>
                  </View>
                  <View style={[styles.radio, active && styles.radioOn]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { marginLeft: 6 },
  headerTitle: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 3 },
  headerCount: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  headerCountText: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', padding: 0 },
  filterBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#20304C', borderColor: '#20304C' },
  filterDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#D94625' },

  activeFilterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 4, paddingTop: 4 },
  activeFilterChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  activeFilterText: { fontSize: 12, fontWeight: '700' },

  // Filter bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  sheetTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  sheetReset: { fontSize: 13, fontWeight: '700', color: '#D94625' },
  filterOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  filterOptionActive: { backgroundColor: '#F5F8FC', borderColor: '#D6E0EC' },
  filterOptionIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  filterOptionIconActive: { backgroundColor: '#20304C' },
  filterOptionLabel: { flex: 1, fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  filterOptionLabelActive: { color: '#0F172A' },
  filterOptionCount: { minWidth: 26, height: 24, borderRadius: 12, paddingHorizontal: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  filterOptionCountActive: { backgroundColor: '#E0E7F1' },
  filterOptionCountText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  filterOptionCountTextActive: { color: '#20304C' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  radioOn: { borderColor: '#20304C' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#20304C' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 8, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#d1d9e3', borderBottomWidth: 1, borderBottomColor: '#E4EAF1' },
  cardHeaderCode: { fontSize: 12.5, fontWeight: '800', letterSpacing: 0.3, color: '#20304C' },
  cardHeaderDate: { fontSize: 11.5, fontWeight: '700', color: '#64748B' },
  cardBody: { padding: 14 },
  cardBodyTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardSubtitle: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  cardTitle: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#1E293B', lineHeight: 20 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusChipText: { fontSize: 10, fontWeight: '700' },
  cardBodyBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 8 },
  bottomLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 1 },
  categoryChipText: { fontSize: 11, color: '#64748B', flexShrink: 1 },
  escalatedTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEE2E2', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4 },
  escalatedTagText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  viewBtn: { backgroundColor: '#577099', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 6 },
  viewBtnText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },

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

export default GeneralSupport;
