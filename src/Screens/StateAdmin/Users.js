import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import { useStateAdminUsers } from '../../Hooks/StateAdmin/useStateAdminUsers';
import { useStateAdminCustomers } from '../../Hooks/StateAdmin/useStateAdminCustomers';

const CUSTOMER_STATUS_FILTERS = [
  { id: 'all', label: 'All Status' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'none', label: 'No Membership' },
  { id: 'expired', label: 'Expired' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'never', label: 'Never' },
];

const STAFF_STATUS_FILTERS = [
  { id: 'all', label: 'All Status' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
];

function getRoleBadgeStyle(role = '') {
  const r = role.toLowerCase();
  if (r.includes('customer')) {
    return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'Customer' };
  }
  if (r.includes('telecaller')) {
    return { bg: '#F3E8FF', text: '#7E22CE', border: '#DDD6FE', label: 'Telecaller' };
  }
  if (r.includes('field-executive') || r.includes('executive')) {
    return { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0', label: 'Field Executive' };
  }
  if (r.includes('district')) {
    return { bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5', label: 'District Admin' };
  }
  if (r.includes('taluka')) {
    return { bg: '#FEF3C7', text: '#B45309', border: '#FDE68A', label: 'Taluka Admin' };
  }
  if (r === 'rm' || r.includes('relationship')) {
    return { bg: '#ECFEFF', text: '#0E7490', border: '#A5F3FC', label: 'RM' };
  }
  if (r.includes('state-admin') || r.includes('state')) {
    return { bg: '#E0E7FF', text: '#4338CA', border: '#C7D2FE', label: 'State Admin' };
  }
  return { bg: '#F1F5F9', text: '#475569', border: '#E2E8F0', label: role || 'Staff' };
}

function getCustomerMembershipBadge(status, hasActive) {
  if (hasActive || status === 'active') {
    return { label: 'Active', bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  }
  if (status === 'pending') {
    return { label: 'Pending', bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' };
  }
  if (status === 'expired') {
    return { label: 'Expired', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  }
  if (status === 'cancelled') {
    return { label: 'Cancelled', bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  }
  return { label: 'No Membership', bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
}

function UserCard({ user, onPress, isCustomerView }) {
  const initials = (user.name || (isCustomerView ? 'C' : 'U'))
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const isCustomer = isCustomerView || (user.role || '').toLowerCase().includes('customer');
  const membershipBadge = isCustomer
    ? getCustomerMembershipBadge(user.membershipStatus, user.hasActiveMembership)
    : null;
  const roleBadge = getRoleBadgeStyle(user.role);
  const badge = isCustomer ? membershipBadge : roleBadge;

  const cardContent = (
    <View style={styles.cardInner}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>

      <View style={styles.cardHeaderInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name}
          </Text>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: (isCustomer ? (user.hasActiveMembership || user.membershipStatus === 'active') : user.isActive) ? '#10B981' : '#94A3B8' },
            ]}
          />
        </View>

        <View style={styles.metaLine}>
          {user.phone ? (
            <Text style={styles.metaSubText} numberOfLines={1}>
              {user.phone}
            </Text>
          ) : user.email ? (
            <Text style={styles.metaSubText} numberOfLines={1}>
              {user.email}
            </Text>
          ) : null}
        </View>

        {!!(user.location || user.cityName || user.stateName) && (
          <View style={styles.locationLine}>
            <Icon name="location-on" size={11} color="#94A3B8" />
            <Text style={styles.locationSubText} numberOfLines={1}>
              {user.location || [user.cityName, user.stateName].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardRight}>
        <View style={[styles.roleBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[styles.roleBadgeText, { color: badge.text }]}>
            {badge.label}
          </Text>
        </View>
        <Icon name="chevron-right" size={18} color="#CBD5E1" />
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return <View style={styles.card}>{cardContent}</View>;
}

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Role screens that show the title only — no "Manage X accounts..." subtitle.
const NO_SUBTITLE_ROLES = ['district-admin', 'taluka-admin', 'telecaller', 'rm', 'relationship-manager'];

function Users({ navigation, route }) {
  const activeRole = route?.params?.role || 'customer';
  const activeRoleLabel = route?.params?.roleLabel || null;
  const isCustomerRole = activeRole === 'customer';

  const {
    users: staffUsers = [],
    meta: staffMeta = { currentPage: 1, lastPage: 1, total: 0 },
    loading: staffLoading = false,
    loadingMore: staffLoadingMore = false,
    loadUsers,
    loadMore,
  } = useStateAdminUsers();

  const {
    customers: customerList = [],
    meta: customerMeta = { currentPage: 1, lastPage: 1, total: 0 },
    loading: customerLoading = false,
    loadingMore: customerLoadingMore = false,
    loadCustomers,
    loadMore: loadMoreCustomers,
  } = useStateAdminCustomers();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const filterOptions = isCustomerRole ? CUSTOMER_STATUS_FILTERS : STAFF_STATUS_FILTERS;

  // Debounce search input to avoid triggering queries on each keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch customers from GET /api/v1/admin/customers
  const fetchCustomers = useCallback((page = 1) => {
    loadCustomers({
      search: debouncedSearch.trim() || undefined,
      membership_status: selectedStatus !== 'all' ? selectedStatus : undefined,
      page,
    });
  }, [loadCustomers, debouncedSearch, selectedStatus]);

  // Fetch staff users from GET /api/v1/admin/users
  const fetchStaff = useCallback((page = 1) => {
    loadUsers({
      search: debouncedSearch.trim() || undefined,
      role: activeRole,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
      page,
    });
  }, [loadUsers, debouncedSearch, activeRole, selectedStatus]);

  useEffect(() => {
    if (isCustomerRole) {
      fetchCustomers(1);
    }
  }, [isCustomerRole, fetchCustomers]);

  useEffect(() => {
    if (!isCustomerRole) {
      fetchStaff(1);
    }
  }, [isCustomerRole, fetchStaff]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (isCustomerRole) {
      await fetchCustomers(1);
    } else {
      await fetchStaff(1);
    }
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (isCustomerRole) {
      if (customerLoading || customerLoadingMore || customerMeta.currentPage >= customerMeta.lastPage) return;
      loadMoreCustomers({
        search: debouncedSearch.trim() || undefined,
        membership_status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
    } else {
      if (staffLoading || staffLoadingMore || staffMeta.currentPage >= staffMeta.lastPage) return;
      loadMore({
        search: debouncedSearch.trim() || undefined,
        role: activeRole,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
      });
    }
  };

  const dataList = isCustomerRole ? customerList : staffUsers;
  const totalCount = isCustomerRole ? (customerMeta.total || customerList.length) : (staffMeta?.total || staffUsers.length);
  const isLoading = isCustomerRole ? customerLoading : staffLoading;
  const isLoadingMore = isCustomerRole ? customerLoadingMore : staffLoadingMore;

  const headerTitle = isCustomerRole ? 'Customers' : (activeRoleLabel || titleCase(activeRole));
  const hideHeaderSub = NO_SUBTITLE_ROLES.includes(String(activeRole).toLowerCase());

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {!isCustomerRole && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Icon name="chevron-left" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
            {!hideHeaderSub && (
              <Text style={styles.headerSub}>
                {isCustomerRole
                  ? 'Manage customer accounts and access'
                  : `Manage ${headerTitle} accounts and access`}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {totalCount > 0 && (
              <View style={styles.headerCount}>
                <Icon name="people" size={15} color="#FDE68A" />
                <Text style={styles.headerCountText}>{totalCount}</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Search & Filters */}
      <View style={styles.controlsWrap}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder={isCustomerRole ? 'Search customer by name, email or phone...' : 'Search by name, email, or phone...'}
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => (isCustomerRole ? fetchCustomers(1) : fetchStaff(1))}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Filter Chips */}
        <FlatList
          horizontal
          data={filterOptions}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const active = selectedStatus === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedStatus(item.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* List */}
      {isLoading && dataList.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#A64416" />
          <Text style={styles.loadingText}>
            {isCustomerRole ? 'Loading customers...' : 'Loading accounts...'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={dataList}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => {
            const handlePress = isCustomerRole
              ? () => navigation.navigate('CustomerDetail', { customerId: item.id, customer: item })
              : undefined;
            return <UserCard user={item} onPress={handlePress} isCustomerView={isCustomerRole} />;
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#A64416']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            isLoadingMore ? (
              <View style={styles.loadingMoreWrap}>
                <ActivityIndicator size="small" color="#A64416" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="group-off" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>
                {isCustomerRole ? 'No Customers Found' : 'No Accounts Found'}
              </Text>
              <Text style={styles.emptySub}>
                {search
                  ? `No matching records found for "${search}"`
                  : `No ${isCustomerRole ? 'customer' : headerTitle} records match the selected filter.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#20304C',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  // Sits right next to the back button (headerRow's gap: 12 provides the
  // spacing) rather than centered across the whole row.
  headerTextWrap: { flex: 1 },
  // Nudged down a touch so the title's visual (glyph) center lines up with
  // the back button's center — the font's line-box leading otherwise makes
  // the text sit visibly higher than the button next to it.
  headerTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5, marginTop: 3 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerCount: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  headerCountText: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },

  controlsWrap: { paddingHorizontal: 16, paddingTop: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: { flex: 1, fontSize: 13, color: '#0F172A', padding: 0 },
  filterList: { paddingVertical: 12, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#20304C', borderColor: '#20304C' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  filterChipTextActive: { color: '#FFFFFF' },

  listContent: { paddingHorizontal: 16, paddingBottom: 30, paddingTop: 4 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  avatarText: { fontSize: 13, fontWeight: '800', color: '#2563EB' },
  cardHeaderInfo: { flex: 1, marginLeft: 10, marginRight: 8 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 14, fontWeight: '700', color: '#0F172A', maxWidth: '85%' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  metaLine: { flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'nowrap' },
  metaSubText: { fontSize: 11.5, color: '#64748B', fontWeight: '500' },
  locationLine: { flexDirection: 'row', alignItems: 'center', marginTop: 2, gap: 2 },
  locationSubText: { fontSize: 11, color: '#94A3B8', fontWeight: '500' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  roleBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleBadgeText: { fontSize: 10.5, fontWeight: '700' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 13, color: '#64748B', marginTop: 12 },
  loadingMoreWrap: { paddingVertical: 20 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 },
});

export default Users;
