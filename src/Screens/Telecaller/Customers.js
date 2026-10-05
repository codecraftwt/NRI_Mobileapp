import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  FlatList,
  Modal,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { getTelecallerCustomers } from '../../Api/Telecaller/telecallerCustomersApi';

const MEMBERSHIP_OPTIONS = [
  { id: 'all', label: 'All Memberships' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'none', label: 'No Membership' },
  { id: 'expired', label: 'Expired' },
  { id: 'cancelled', label: 'Cancelled' },
];

function getMembershipBadge(status, hasActive) {
  if (hasActive || status === 'active') {
    return { label: 'Active', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  }
  if (status === 'pending') {
    return { label: 'Pending', bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  }
  if (status === 'expired' || status === 'cancelled') {
    return { label: status === 'expired' ? 'Expired' : 'Cancelled', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  }
  return { label: 'No Plan', bg: '#F1F5F9', text: '#64748B', border: '#E2E8F0' };
}

function Customers({ navigation }) {
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [membershipStatus, setMembershipStatus] = useState('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [nriCountry, setNriCountry] = useState('');

  // Filter Modal
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempMembershipStatus, setTempMembershipStatus] = useState('all');
  const [tempMineOnly, setTempMineOnly] = useState(false);
  const [tempNriCountry, setTempNriCountry] = useState('');

  // Data State
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const searchTimer = useRef(null);

  const activeFilterCount =
    (membershipStatus !== 'all' ? 1 : 0) +
    (mineOnly ? 1 : 0) +
    (nriCountry.trim() ? 1 : 0);

  const fetchCustomers = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      setError(null);

      const res = await getTelecallerCustomers({
        search: searchQuery || undefined,
        membership_status: membershipStatus !== 'all' ? membershipStatus : undefined,
        mine: mineOnly ? true : undefined,
        nri_country: nriCountry.trim() || undefined,
        page: pageNum,
      });

      if (pageNum === 1) {
        setCustomers(res.customers || []);
      } else {
        setCustomers(prev => [...prev, ...(res.customers || [])]);
      }

      setPage(res.meta?.currentPage || 1);
      setLastPage(res.meta?.lastPage || 1);
      setTotalCustomers(res.meta?.total || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load customers');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [searchQuery, membershipStatus, mineOnly, nriCountry]);

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCustomers(1, true);
  }, [fetchCustomers]);

  const onEndReached = () => {
    if (!loading && !loadingMore && page < lastPage) {
      setLoadingMore(true);
      fetchCustomers(page + 1);
    }
  };

  const handleSearchChange = (text) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(text);
    }, 400);
  };

  const clearSearch = () => {
    setSearch('');
    setSearchQuery('');
  };

  const openFilterModal = () => {
    setTempMembershipStatus(membershipStatus);
    setTempMineOnly(mineOnly);
    setTempNriCountry(nriCountry);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setMembershipStatus(tempMembershipStatus);
    setMineOnly(tempMineOnly);
    setNriCountry(tempNriCountry);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempMembershipStatus('all');
    setTempMineOnly(false);
    setTempNriCountry('');
    setMembershipStatus('all');
    setMineOnly(false);
    setNriCountry('');
    setFilterModalVisible(false);
  };

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const renderCustomerCard = ({ item }) => {
    const initials = (item.name || 'C').substring(0, 2).toUpperCase();
    const badge = getMembershipBadge(item.membershipStatus, item.hasActiveMembership);
    const location = [item.city, item.nriCountry || item.country].filter(Boolean).join(', ');

    return (
      <TouchableOpacity
        style={styles.customerCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('CustomerDetail', { customerId: item.id, customer: item })}
      >
        {/* Card Header: Avatar, Name/Email, Status Badge */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {item.name || item.email || 'Customer'}
            </Text>

            {item.name && item.email && item.name !== item.email ? (
              <Text style={styles.emailSubtext} numberOfLines={1}>{item.email}</Text>
            ) : null}
          </View>

          {/* Membership Badge */}
          <View style={[styles.membershipBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
            <Text style={[styles.membershipBadgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>

        {/* Footer: Location on left, Call action on right */}
        <View style={styles.cardFooter}>
          <View style={styles.metaLeft}>
            {location ? (
              <View style={styles.locationWrap}>
                <Icon name="location-on" size={13} color="#64748B" />
                <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
              </View>
            ) : (
              <View style={{ flex: 1 }} />
            )}
          </View>

          {item.phone ? (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCall(item.phone)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon name="phone" size={12} color="#059669" />
              <Text style={styles.callButtonText}>{item.phone}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Customers</Text>
          {totalCustomers > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{totalCustomers} total</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitle}>Customers in your assigned service area</Text>
      </View>

      {/* Search Bar + Filter Icon */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search name, email, phone..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearSearchBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterToggleBtn, activeFilterCount > 0 && styles.filterToggleBtnActive]}
            activeOpacity={0.8}
            onPress={openFilterModal}
          >
            <Icon
              name="tune"
              size={22}
              color={activeFilterCount > 0 ? '#FFFFFF' : '#20304C'}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersRow}>
            {membershipStatus !== 'all' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>
                  Plan: {MEMBERSHIP_OPTIONS.find(m => m.id === membershipStatus)?.label || membershipStatus}
                </Text>
                <TouchableOpacity onPress={() => setMembershipStatus('all')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {mineOnly && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>Assigned to Me</Text>
                <TouchableOpacity onPress={() => setMineOnly(false)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {nriCountry.trim() !== '' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>Country: {nriCountry}</Text>
                <TouchableOpacity onPress={() => setNriCountry('')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={resetFilters} style={styles.clearAllFiltersBtn}>
              <Text style={styles.clearAllFiltersText}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Customers List */}
      <View style={styles.listContainer}>
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#A64416" />
            <Text style={styles.loadingText}>Loading customers...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerEmpty}>
            <Icon name="error-outline" size={40} color="#DC2626" />
            <Text style={styles.errorTitle}>Could not load customers</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchCustomers(1)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : customers.length === 0 ? (
          <View style={styles.centerEmpty}>
            <Icon name="groups" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No customers found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || activeFilterCount > 0
                ? 'Try adjusting your search keywords or filter criteria.'
                : 'There are no customers in your assigned area.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={customers}
            keyExtractor={item => String(item.id)}
            renderItem={renderCustomerCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#A64416" style={{ marginVertical: 16 }} /> : null}
          />
        )}
      </View>

      {/* Filter Bottom Sheet Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModalVisible(false)}>
          <Pressable style={styles.filterSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.filterHandleWrap}>
              <View style={styles.filterHandle} />
            </View>

            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Customers</Text>
              <TouchableOpacity onPress={resetFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.filterResetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Quick Toggle: Assigned to Me */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Assignment</Text>
                <TouchableOpacity
                  style={[styles.toggleChip, tempMineOnly && styles.toggleChipActive]}
                  onPress={() => setTempMineOnly(prev => !prev)}
                  activeOpacity={0.7}
                >
                  <Icon name="verified-user" size={16} color={tempMineOnly ? '#FFFFFF' : '#64748B'} />
                  <Text style={[styles.toggleChipText, tempMineOnly && styles.toggleChipTextActive]}>
                    Assigned to Me Only
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Membership Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Membership Status</Text>
                <View style={styles.optionsWrap}>
                  {MEMBERSHIP_OPTIONS.map(opt => {
                    const isSelected = tempMembershipStatus === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.optionPill, isSelected && styles.optionPillActive]}
                        onPress={() => setTempMembershipStatus(opt.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.optionPillText, isSelected && styles.optionPillTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* NRI Country Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>NRI Country</Text>
                <TextInput
                  style={styles.filterTextInput}
                  placeholder="e.g. United States, UAE, UK..."
                  placeholderTextColor="#94A3B8"
                  value={tempNriCountry}
                  onChangeText={setTempNriCountry}
                />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },

  blueHeader: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#20304C',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  totalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: '#FDFBF7',
    gap: 8,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  filterToggleBtnActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#A64416',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  activeFiltersRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  activeFilterPillText: {
    fontSize: 11,
    color: '#20304C',
    fontWeight: '600',
  },
  clearAllFiltersBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllFiltersText: {
    fontSize: 11,
    color: '#A64416',
    fontWeight: '700',
  },

  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 90,
    gap: 8,
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  centerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 10,
  },
  errorSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  retryButton: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#A64416',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Customer Card
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#20304C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'wrap',
  },
  customerName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  emailSubtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  membershipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  membershipBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
  },

  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  filterHandleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterResetText: {
    fontSize: 13,
    color: '#A64416',
    fontWeight: '700',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    alignSelf: 'flex-start',
  },
  toggleChipActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  toggleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  toggleChipTextActive: {
    color: '#FFFFFF',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  optionPillActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  optionPillTextActive: {
    color: '#FFFFFF',
  },
  filterTextInput: {
    height: 42,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0F172A',
  },
  applyBtn: {
    backgroundColor: '#20304C',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default Customers;
