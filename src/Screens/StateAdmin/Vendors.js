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
import { useStateAdminVendors } from '../../Hooks/StateAdmin/useStateAdminVendors';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'verified'].includes(s)) return { bg: '#ECFDF5', color: '#059669', border: '#A7F3D0' };
  if (['pending', 'pending_verification', 'under_review'].includes(s)) return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A' };
  if (['suspended', 'rejected', 'blocked', 'inactive'].includes(s)) return { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' };
  return { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0' };
}

const STATUS_FILTERS = [
  { id: 'all', label: 'All Status' },
  { id: 'pending', label: 'Pending' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' },
  { id: 'under_review', label: 'Under Review' },
];

function Vendors({ navigation }) {
  const {
    vendors,
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
  } = useStateAdminVendors();

  const [refreshing, setRefreshing] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const total = meta?.total || vendors.length;
  const activeStatusLabel = STATUS_FILTERS.find(f => f.id === filterStatus)?.label || 'All Status';

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
            <Text style={styles.headerTitle}>Vendors</Text>
            <Text style={styles.headerSub}>State & Geo Coverage Roster</Text>
          </View>
          <View style={styles.headerActions}>
            {total > 0 && (
              <View style={styles.headerCount}>
                <Icon name="engineering" size={15} color="#FDE68A" />
                <Text style={styles.headerCountText}>{total}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.body}>
        {/* Search Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search business, owner, email or phone..."
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
              {error?.message || 'Could not load vendors.'} Tap to retry.
            </Text>
          </TouchableOpacity>
        )}

        <FlatList
          data={vendors}
          keyExtractor={v => String(v.id || v.businessName)}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onEndReached={fetchNextPage}
          onEndReachedThreshold={0.4}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color="#A64416" />
                <Text style={styles.emptySub}>Loading vendors...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="engineering" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Vendors Found</Text>
                <Text style={styles.emptySub}>
                  {search ? 'Try adjusting your search query' : 'No vendors registered in your assigned jurisdiction'}
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
          renderItem={({ item: vendor }) => {
            const initials = (vendor.businessName || 'V').substring(0, 2).toUpperCase();
            const badge = statusBadge(vendor.status);

            return (
              <TouchableOpacity
                style={styles.listItem}
                activeOpacity={0.7}
                onPress={() => navigation?.navigate('VendorDetail', { vendor })}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{initials}</Text>
                  </View>

                  <View style={styles.listItemBody}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>{vendor.businessName}</Text>
                    </View>
                    {!!vendor.ownerName && (
                      <Text style={styles.sub} numberOfLines={1}>Owner: {vendor.ownerName}</Text>
                    )}
                  </View>

                  <View style={styles.topRightCol}>
                    <View style={[styles.statusPill, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                      <Text style={[styles.statusText, { color: badge.color }]} numberOfLines={1}>
                        {vendor.statusLabel || titleCase(vendor.status)}
                      </Text>
                    </View>
                    <Icon name="chevron-right" size={20} color="#94A3B8" style={{ marginTop: 4, alignSelf: 'flex-end' }} />
                  </View>
                </View>

                {/* Info & Metadata */}
                <View style={styles.metaRow}>
                  {!!vendor.location && (
                    <View style={styles.metaItem}>
                      <Icon name="place" size={13} color="#64748B" />
                      <Text style={styles.metaText} numberOfLines={1}>{vendor.location}</Text>
                    </View>
                  )}
                  {!!vendor.phone && (
                    <View style={styles.metaItem}>
                      <Icon name="phone" size={13} color="#64748B" />
                      <Text style={styles.metaText} numberOfLines={1}>{vendor.phone}</Text>
                    </View>
                  )}
                  {!!vendor.vendorType && (
                    <View style={styles.metaItem}>
                      <Icon name="category" size={13} color="#64748B" />
                      <Text style={styles.metaText} numberOfLines={1}>{titleCase(vendor.vendorType)}</Text>
                    </View>
                  )}
                </View>

                {/* Footer Metrics */}
                <View style={styles.cardFooter}>
                  <View style={styles.jobStatsRow}>
                    <Text style={styles.jobStatText}>
                      <Text style={styles.jobStatBold}>{vendor.totalJobs || 0}</Text> Total Jobs
                    </Text>
                    {vendor.activeJobs > 0 && (
                      <>
                        <Text style={styles.jobStatDot}>•</Text>
                        <Text style={[styles.jobStatText, { color: '#0369A1' }]}>
                          <Text style={styles.jobStatBold}>{vendor.activeJobs}</Text> Active
                        </Text>
                      </>
                    )}
                  </View>

                  {vendor.rating != null && (
                    <View style={styles.ratingRow}>
                      <Icon name="star" size={14} color="#F59E0B" />
                      <Text style={styles.ratingText}>{Number(vendor.rating).toFixed(1)}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Status Filter Sheet */}
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
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={styles.filterOptionRow}
                    activeOpacity={0.7}
                    onPress={() => { setFilterStatus(f.id); setStatusModalVisible(false); }}
                  >
                    <Text style={[styles.filterOptionText, active && styles.filterOptionTextActive]}>
                      {f.label}
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

  body: {
    flex: 1, backgroundColor: '#FDFBF7',
    paddingTop: 8,
  },

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

  scrollContent: { paddingHorizontal: 16, paddingBottom: 110, gap: 10 },

  listItem: {
    backgroundColor: '#FFFFFF', borderRadius: 15, padding: 13,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 1,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#FFF7ED', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#FFEDD5',
  },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#C2410C' },
  listItemBody: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14.5, fontWeight: '700', color: '#0F172A', flexShrink: 1 },
  sub: { fontSize: 11.5, color: '#64748B', marginTop: 1 },

  topRightCol: { alignItems: 'flex-end' },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 9.5, fontWeight: '700' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11.5, color: '#64748B' },

  cardFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F8FAFC',
  },
  jobStatsRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  jobStatText: { fontSize: 11.5, color: '#64748B' },
  jobStatBold: { fontWeight: '700', color: '#0F172A' },
  jobStatDot: { fontSize: 11, color: '#CBD5E1' },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 6 },
  ratingText: { fontSize: 11.5, fontWeight: '700', color: '#B45309' },

  emptyState: { paddingVertical: 50, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptySub: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 24 },
});

export default Vendors;
