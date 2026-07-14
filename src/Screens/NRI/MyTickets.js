import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useMyTickets } from '../../Hooks/useMyTickets';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const STATUS_OPTIONS = ['All Statuses', 'New', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];
const URGENCY_OPTIONS = ['Any Urgency', 'Standard', 'Express', 'Emergency'];

function getStatusColor(statusLabel) {
  switch (statusLabel) {
    case 'New': return { bg: colors.badgeBackground, text: colors.primary };
    case 'Assigned': return { bg: colors.warningBackground, text: colors.warning };
    case 'In Progress': return { bg: colors.successBackground, text: colors.success };
    case 'Completed': return { bg: colors.primaryLight + '30', text: colors.primaryDark };
    case 'Cancelled': return { bg: colors.errorBackground, text: colors.error };
    default: return { bg: colors.surfaceSecondary, text: colors.textSecondary };
  }
}

function getUrgencyLabel(urgency) {
  if (!urgency) return '';
  return urgency.charAt(0).toUpperCase() + urgency.slice(1);
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function FilterField({ label, value, options, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.filterBox} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={styles.filterText} numberOfLines={1}>{value}</Text>
        <Icon name="keyboard-arrow-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.modalOptionText, item === value && { color: colors.primary, fontFamily: typography.labelLarge.fontFamily }]}>{item}</Text>
                  {item === value && <Icon name="check" size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

function MyTickets({ navigation }) {
  const { tickets, meta, loading, failed, retry, fetchPage } = useMyTickets();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [urgencyFilter, setUrgencyFilter] = useState('Any Urgency');

  const hasFilters = search.trim() || statusFilter !== 'All Statuses' || urgencyFilter !== 'Any Urgency';

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  // `retry` is a fresh function reference on every render (it's not memoized
  // by the hook), so it can't be a dependency here — including it would
  // recreate this callback each render, and since retry() itself triggers a
  // re-render (loading -> succeeded/failed), that becomes an infinite
  // refetch loop. Empty deps + focus-only firing is what we actually want:
  // fetch once each time the screen is focused, nothing more.
  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('All Statuses');
    setUrgencyFilter('Any Urgency');
  };

  const filteredTickets = tickets.filter(t => {
    if (statusFilter !== 'All Statuses' && t.statusLabel !== statusFilter) return false;
    if (urgencyFilter !== 'Any Urgency' && getUrgencyLabel(t.urgency) !== urgencyFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!t.ticketNumber?.toLowerCase().includes(q) && !t.serviceName?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="My Tickets" isTabRoot={true} />
      
      <View style={styles.filtersCard}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search ticket # or service..."
            placeholderTextColor={colors.textSecondary}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.filterRow}>
          <FilterField label="Status" value={statusFilter} options={STATUS_OPTIONS} onSelect={setStatusFilter} />
          <FilterField label="Urgency" value={urgencyFilter} options={URGENCY_OPTIONS} onSelect={setUrgencyFilter} />
        </View>
        {hasFilters && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.listCard}>
        <View style={styles.listHeaderRow}>
          <View style={styles.listTitleRow}>
            <Text style={styles.listTitle}>All Requests</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{filteredTickets.length}</Text>
            </View>
      <Header navigation={navigation} title="My Tickets" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
        <View style={styles.filtersCard}>
          <View style={styles.searchBox}>
            <Icon name="search" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ticket # or service..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity
            style={styles.newRequestBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CreateTicket')}
          >
            <Icon name="add" size={18} color={colors.onAccent} />
            <Text style={styles.newRequestBtnText}>New</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          )}
          {failed && (
            <TouchableOpacity style={styles.retryBox} onPress={retry}>
              <Text style={styles.retryText}>Failed to load. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          {!loading && !failed && filteredTickets.length === 0 && (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBg}>
                <Icon name="receipt" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Requests Found</Text>
              <Text style={styles.emptyText}>{tickets.length === 0 ? 'You have not created any requests yet.' : 'Try adjusting your filters.'}</Text>
            </View>
          )}

          {filteredTickets.map((ticket, index) => {
            const statusStyle = getStatusColor(ticket.statusLabel);
            return (
              <TouchableOpacity
                key={ticket.id}
                style={styles.ticketRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
              >
                <View style={styles.ticketHeader}>
                  <Text style={styles.ticketId}>{ticket.ticketNumber}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{ticket.statusLabel}</Text>
                  </View>
                </View>
                <Text style={styles.ticketService} numberOfLines={1}>{ticket.serviceName}</Text>
                
                <View style={styles.ticketFooter}>
                  <View style={styles.ticketMeta}>
                    <Icon name="person-outline" size={16} color={colors.textSecondary} />
                    <Text style={styles.ticketMetaText}>{ticket.vendorName || 'Pending Assignment'}</Text>
                  </View>
                  <View style={styles.ticketMeta}>
                    <Icon name="calendar-today" size={14} color={colors.textSecondary} />
                    <Text style={styles.ticketMetaText}>{formatDate(ticket.createdAt)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}

          {meta.lastPage > 1 && (
            <View style={styles.pagerRow}>
              <TouchableOpacity
                style={[styles.pagerBtn, meta.currentPage <= 1 && styles.pagerBtnDisabled]}
                disabled={meta.currentPage <= 1}
                onPress={() => fetchPage(meta.currentPage - 1)}
              >
                <Icon name="chevron-left" size={24} color={meta.currentPage <= 1 ? colors.textSecondary : colors.primary} />
              </TouchableOpacity>
              <Text style={styles.pagerText}>Page {meta.currentPage} of {meta.lastPage}</Text>
              <TouchableOpacity
                style={[styles.pagerBtn, meta.currentPage >= meta.lastPage && styles.pagerBtnDisabled]}
                disabled={meta.currentPage >= meta.lastPage}
                onPress={() => fetchPage(meta.currentPage + 1)}
              >
                <Icon name="chevron-right" size={24} color={meta.currentPage >= meta.lastPage ? colors.textSecondary : colors.primary} />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 100, paddingTop: 8 },

  filtersCard: { 
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    gap: 16, 
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  searchBox: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    backgroundColor: '#F0F1F1', 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    height: 50 
  },
  searchInput: { 
    flex: 1, 
    ...typography.body, 
    height: '100%' 
  },
  filterRow: { flexDirection: 'row', gap: 16 },
  filterBox: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    backgroundColor: '#F0F1F1',
    borderRadius: 12, 
    paddingHorizontal: 16, 
    height: 44 
  },
  filterText: { 
    ...typography.small, 
    color: colors.textPrimary, 
    flexShrink: 1 
  },
  clearBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearText: { 
    ...typography.labelMedium, 
    color: '#E97A24',
  },

  listCard: { 
    flex: 1,
    paddingTop: 16,
  },
  listHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 8,
    paddingHorizontal: 20,
  },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listTitle: { 
    fontSize: 18, 
    fontFamily: typography.h2.fontFamily, 
    color: colors.textPrimary 
  },
  countBadge: { 
    backgroundColor: '#E5F1FF', 
    borderRadius: 16, 
    paddingHorizontal: 10, 
    paddingVertical: 4 
  },
  countBadgeText: { 
    ...typography.tiny, 
    color: '#3298D4', 
    fontFamily: typography.labelMedium.fontFamily 
  },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E97A24',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  newRequestBtnText: { 
    color: colors.onAccent, 
    ...typography.labelMedium 
  },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  loadingText: { ...typography.body, color: '#94A3B8' },
  retryBox: { alignItems: 'center', paddingVertical: 40 },
  retryText: { ...typography.labelMedium, color: '#EF4444' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 50 },
  emptyIconBg: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(50,152,212,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 8
  },
  emptyTitle: {
    fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#333'
  },
  emptyText: { ...typography.small, color: '#94A3B8' },

  ticketRow: { 
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  borderBottom: {
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F1F1',
  },
  ticketHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 4 
  },
  ticketId: { 
    ...typography.small, 
    fontFamily: typography.labelMedium.fontFamily, 
    color: '#94A3B8' 
  },
  ticketService: { 
    fontSize: 16, 
    fontFamily: typography.h4.fontFamily, 
    color: '#333', 
    marginBottom: 12 
  },
  ticketFooter: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketMetaText: { ...typography.tiny, color: '#94A3B8' },
  statusBadge: { 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 6 
  },
  statusText: { 
    ...typography.tiny, 
    fontFamily: typography.labelMedium.fontFamily, 
    textTransform: 'uppercase' 
  },

  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F0F1F1', marginTop: 12, paddingHorizontal: 20 },
  pagerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F0F1F1', justifyContent: 'center', alignItems: 'center' },
  pagerBtnDisabled: { opacity: 0.3 },
  pagerText: { ...typography.labelMedium, color: '#333' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 40,
  },
  modalTitle: { 
    fontSize: 18, 
    fontFamily: typography.sectionTitle.fontFamily, 
    color: '#333', 
    padding: 24, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F1F1' 
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F1',
  },
  modalOptionText: { ...typography.body, color: '#333' },
});

export default MyTickets;
