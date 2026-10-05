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
  Modal,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useAdminTickets } from '../../Hooks/Admin/useAdminTickets';

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Tickets' },
  { id: 'new', label: 'New' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'escalated', label: 'Escalated' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'refunded', label: 'Refunded' },
];

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function getStatusMeta(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('complet')) {
    return { label: 'Completed', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: 'check-circle' };
  }
  if (s.includes('refund')) {
    return { label: 'Refunded', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', icon: 'replay' };
  }
  if (s.includes('progress')) {
    return { label: 'In Progress', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', icon: 'sync' };
  }
  if (s.includes('assign')) {
    return { label: 'Assigned', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', icon: 'assignment-ind' };
  }
  if (s === 'new') {
    return { label: 'New', bg: '#F3E8FF', text: '#7E22CE', border: '#DDD6FE', icon: 'fiber-new' };
  }
  if (s.includes('escalat')) {
    return { label: 'Escalated', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', icon: 'warning' };
  }
  if (s.includes('cancel')) {
    return { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', icon: 'cancel' };
  }
  return { label: titleCase(status || 'New'), bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', icon: 'info' };
}



function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Tickets({ navigation }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const { tickets, total, loading, failed, error, fetchNextPage, refresh } = useAdminTickets(search, status);

  const activeStatusOption = STATUS_OPTIONS.find(o => o.id === status);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text style={styles.headerTitle}>Tickets</Text>
            <Text style={styles.headerSub}>Org-wide support & service tickets</Text>
          </View>
          {total > 0 && (
            <View style={styles.headerCount}>
              <Icon name="confirmation-number" size={15} color="#FDE68A" />
              <Text style={styles.headerCountText}>{total}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search Bar + Filter Icon Row */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search ticket #, customer, or phone..."
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
            style={[styles.filterToggleBtn, status !== 'all' && styles.filterToggleBtnActive]}
            activeOpacity={0.8}
            onPress={() => setStatusModalVisible(true)}
          >
            <Icon
              name="tune"
              size={22}
              color={status !== 'all' ? '#FFFFFF' : '#20304C'}
            />
          </TouchableOpacity>
        </View>

        {/* Active Filter Chip when not 'all' */}
        {status !== 'all' && (
          <View style={styles.activeFilterRow}>
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterChipText}>
                Status: {activeStatusOption?.label || titleCase(status)}
              </Text>
              <TouchableOpacity
                onPress={() => setStatus('all')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Icon name="close" size={14} color="#20304C" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {failed && (
        <TouchableOpacity style={styles.errorCard} activeOpacity={0.8} onPress={refresh}>
          <Icon name="error-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>
            {error?.status ? `(${error.status}) ` : ''}
            {error?.message || 'Could not load tickets.'} Tap to retry.
          </Text>
        </TouchableOpacity>
      )}

      {/* Tickets List */}
      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={loading && tickets.length === 0}
            onRefresh={refresh}
            colors={['#20304C']}
            tintColor="#20304C"
          />
        }
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#20304C" />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Tickets Found</Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && tickets.length > 0 ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color="#20304C" />
            </View>
          ) : null
        }
        renderItem={({ item: t }) => {
          const statusMeta = getStatusMeta(t.status);

          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TicketDetail', { ticketId: t.id, ticket: t })}
            >
              {/* Top Row: Ticket Number and Status */}
              <View style={styles.cardTopRow}>
                <Text style={styles.ticketNumber}>{t.ticketNumber}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusMeta.bg, borderColor: statusMeta.border }]}>
                  <Text style={[styles.statusText, { color: statusMeta.text }]}>
                    {t.statusLabel || titleCase(t.status)}
                  </Text>
                </View>
              </View>

              {/* Service Title */}
              <Text style={styles.serviceName} numberOfLines={1}>
                {t.serviceName}
              </Text>

              {/* Bottom Row: Customer Name and Date */}
              <View style={styles.cardBottomRow}>
                <Text style={styles.customerText} numberOfLines={1}>
                  {t.customerName}
                </Text>
                <View style={styles.cardBottomRight}>
                  <Text style={styles.dateText}>{formatDateTime(t.createdAt)}</Text>
                  <Icon name="chevron-right" size={16} color="#CBD5E1" />
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Status Filter Sheet Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable
          style={styles.filterOverlay}
          onPress={() => setStatusModalVisible(false)}
        >
          <Pressable style={styles.filterSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.filterHandleWrap}>
              <View style={styles.filterHandle} />
            </View>

            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter by Status</Text>
              <TouchableOpacity
                onPress={() => setStatusModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={styles.filterCloseBtn}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.filterOptionsList}>
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = status === opt.id;

                return (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterOptionItem,
                      isSelected && styles.filterOptionItemActive,
                    ]}
                    onPress={() => {
                      setStatus(opt.id);
                      setStatusModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterOptionLabel,
                        isSelected && styles.filterOptionLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#20304C',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: {
    fontSize: 24,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  headerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  headerCountText: {
    fontSize: 15,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },

  searchWrap: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    zIndex: 5,
    gap: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: typography.body.fontFamily,
    padding: 0,
  },
  filterToggleBtn: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  filterToggleBtnActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },

  activeFilterRow: {
    flexDirection: 'row',
    paddingTop: 2,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF2F6',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#20304C',
  },

  filterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '75%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  filterHandleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 4,
  },
  filterHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterTitle: {
    fontSize: 17,
    fontFamily: typography.h2.fontFamily,
    color: '#0F172A',
    fontWeight: '800',
  },
  filterCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterOptionsList: {
    marginTop: 8,
  },
  filterOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  filterOptionItemActive: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  filterOptionLabel: {
    fontSize: 15,
    color: '#1E293B',
    fontWeight: '500',
  },
  filterOptionLabelActive: {
    color: '#20304C',
    fontWeight: '700',
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 18 },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 8,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ticketNumber: {
    fontSize: 13,
    fontFamily: typography.h4.fontFamily,
    fontWeight: '800',
    color: '#20304C',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },

  serviceName: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 4,
  },

  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  customerText: {
    fontSize: 12.5,
    color: '#64748B',
    flex: 1,
    paddingRight: 8,
  },
  cardBottomRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },

  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  flex1: {
    flex: 1,
  },
  footerLoader: {
    paddingVertical: 16,
  },
  vendorUnassigned: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});

export default Tickets;
