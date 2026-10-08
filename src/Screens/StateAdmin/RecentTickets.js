import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import { useStateAdminDashboard } from '../../Hooks/StateAdmin/useStateAdminDashboard';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function getStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolv') || s.includes('complet')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  if (s.includes('progress') || s.includes('active') || s.includes('assign')) return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  if (s.includes('pend') || s.includes('hold')) return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  if (s.includes('cancel') || s.includes('breach') || s.includes('reject')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}

function getPriorityStyle(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent' || p === 'high') return { bg: '#FEE2E2', text: '#EF4444' };
  if (p === 'medium') return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#F1F5F9', text: '#64748B' };
}

function RecentTickets({ navigation }) {
  const insets = useSafeAreaInsets();
  const { recentTickets, loading, refresh } = useStateAdminDashboard();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  // Status filter options come straight from GET /admin/dashboard's
  // recent_tickets — { status, status_label } per ticket (see
  // mapRecentTicket) — rather than a hardcoded, guessed-at status list.
  const statusOptions = useMemo(() => {
    const seen = new Map();
    (recentTickets || []).forEach(t => {
      if (t.status && !seen.has(t.status)) {
        seen.set(t.status, t.statusLabel || titleCase(t.status));
      }
    });
    return [{ id: 'all', label: 'All' }, ...Array.from(seen, ([id, label]) => ({ id, label }))];
  }, [recentTickets]);

  const activeStatusLabel = statusOptions.find(o => o.id === activeTab)?.label || 'All';

  const filteredTickets = useMemo(() => {
    let list = [...(recentTickets || [])];

    if (activeTab !== 'all') {
      list = list.filter(t => t.status === activeTab);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        (t.ticketNumber || '').toLowerCase().includes(q) ||
        (t.customerName || '').toLowerCase().includes(q) ||
        (t.serviceName || t.title || '').toLowerCase().includes(q) ||
        (t.districtName || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [recentTickets, activeTab, search]);

  const canGoBack = navigation?.canGoBack?.();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          {canGoBack ? (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Icon name="chevron-left" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          ) : <View style={styles.backBtnPlaceholder} />}
          <View style={styles.headerCenterWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>Tickets</Text>
            <Text style={styles.headerSub} numberOfLines={1}>Tickets across your jurisdiction</Text>
          </View>
          {recentTickets.length > 0 ? (
            <View style={styles.headerCount}>
              <Icon name="confirmation-number" size={15} color="#FDE68A" />
              <Text style={styles.headerCountText}>{recentTickets.length}</Text>
            </View>
          ) : (
            <View style={styles.backBtnPlaceholder} />
          )}
        </View>
      </View>

      <View style={styles.body}>
        {/* Search + Status Filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ticket #, customer, service..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeTab !== 'all' && styles.filterBtnActive]}
            activeOpacity={0.85}
            onPress={() => setFilterOpen(true)}
          >
            <Icon name="tune" size={20} color="#FFFFFF" />
            {activeTab !== 'all' && <View style={styles.filterBtnDot} />}
          </TouchableOpacity>
        </View>

        {activeTab !== 'all' && (
          <View style={styles.activeFilterRow}>
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>{activeStatusLabel}</Text>
              <TouchableOpacity onPress={() => setActiveTab('all')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="close" size={14} color="#A64416" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tickets List */}
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
        >
          {filteredTickets.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Icon name="confirmation-number" size={36} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No tickets found</Text>
              <Text style={styles.emptySub}>
                {search ? 'Try adjusting your search criteria' : 'No tickets match the selected status filter'}
              </Text>
            </View>
          ) : (
            filteredTickets.map((t, idx) => {
              const statusStyle = getStatusStyle(t.status);
              const priorityStyle = getPriorityStyle(t.priority);
              return (
                <View key={t.id || t.ticketNumber || idx} style={styles.ticketCard}>
                  <View style={styles.ticketTop}>
                    <View style={styles.ticketIdRow}>
                      <Text style={styles.ticketNumber}>{t.ticketNumber}</Text>
                      {!!t.priority && (
                        <View style={[styles.priorityPill, { backgroundColor: priorityStyle.bg }]}>
                          <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
                            {t.priority.toUpperCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {t.status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.ticketTitle}>{t.serviceName || t.title}</Text>

                  <View style={styles.metaDivider} />

                  <View style={styles.metaGrid}>
                    <View style={styles.metaRow}>
                      <Icon name="person" size={14} color="#64748B" />
                      <Text style={styles.metaText} numberOfLines={1}>{t.customerName}</Text>
                    </View>
                    {t.districtName && (
                      <View style={styles.metaRow}>
                        <Icon name="place" size={14} color="#64748B" />
                        <Text style={styles.metaText} numberOfLines={1}>{t.districtName}</Text>
                      </View>
                    )}
                    {t.amountFormatted && (
                      <View style={styles.metaRow}>
                        <Icon name="payments" size={14} color="#16A34A" />
                        <Text style={[styles.metaText, { color: '#16A34A', fontWeight: '700' }]}>{t.amountFormatted}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Status Filter Sheet */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setFilterOpen(false)}>
          <TouchableOpacity style={styles.filterSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.filterHandleWrap}>
              <View style={styles.filterHandle} />
            </View>
            <Text style={styles.filterTitle}>Filter by status</Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {statusOptions.map(opt => {
                const active = opt.id === activeTab;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={styles.filterRow}
                    activeOpacity={0.7}
                    onPress={() => { setActiveTab(opt.id); setFilterOpen(false); }}
                  >
                    <Text style={[styles.filterRowText, active && styles.filterRowTextActive]}>{opt.label}</Text>
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
    paddingBottom: 16,
    backgroundColor: '#20304C',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  headerCenterWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.3, textAlign: 'center' },
  headerSub: { fontSize: 12.5, color: '#94A3B8', marginTop: 2, textAlign: 'center' },
  headerCount: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  headerCountText: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },

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
  filterBtn: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#20304C',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },
  filterBtnActive: { backgroundColor: '#A64416' },
  filterBtnDot: {
    position: 'absolute', top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#FDE68A',
  },

  activeFilterRow: { flexDirection: 'row', paddingHorizontal: 20, paddingTop: 12 },
  activeFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FFEDD5',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6,
  },
  activeFilterChipText: { fontSize: 12, fontWeight: '700', color: '#A64416' },

  body: {
    flex: 1, backgroundColor: '#FDFBF7',
    paddingTop: 8,
  },

  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 110, gap: 12 },

  ticketCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  ticketTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  ticketIdRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ticketNumber: { fontSize: 13, fontWeight: '700', color: '#20304C' },
  priorityPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  priorityText: { fontSize: 9, fontWeight: '700' },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
  ticketTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 10 },

  metaDivider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748B' },

  emptyWrap: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 50, gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 20 },

  // Status Filter Sheet
  filterOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  filterSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '70%',
  },
  filterHandleWrap: { alignItems: 'center', paddingVertical: 8, marginBottom: 6 },
  filterHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1' },
  filterTitle: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 12 },
  filterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  filterRowText: { fontSize: 15, color: '#1E293B', fontWeight: '500' },
  filterRowTextActive: { color: '#A64416', fontWeight: '700' },
});

export default RecentTickets;
