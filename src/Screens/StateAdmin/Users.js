import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { typography, lightColors as baseColors } from '../../theme';
import { useStateAdminUsers } from '../../Hooks/StateAdmin/useStateAdminUsers';

const C = {
  ...baseColors,
  primary: '#20304C',
  accent: '#A64416',
  surface: '#F8FAFC',
  cardBg: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  subText: '#64748B',
  blue: '#2563EB',
  emerald: '#059669',
  purple: '#7C3AED',
  amber: '#D97706',
  red: '#EF4444',
};

const STATUS_FILTERS = [
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

function UserCard({ user, onPress }) {
  const badge = getRoleBadgeStyle(user.role);
  const initials = (user.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(user)} activeOpacity={0.88}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>
              {user.name}
            </Text>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: user.isActive ? '#10B981' : '#94A3B8' },
              ]}
            />
          </View>

          <Text style={styles.userEmail} numberOfLines={1}>
            {user.email || 'No email provided'}
          </Text>
        </View>

        <View style={[styles.roleBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
          <Text style={[styles.roleBadgeText, { color: badge.text }]}>
            {badge.label}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        {!!user.phone && (
          <View style={styles.metaRow}>
            <Icon name="phone" size={14} color="#64748B" />
            <Text style={styles.metaText}>{user.phone}</Text>
          </View>
        )}

        {(user.stateName || user.cityName) && (
          <View style={styles.metaRow}>
            <Icon name="location-on" size={14} color="#64748B" />
            <Text style={styles.metaText}>
              {[user.cityName, user.stateName].filter(Boolean).join(', ')}
            </Text>
          </View>
        )}

        {user.districtIds?.length > 0 && (
          <View style={styles.metaRow}>
            <Icon name="map" size={14} color="#64748B" />
            <Text style={styles.metaText}>
              {user.districtIds.length} Assigned Districts
            </Text>
          </View>
        )}
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.statusPill}>
          <Text
            style={[
              styles.statusPillText,
              { color: user.isActive ? '#059669' : '#64748B' },
            ]}
          >
            {user.isActive ? 'Active Account' : 'Inactive'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Role screens that show the title only — no "Manage X accounts..." subtitle.
const NO_SUBTITLE_ROLES = ['district-admin', 'taluka-admin', 'telecaller', 'rm', 'relationship-manager'];

// Defaults to the Customers tab (role=customer, "Customers" header) when
// opened with no params. Dashboard's Admin Management role chips navigate
// here with { role, roleLabel } instead, filtering to that role and showing
// its label in the header.
function Users({ navigation, route }) {
  const {
    users,
    meta,
    loading,
    loadingMore,
    loadUsers,
    loadMore,
  } = useStateAdminUsers();

  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [activeRole, setActiveRole] = useState(route?.params?.role || 'customer');
  const [activeRoleLabel, setActiveRoleLabel] = useState(route?.params?.roleLabel || null);

  // Re-navigating to an already-mounted Users screen (tapping a different
  // Dashboard role chip) updates params without remounting — keep in sync.
  useEffect(() => {
    const nextRole = route?.params?.role || 'customer';
    if (nextRole !== activeRole) {
      setActiveRole(nextRole);
      setActiveRoleLabel(route?.params?.roleLabel || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.params?.role, route?.params?.roleLabel]);

  const headerTitle = activeRole === 'customer' ? 'Customers' : (activeRoleLabel || titleCase(activeRole));
  const hideHeaderSub = NO_SUBTITLE_ROLES.includes(String(activeRole).toLowerCase());

  const fetchList = useCallback(
    (page = 1) => {
      loadUsers({
        search: search.trim() || undefined,
        role: activeRole,
        status: selectedStatus !== 'all' ? selectedStatus : undefined,
        page,
      });
    },
    [loadUsers, search, activeRole, selectedStatus]
  );

  useEffect(() => {
    fetchList(1);
  }, [fetchList]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchList(1);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    loadMore({
      search: search.trim() || undefined,
      role: activeRole,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
    });
  };

  const stats = useMemo(() => {
    const total = meta?.total || users.length;
    const activeCount = users.filter(u => u.isActive).length;
    const customerCount = users.filter(u => u.role === 'customer').length;
    return { total, activeCount, customerCount };
  }, [users, meta]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {activeRole !== 'customer' && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Icon name="chevron-left" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
            {!hideHeaderSub && (
              <Text style={styles.headerSub}>
                {activeRole === 'customer'
                  ? 'Manage customer accounts and access'
                  : `Manage ${headerTitle} accounts and access`}
              </Text>
            )}
          </View>
          <View style={styles.headerActions}>
            {stats.total > 0 && (
              <View style={styles.headerCount}>
                <Icon name="people" size={15} color="#FDE68A" />
                <Text style={styles.headerCountText}>{stats.total}</Text>
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
            placeholder="Search by name, email, or phone..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchList(1)}
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
          data={STATUS_FILTERS}
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

      {/* Users List */}
      {loading && users.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#A64416" />
          <Text style={styles.loadingText}>Loading accounts...</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <UserCard
              user={item}
              onPress={u => navigation.navigate('UserDetail', { userId: u.id, user: u })}
            />
          )}
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
            loadingMore ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color="#A64416" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="group-off" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Accounts Found</Text>
              <Text style={styles.emptySub}>
                {search
                  ? `No accounts matching "${search}"`
                  : `No ${activeRole === 'customer' ? 'customer' : headerTitle} accounts match the selected filters.`}
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

  listContent: { paddingHorizontal: 16, paddingBottom: 30 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  avatarText: { fontSize: 15, fontWeight: '800', color: '#2563EB' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  statusDot: { width: 7, height: 7, borderRadius: 3.5 },
  userEmail: { fontSize: 12, color: '#64748B', marginTop: 2 },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleBadgeText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: '#F8FAFC', marginVertical: 12 },
  cardBody: { gap: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#475569', fontWeight: '500' },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  statusPill: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillText: { fontSize: 11, fontWeight: '600' },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  loadingText: { fontSize: 13, color: '#64748B', marginTop: 12 },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6, lineHeight: 18 },
});

export default Users;
