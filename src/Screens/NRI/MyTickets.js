import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, FlatList, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useMyTickets } from '../../Hooks/useMyTickets';

const STATUS_OPTIONS = ['All Statuses', 'New', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];
const URGENCY_OPTIONS = ['Any Urgency', 'Standard', 'Express', 'Emergency'];

function getStatusColor(statusLabel) {
  switch (statusLabel) {
    case 'New': return { bg: '#E5F1FF', text: '#007AFF' };
    case 'Assigned': return { bg: '#FFF3E0', text: '#FF9800' };
    case 'In Progress': return { bg: '#E8F5E9', text: '#4CAF50' };
    case 'Completed': return { bg: '#F3E5F5', text: '#9C27B0' };
    case 'Cancelled': return { bg: '#FEE2E2', text: '#EF4444' };
    default: return { bg: '#F3F4F6', text: '#6B7280' };
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
        <Icon name="keyboard-arrow-down" size={18} color="#6B7280" />
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
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color="#007AFF" />}
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
      <Header navigation={navigation} title="My Tickets" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <View style={styles.filterRow}>
            <FilterField label="Status" value={statusFilter} options={STATUS_OPTIONS} onSelect={setStatusFilter} />
            <FilterField label="Urgency" value={urgencyFilter} options={URGENCY_OPTIONS} onSelect={setUrgencyFilter} />
          </View>
          {hasFilters && (
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearText}>Clear</Text>
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
            </View>
            <TouchableOpacity
              style={styles.newRequestBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CreateTicket')}
            >
              <Icon name="add-circle" size={16} color="#fff" />
              <Text style={styles.newRequestBtnText}>New Request</Text>
            </TouchableOpacity>
          </View>

          {loading && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Loading your requests…</Text>
            </View>
          )}
          {failed && (
            <TouchableOpacity style={styles.retryBox} onPress={retry}>
              <Text style={styles.retryText}>Couldn't load your requests. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          {!loading && !failed && filteredTickets.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="assignment-late" size={36} color="#CBD5E1" />
              <Text style={styles.emptyText}>{tickets.length === 0 ? 'No service requests yet.' : 'No requests match your filters.'}</Text>
            </View>
          )}

          {filteredTickets.map(ticket => {
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
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
                  >
                    <Icon name="visibility" size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.ticketService}>{ticket.serviceName}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.urgencyBadge}>
                    <Text style={styles.urgencyText}>{getUrgencyLabel(ticket.urgency)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>{ticket.statusLabel}</Text>
                  </View>
                </View>
                <View style={styles.ticketFooter}>
                  <View style={styles.ticketMeta}>
                    <Icon name="person" size={13} color="#999" />
                    <Text style={styles.ticketMetaText}>{ticket.vendorName || 'Pending'}</Text>
                  </View>
                  <View style={styles.ticketMeta}>
                    <Icon name="calendar-today" size={13} color="#999" />
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
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  filtersCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B', height: '100%' },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterBox: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 42 },
  filterText: { fontSize: 12.5, color: '#374151', flexShrink: 1 },
  clearText: { fontSize: 12.5, color: '#374151', fontWeight: '600', textDecorationLine: 'underline', alignSelf: 'flex-end' },

  listCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  countBadge: { backgroundColor: '#E5F1FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { fontSize: 11.5, color: '#007AFF', fontWeight: '700' },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newRequestBtnText: { color: '#fff', fontSize: 12.5, fontWeight: '700' },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  retryBox: { alignItems: 'center', paddingVertical: 16 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 30 },
  emptyText: { fontSize: 13, color: '#9CA3AF' },

  ticketRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  ticketHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  eyeBtn: { padding: 2 },
  ticketId: { fontSize: 13, fontWeight: '700', color: '#007AFF' },
  urgencyBadge: { backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  urgencyText: { fontSize: 10, fontWeight: 'bold', color: '#6B7280' },
  ticketService: { fontSize: 14.5, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ticketMetaText: { fontSize: 12, color: '#666' },
  ticketFooter: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold' },

  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingTop: 14 },
  pagerBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB' },
  pagerBtnDisabled: { opacity: 0.5 },
  pagerText: { fontSize: 12.5, color: '#374151', fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '60%',
    paddingBottom: 20,
  },
  modalTitle: { fontSize: 14, fontWeight: '700', color: '#333', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  modalOptionText: { fontSize: 14, color: '#111827' },
});

export default MyTickets;
