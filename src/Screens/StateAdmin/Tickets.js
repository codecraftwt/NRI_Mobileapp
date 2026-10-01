import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import { useStateAdminTickets } from '../../Hooks/StateAdmin/useStateAdminTickets';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Matches GET /admin/tickets' `status` enum — order drives the tab row.
const STATUS_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunded', label: 'Refunded' },
];

function getStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('complet') || s.includes('refund')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  if (s.includes('progress') || s.includes('assign')) return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  if (s === 'new') return { bg: '#F3E8FF', text: '#7E22CE', border: '#DDD6FE' };
  if (s.includes('escalat')) return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  if (s.includes('cancel')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}

function getPriorityStyle(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent' || p === 'high') return { bg: '#FEE2E2', text: '#EF4444' };
  if (p === 'medium') return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#F1F5F9', text: '#64748B' };
}

function Tickets() {
  const {
    tickets,
    meta,
    loading,
    loadingMore,
    failed,
    error,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    fetchNextPage,
    refresh,
  } = useStateAdminTickets();

  const [refreshing, setRefreshing] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const total = meta?.total ?? tickets.length;
  const statusCounts = meta?.statusCounts || {};
  const activeStatusLabel = STATUS_FILTERS.find(f => f.id === filterStatus)?.label || 'All';

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Tickets</Text>
            <Text style={styles.headerSub}>Tickets across your jurisdiction</Text>
          </View>
          <View style={styles.headerActions}>
            {total > 0 && (
              <View style={styles.headerCount}>
                <Icon name="confirmation-number" size={15} color="#FDE68A" />
                <Text style={styles.headerCountText}>{total}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Search + quick toggles */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ticket #, customer, phone..."
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
            style={[styles.toggleBtn, filterStatus !== 'all' && styles.toggleBtnActive]}
            activeOpacity={0.8}
            onPress={() => setStatusModalVisible(true)}
          >
            <Icon name="filter-list" size={20} color={filterStatus !== 'all' ? '#FFFFFF' : '#20304C'} />
          </TouchableOpacity>
        </View>

        {filterStatus !== 'all' && (
          <View style={styles.activeFilterRow}>
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>{activeStatusLabel}</Text>
              <TouchableOpacity onPress={() => setFilterStatus('all')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="close" size={14} color="#A64416" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {failed && (
          <TouchableOpacity style={styles.errorCard} activeOpacity={0.8} onPress={refresh}>
            <Icon name="error-outline" size={20} color="#DC2626" />
            <Text style={styles.errorText}>
              {error?.message || 'Could not load tickets.'} Tap to retry.
            </Text>
          </TouchableOpacity>
        )}

        <FlatList
          data={tickets}
          keyExtractor={t => String(t.id || t.ticketNumber)}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={fetchNextPage}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#A64416" />
                <Text style={styles.emptySub}>Loading tickets...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="confirmation-number" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Tickets Found</Text>
                <Text style={styles.emptySub}>
                  {search ? 'Try adjusting your search query' : 'No tickets match the selected filters'}
                </Text>
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color="#A64416" />
              </View>
            ) : null
          }
          renderItem={({ item: t }) => {
            const statusStyle = getStatusStyle(t.status);
            const priorityStyle = getPriorityStyle(t.priority);
            const locationStr = [t.cityName, t.stateName].filter(Boolean).join(', ');

            return (
              <View style={styles.ticketCard}>
                <View style={styles.ticketTop}>
                  <View style={styles.ticketIdRow}>
                    <Text style={styles.ticketNumber}>#{t.ticketNumber}</Text>
                    {!!t.priority && (
                      <View style={[styles.priorityPill, { backgroundColor: priorityStyle.bg }]}>
                        <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
                          {t.priority.toUpperCase()}
                        </Text>
                      </View>
                    )}
                    {t.isQuoted && (
                      <View style={styles.quotedPill}>
                        <Text style={styles.quotedPillText}>ON QUOTE</Text>
                      </View>
                    )}
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {(t.statusLabel || titleCase(t.status)).toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.ticketTitle}>{t.serviceName}</Text>

                {!!t.categoryName && (
                  <View style={styles.categoryBadge}>
                    <Text style={styles.categoryBadgeText}>{t.categoryName.toUpperCase()}</Text>
                  </View>
                )}

                <View style={styles.metaDivider} />

                <View style={styles.metaGrid}>
                  <View style={styles.metaRow}>
                    <Icon name="person" size={14} color="#64748B" />
                    <Text style={styles.metaText} numberOfLines={1}>{t.customerName}</Text>
                  </View>
                  {!!locationStr && (
                    <View style={styles.metaRow}>
                      <Icon name="place" size={14} color="#64748B" />
                      <Text style={styles.metaText} numberOfLines={1}>{locationStr}</Text>
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <Icon name="storefront" size={14} color={t.vendorName ? '#059669' : '#94A3B8'} />
                    <Text style={[styles.metaText, t.vendorName && { color: '#059669', fontWeight: '600' }]} numberOfLines={1}>
                      {t.vendorName || 'Unassigned'}
                    </Text>
                  </View>
                  {!!t.amountFormatted && (
                    <View style={styles.metaRow}>
                      <Icon name="payments" size={14} color="#16A34A" />
                      <Text style={[styles.metaText, { color: '#16A34A', fontWeight: '700' }]}>{t.amountFormatted}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          }}
        />
      </View>

      {/* Status Filter Sheet — options + counts come from meta.status_counts
          for the same scope + filters (minus status itself). */}
      <Modal visible={statusModalVisible} transparent animationType="slide" onRequestClose={() => setStatusModalVisible(false)}>
        <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setStatusModalVisible(false)}>
          <TouchableOpacity style={styles.filterSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.filterHandleWrap}>
              <View style={styles.filterHandle} />
            </View>
            <Text style={styles.filterTitle}>Filter by status</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {STATUS_FILTERS.map(f => {
                const active = filterStatus === f.id;
                // The backend's status_counts omits the currently-applied
                // status's own key ("minus status itself") since that count
                // is already meta.total for the filtered list — fall back to
                // it so the active row doesn't go blank.
                const count = f.id === 'all'
                  ? (statusCounts.all ?? total)
                  : (statusCounts[f.id] ?? (filterStatus === f.id ? total : undefined));
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.filterOptionRow}
                    activeOpacity={0.7}
                    onPress={() => { setFilterStatus(f.id); setStatusModalVisible(false); }}
                  >
                    <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>
                      {f.label}{count != null ? ` (${count})` : ''}
                    </Text>
                    {active && <Icon name="check-circle" size={20} color="#A64416" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C' },

  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#20304C',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCount: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  headerCountText: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },

  body: { flex: 1, backgroundColor: '#FDFBF7', paddingTop: 8 },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
  toggleBtn: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  toggleBtnActive: { backgroundColor: '#A64416', borderColor: '#A64416' },

  activeFilterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12 },
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  activeFilterChipText: { fontSize: 12, fontWeight: '700', color: '#A64416' },

  // Status Filter Sheet
  filterOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  filterSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '70%',
  },
  filterHandleWrap: { alignItems: 'center', paddingVertical: 8, marginBottom: 6 },
  filterHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1' },
  filterTitle: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 12 },
  filterOptionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  filterOptionText: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
  filterOptionTextActive: { color: '#A64416', fontWeight: '700' },

  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, marginHorizontal: 20, marginBottom: 10,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 18 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 110, gap: 12 },

  ticketCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1, flexWrap: 'wrap' },
  ticketNumber: { fontSize: 13, fontWeight: '700', color: '#20304C' },
  priorityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 9, fontWeight: '700' },
  quotedPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: '#EEF2FF' },
  quotedPillText: { fontSize: 9, fontWeight: '700', color: '#4338CA' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
  ticketTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  categoryBadge: {
    backgroundColor: '#EEF2FB',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#20304C',
    letterSpacing: 0.5,
  },

  metaDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748B' },

  emptyState: { paddingVertical: 50, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 24 },
});

export default Tickets;
