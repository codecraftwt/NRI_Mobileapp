import React, { useState } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, TextInput, StatusBar, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useRmCustomers } from '../../Hooks/RM/useRmCustomers';

// Windowed page numbers logic removed as we use infinite scroll now

function MyCustomers({ navigation }) {
  const [search, setSearch] = useState('');
  const { customers, loading, meta, fetchNextPage } = useRmCustomers(search);

  const total = meta?.total || 0;

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
          const membershipColor = cust.membership?.toLowerCase() === 'essential' ? '#0284C7' : '#B45309';
          const membershipBg = cust.membership?.toLowerCase() === 'essential' ? '#E0F2FE' : '#FEF3E7';

          return (
            <TouchableOpacity
              style={styles.listItem}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: cust.id, name: cust.name })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>

              <View style={styles.listItemBody}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.name} numberOfLines={1}>{cust.name}</Text>
                </View>

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
                {cust.openRequests > 0 && (
                  <View style={styles.openBadge}>
                    <Icon name="error-outline" size={12} color="#DC2626" />
                    <Text style={styles.openBadgeText}>{cust.openRequests}</Text>
                  </View>
                )}

                {!!cust.membership && (
                  <View style={[styles.membershipPill, { backgroundColor: membershipBg }]}>
                    <Text style={[styles.membershipText, { color: membershipColor }]} numberOfLines={1}>{cust.membership}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
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
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { marginLeft: 6 },
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

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 8, gap: 12 },
  listItem: {
    width: '100%', padding: 16,
    backgroundColor: '#FFFFFF', borderRadius: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    flexDirection: 'row', alignItems: 'center',
  },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#475569', fontWeight: 'bold' },
  listItemBody: { flex: 1, paddingRight: 10 },
  listItemRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 10 },
  
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', flexShrink: 1 },
  openBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#FEE2E2', borderRadius: 12 },
  openBadgeText: { fontSize: 10, fontWeight: '700', color: '#DC2626' },
  
  sub: { fontSize: 13, color: '#64748B', marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#94A3B8' },
  
  membershipPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  membershipText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, fontWeight: '600' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
});

export default MyCustomers;
