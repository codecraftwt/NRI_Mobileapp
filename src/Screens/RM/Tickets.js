import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, StatusBar, ActivityIndicator, TextInput, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useRmRequests } from '../../Hooks/RM/useRmRequests';

const norm = (s) => String(s || '').toLowerCase();

// Status filter options (shown as getStatusPill pills in the filter sheet).
const STATUS_OPTIONS = [
  { key: 'all', label: 'All Statuses' },
  { key: 'new', label: 'New' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'overdue', label: 'Overdue' },
];

function statusLabel(s) {
  return norm(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getStatusPill(status) {
  switch (norm(status)) {
    case 'resolved': case 'completed': return { bg: '#D1FAE5', text: '#3bbf95' };
    case 'in_progress': case 'in progress': return { bg: '#FFEDD5', text: '#C2410C' };
    case 'assigned': return { bg: '#DBEAFE', text: '#4f6595' };
    case 'new': return { bg: '#EEF2FF', text: '#6768cb' };
    case 'overdue': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#F3F4F6', text: '#4B5563' };
  }
}

// A ticket is overdue when it's not done and its SLA deadline has passed.
function isOverdue(t) {
  const s = norm(t.status);
  if (s === 'resolved' || s === 'completed') return false;
  return !!t.overdue || (!!t.slaDeadline && new Date(t.slaDeadline).getTime() < Date.now());
}

// Short date for the card header band, e.g. "24/09/2024".
function dateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// SLA countdown label from the deadline + overdue flag.
function slaLabel(deadline, overdue, status) {
  const s = norm(status);
  if (s === 'resolved' || s === 'completed') return 'Resolved';
  if (!deadline) return overdue ? 'Overdue' : null;
  const diff = new Date(deadline).getTime() - Date.now();
  const days = Math.round(Math.abs(diff) / 86400000);
  const overdueNow = overdue || diff < 0;
  if (overdueNow) return days <= 0 ? 'Overdue' : `Overdue ${days}d`;
  return days <= 0 ? 'Due today' : `Due in ${days}d`;
}

function Tickets({ navigation }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filterVisible, setFilterVisible] = useState(false);
  const { requests, loading, meta, fetchNextPage } = useRmRequests();
  const total = meta?.total || 0;

  const matchesStatus = (t) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'overdue') return isOverdue(t);
    const s = norm(t.status);
    if (statusFilter === 'completed') return s === 'completed' || s === 'resolved';
    return s === statusFilter;
  };

  const matchesSearch = (t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (t.customer || '').toLowerCase().includes(q) || (t.ticket || '').toLowerCase().includes(q);
  };

  const filtered = requests.filter(t => matchesStatus(t) && matchesSearch(t));
  const activeStatusLabel = STATUS_OPTIONS.find(o => o.key === statusFilter)?.label;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Tickets</Text>
            <Text style={styles.headerSub}>Requests raised by your customers</Text>
          </View>
          {total > 0 && (
            <View style={styles.headerCount}>
              <Icon name="confirmation-number" size={15} color="#FDE68A" />
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
            placeholder="Search customer or ticket no..."
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

      <FlatList
        data={filtered}
        keyExtractor={t => String(t.id)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading && requests.length === 0 ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#20304C" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="confirmation-number" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Tickets Found</Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && requests.length > 0 ? (
            <View style={styles.listFooter}><ActivityIndicator size="small" color="#20304C" /></View>
          ) : null
        }
        renderItem={({ item: t }) => {
            const pill = getStatusPill(t.status);
            const resolved = norm(t.status) === 'resolved' || norm(t.status) === 'completed';
            const sla = slaLabel(t.slaDeadline, t.overdue, t.status);
            // Only show the SLA badge for on-track pending tickets — not for
            // resolved/completed or overdue ones.
            const showSla = !!sla && !resolved && !isOverdue(t);
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('TicketDetail', { ticketId: t.id })}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <View style={styles.ticketNumRow}>
                      <Icon name="receipt-long" size={14} color="#64748B" />
                      <Text style={styles.ticketNumText}>{t.ticket}</Text>
                      <Text style={styles.dateText}>• {dateShort(t.createdAt)}</Text>
                    </View>

                    <Text style={styles.cardTitle} numberOfLines={2}>{t.service}</Text>

                    <View style={styles.customerRow}>
                      <Icon name="person-outline" size={14} color="#94A3B8" />
                      <Text style={styles.customerText} numberOfLines={1}>{t.customer || 'Customer'}</Text>
                    </View>

                    {showSla && (
                      <View style={styles.dueWrap}>
                        <Icon name="schedule" size={12} color="#B45309" />
                        <Text style={styles.dueText}>{sla}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.cardRight}>
                    <View style={[styles.statusChip, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.statusChipText, { color: pill.text }]}>{statusLabel(t.status)}</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color="#CBD5E1" />
                  </View>
                </View>
              </TouchableOpacity>
            );
        }}
      />

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
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterOptionLabel, active && styles.filterOptionLabelActive]}>{opt.label}</Text>
                  {active && <Icon name="check-circle" size={20} color="#20304C" />}
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
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  headerCount: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  headerCountText: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#1E293B', padding: 0 },
  filterBtn: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  filterBtnActive: { backgroundColor: '#20304C', borderColor: '#20304C' },

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
  filterOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: 'transparent' },
  filterOptionActive: { backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' },
  filterOptionLabel: { fontSize: 15, fontWeight: '600', color: '#334155' },
  filterOptionLabelActive: { color: '#0F172A' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 8, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    padding: 19,
  },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  cardLeft: { flex: 1, paddingRight: 12 },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: 70 },

  ticketNumRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7 },
  ticketNumText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  dateText: { fontSize: 11, color: '#94A3B8' },

  cardTitle: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginBottom: 7, lineHeight: 19 },

  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  customerText: { fontSize: 12, color: '#475569' },

  statusChip: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  statusChipText: { fontSize: 10, fontWeight: '700' },

  dueWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#FEF3E7', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  dueText: { fontSize: 10, fontWeight: '700', color: '#B45309' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  listFooter: { paddingVertical: 16 },
});

export default Tickets;
