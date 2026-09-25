import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useAdminVendors } from '../../Hooks/Admin/useAdminVendors';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function statusBadge(status) {
  const s = String(status || '').toLowerCase();
  if (['active', 'approved', 'verified'].includes(s)) return { bg: '#ECFDF5', color: '#059669' };
  if (['pending', 'pending_verification', 'under_review'].includes(s)) return { bg: '#FFFBEB', color: '#B45309' };
  if (['suspended', 'rejected', 'blocked', 'inactive'].includes(s)) return { bg: '#FEF2F2', color: '#DC2626' };
  return { bg: '#F8FAFC', color: '#64748B' };
}

function Vendors() {
  const [search, setSearch] = useState('');
  const { vendors, loading, failed, error, meta, fetchNextPage, refresh } = useAdminVendors(search);

  const total = meta?.total || 0;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Vendors</Text>
            <Text style={styles.headerSub}>Org-wide vendor list</Text>
          </View>
          {total > 0 && (
            <View style={styles.headerCount}>
              <Icon name="engineering" size={15} color="#FDE68A" />
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
      </View>

      {failed && (
        <TouchableOpacity style={styles.errorCard} activeOpacity={0.8} onPress={refresh}>
          <Icon name="error-outline" size={20} color="#DC2626" />
          <Text style={styles.errorText}>
            {error?.status ? `(${error.status}) ` : ''}{error?.message || 'Could not load vendors.'} Tap to retry.
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={vendors}
        keyExtractor={v => String(v.id)}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onEndReached={fetchNextPage}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}><ActivityIndicator size="large" color="#20304C" /></View>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="engineering" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Vendors Found</Text>
            </View>
          )
        }
        ListFooterComponent={
          loading && vendors.length > 0 ? (
            <View style={{ paddingVertical: 16 }}><ActivityIndicator size="small" color="#20304C" /></View>
          ) : null
        }
        renderItem={({ item: vendor }) => {
          const initials = (vendor.businessName || 'V').substring(0, 2).toUpperCase();
          const badge = statusBadge(vendor.status);

          return (
            <View style={styles.listItem}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={styles.listItemBody}>
                <Text style={styles.name} numberOfLines={1}>{vendor.businessName}</Text>
                {!!vendor.ownerName && <Text style={styles.sub} numberOfLines={1}>{vendor.ownerName}</Text>}
                <View style={styles.metaRow}>
                  {!!vendor.location && (
                    <View style={styles.metaItem}>
                      <Icon name="location-on" size={13} color="#94A3B8" />
                      <Text style={styles.metaText} numberOfLines={1}>{vendor.location}</Text>
                    </View>
                  )}
                  {!!vendor.phone && !vendor.location && (
                    <View style={styles.metaItem}>
                      <Icon name="phone" size={13} color="#94A3B8" />
                      <Text style={styles.metaText} numberOfLines={1}>{vendor.phone}</Text>
                    </View>
                  )}
                  {!!vendor.vendorType && (
                    <View style={styles.metaItem}>
                      <Icon name="category" size={13} color="#94A3B8" />
                      <Text style={styles.metaText} numberOfLines={1}>{titleCase(vendor.vendorType)}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.listItemRight}>
                {!!vendor.status && (
                  <View style={[styles.statusPill, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.color }]} numberOfLines={1}>{titleCase(vendor.status)}</Text>
                  </View>
                )}
                {vendor.rating != null && (
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={13} color="#F59E0B" />
                    <Text style={styles.ratingText}>{vendor.rating.toFixed(1)}</Text>
                  </View>
                )}
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

  searchWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, zIndex: 5 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontFamily: typography.body.fontFamily, padding: 0 },

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
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#F5F3FF', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#6D28D9', fontWeight: '800' },
  listItemBody: { flex: 1, paddingRight: 12 },
  listItemRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 6 },

  name: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A', flexShrink: 1, letterSpacing: -0.2 },
  sub: { fontSize: 12, color: '#475569', marginTop: 2, marginBottom: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11.5, color: '#64748B' },

  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9 },
  statusText: { fontSize: 10.5, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700', letterSpacing: 0.2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 11.5, color: '#334155', fontWeight: '700' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
});

export default Vendors;
