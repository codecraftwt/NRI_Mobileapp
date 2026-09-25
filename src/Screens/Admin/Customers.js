import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useAdminCustomers } from '../../Hooks/Admin/useAdminCustomers';

const FILTERS = [
  { id: '', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'pending', label: 'Pending' },
  { id: 'none', label: 'No Membership' },
];

function membershipBadge(status) {
  switch (status) {
    case 'active': return { label: 'Active', bg: '#ECFDF5', color: '#059669' };
    case 'pending': return { label: 'Pending', bg: '#FFFBEB', color: '#B45309' };
    default: return { label: 'No Membership', bg: '#F8FAFC', color: '#64748B' };
  }
}

function Customers() {
  const [search, setSearch] = useState('');
  const [membershipStatus, setMembershipStatus] = useState('');
  const [nriCountry, setNriCountry] = useState('');
  const { customers, loading, failed, error, meta, fetchNextPage, refresh } = useAdminCustomers(search, membershipStatus, nriCountry);

  const total = meta?.total || 0;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Customers</Text>
            <Text style={styles.headerSub}>Org-wide customer list</Text>
          </View>
          {total > 0 && (
            <View style={styles.headerCount}>
              <Icon name="groups" size={15} color="#FDE68A" />
              <Text style={styles.headerCountText}>{total}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search name, email or phone..."
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

        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={f => f.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => {
            const active = membershipStatus === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setMembershipStatus(item.id)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {failed && (
        <TouchableOpacity style={styles.errorCard} activeOpacity={0.8} onPress={refresh}>
          <Icon name="error-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>
            {error?.status ? `(${error.status}) ` : ''}{error?.message || 'Could not load customers.'} Tap to retry.
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={customers}
        keyExtractor={c => String(c.id)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}><ActivityIndicator size="large" color="#20304C" /></View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="people-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Customers Found</Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && customers.length > 0 ? (
            <View style={{ paddingVertical: 16 }}><ActivityIndicator size="small" color="#20304C" /></View>
          ) : null
        }
        renderItem={({ item: cust }) => {
          const initials = (cust.name || 'C').substring(0, 2).toUpperCase();
          const badge = membershipBadge(cust.membershipStatus);

          return (
            <View style={styles.listItem}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={styles.listItemBody}>
                <Text style={styles.name} numberOfLines={1}>{cust.name}</Text>
                {!!cust.email && <Text style={styles.sub} numberOfLines={1}>{cust.email}</Text>}
                <View style={styles.metaRow}>
                  {!!cust.location && (
                    <View style={styles.metaItem}>
                      <Icon name="location-on" size={13} color="#94A3B8" />
                      <Text style={styles.metaText} numberOfLines={1}>{cust.location}</Text>
                    </View>
                  )}
                  {!!cust.phone && !cust.location && (
                    <View style={styles.metaItem}>
                      <Icon name="phone" size={13} color="#94A3B8" />
                      <Text style={styles.metaText} numberOfLines={1}>{cust.phone}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.listItemRight}>
                <View style={[styles.membershipPill, { backgroundColor: badge.bg }]}>
                  <Text style={[styles.membershipText, { color: badge.color }]} numberOfLines={1}>{badge.label}</Text>
                </View>
                {!!cust.plan && <Text style={styles.planText} numberOfLines={1}>{cust.plan}</Text>}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  headerCount: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  headerCountText: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },

  searchWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, zIndex: 5, gap: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontFamily: typography.body.fontFamily, padding: 0 },

  filterRow: { gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipActive: { backgroundColor: '#20304C', borderColor: '#20304C' },
  filterChipText: { fontSize: 12.5, fontWeight: '600', color: '#475569' },
  filterChipTextActive: { color: '#FFFFFF' },

  errorCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FEF2F2', borderRadius: 16, padding: 14, marginHorizontal: 20, marginBottom: 8,
    borderWidth: 1, borderColor: '#FECACA',
  },
  errorText: { flex: 1, fontSize: 13, color: '#DC2626', lineHeight: 18 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 8, gap: 10 },
  listItem: {
    width: '100%', padding: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#475569', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#4338CA', fontWeight: '800' },
  listItemBody: { flex: 1, paddingRight: 12 },
  listItemRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 6 },

  name: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A', flexShrink: 1, letterSpacing: -0.2 },
  sub: { fontSize: 12, color: '#475569', marginTop: 2, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11.5, color: '#64748B' },

  membershipPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
  membershipText: { fontSize: 10.5, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700', letterSpacing: 0.2 },
  planText: { fontSize: 11, color: '#94A3B8' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
});

export default Customers;
