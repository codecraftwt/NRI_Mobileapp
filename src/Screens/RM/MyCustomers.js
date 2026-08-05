import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useRmCustomers } from '../../Hooks/RM/useRmCustomers';

// Windowed page numbers around the current page (e.g. [1,2,3]).
function pageWindow(current, last, size = 3) {
  let start = Math.max(1, current - Math.floor(size / 2));
  const end = Math.min(last, start + size - 1);
  start = Math.max(1, end - size + 1);
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function MyCustomers({ navigation }) {
  const [search, setSearch] = useState('');
  const { customers, loading, meta, fetchPage } = useRmCustomers(search);

  const currentPage = meta?.currentPage || 1;
  const lastPage = meta?.lastPage || 1;
  const perPage = meta?.perPage || customers.length || 0;
  const total = meta?.total || 0;
  const from = total === 0 ? 0 : (currentPage - 1) * perPage + 1;
  const to = Math.min(currentPage * perPage, total);

  const goToPage = (p) => {
    if (loading || p < 1 || p > lastPage || p === currentPage) return;
    fetchPage(p);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>My Customers</Text>
            <Text style={styles.headerSub}>Your assigned customer book</Text>
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && customers.length === 0 ? (
          <View style={styles.emptyState}><ActivityIndicator size="large" color="#20304C" /></View>
        ) : customers.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Customers Found</Text>
          </View>
        ) : (
          <>
            <View style={styles.grid}>
              {customers.map(cust => (
                <TouchableOpacity
                  key={cust.id}
                  style={styles.card}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('CustomerDetail', { customerId: cust.id, name: cust.name })}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.name} numberOfLines={1}>{cust.name}</Text>
                    {cust.openRequests > 0 && (
                      <View style={styles.openBadge}>
                        <Text style={styles.openBadgeText}>{cust.openRequests}</Text>
                      </View>
                    )}
                  </View>

                  {!!cust.email && <Text style={styles.sub} numberOfLines={1}>{cust.email}</Text>}

                  <View style={styles.metaRow}>
                    <Icon name={cust.location ? 'location-on' : 'phone'} size={12} color="#94A3B8" />
                    <Text style={styles.metaText} numberOfLines={1}>{cust.location || cust.phone || '—'}</Text>
                  </View>

                  {!!cust.membership && (
                    <Text style={styles.membership} numberOfLines={1}>{cust.membership}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Pagination */}
            {!!meta && total > 0 && lastPage > 1 && (
              <View style={styles.pagination}>
                <Text style={styles.pageInfo}>Showing {from} to {to} of {total} results</Text>
                <View style={styles.pageRow}>
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
                    onPress={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    activeOpacity={0.7}
                  >
                    <Icon name="chevron-left" size={18} color={currentPage <= 1 ? '#CBD5E1' : '#475569'} />
                  </TouchableOpacity>
                  {pageWindow(currentPage, lastPage).map(p => {
                    const active = p === currentPage;
                    return (
                      <TouchableOpacity key={p} style={[styles.pageNum, active && styles.pageNumActive]} onPress={() => goToPage(p)} activeOpacity={0.7}>
                        <Text style={[styles.pageNumText, active && styles.pageNumTextActive]}>{p}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={[styles.pageBtn, currentPage >= lastPage && styles.pageBtnDisabled]}
                    onPress={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= lastPage}
                    activeOpacity={0.7}
                  >
                    <Icon name="chevron-right" size={18} color={currentPage >= lastPage ? '#CBD5E1' : '#475569'} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 24, paddingTop: 60, paddingBottom: 42, backgroundColor: '#20304C',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  headerCount: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  headerCountText: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },

  // Floats up so it overlaps the header's rounded bottom edge.
  searchWrap: { paddingHorizontal: 20, marginTop: -26, marginBottom: 8, zIndex: 5 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, height: 52,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 6,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontFamily: typography.body.fontFamily, padding: 0 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%', marginBottom: 14, padding: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 22 },
  name: { flex: 1, fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  sub: { fontSize: 11, color: '#64748B', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  metaText: { fontSize: 11, color: '#94A3B8', flex: 1 },
  membership: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#b45936', marginTop: 10 },
  openBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, backgroundColor: '#FEF3E7', alignItems: 'center', justifyContent: 'center' },
  openBadgeText: { fontSize: 10, fontWeight: '700', color: '#C2410C' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },

  pagination: { alignItems: 'center', gap: 12, marginTop: 8, paddingTop: 8 },
  pageInfo: { fontSize: 13, color: '#64748B' },
  pageRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  pageBtnDisabled: { backgroundColor: '#F8FAFC' },
  pageNum: { minWidth: 36, height: 36, borderRadius: 18, paddingHorizontal: 6, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  pageNumActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  pageNumText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  pageNumTextActive: { color: '#FFFFFF' },
});

export default MyCustomers;
