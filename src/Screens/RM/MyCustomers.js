import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const MOCK_CUSTOMERS = [
  { id: '1', name: 'Test', email: 'veratol241@jobraux.com', location: 'Acalanes Ridge, United States', plan: 'Membership', status: 'Active' },
  { id: '2', name: 'Pradnya', email: 'pradnyab@walstargroup.org', location: 'California City, United States', plan: 'Membership', status: 'Active' },
  { id: '3', name: 'akanksha', email: 'akanksha.n@gmail.com', location: 'New Jersey, United States', plan: 'Care Plus', status: 'Active' },
  { id: '4', name: 'Rohit Mehta', email: 'rohit.mehta@outlook.com', location: 'London, United Kingdom', plan: 'Membership', status: 'Inactive' },
];

function MyCustomers({ navigation }) {
  const [activeTab, setActiveTab] = useState('All');
  const [search, setSearch] = useState('');

  const tabs = [
    { key: 'All', label: 'All' },
    { key: 'Active', label: 'Active' },
    { key: 'Inactive', label: 'Inactive' },
  ];

  const getCount = (key) => key === 'All' ? MOCK_CUSTOMERS.length : MOCK_CUSTOMERS.filter(c => c.status === key).length;

  const filtered = MOCK_CUSTOMERS
    .filter(c => activeTab === 'All' || c.status === activeTab)
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Customers</Text>
        <Text style={styles.headerSub}>{MOCK_CUSTOMERS.length} assigned customers</Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity key={tab.key} style={[styles.tab, isActive && styles.tabActive]} onPress={() => setActiveTab(tab.key)} activeOpacity={0.7}>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
                <View style={[styles.tabCount, isActive && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, isActive && styles.tabCountTextActive]}>{getCount(tab.key)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="people-outline" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Customers Found</Text>
          </View>
        ) : (
          filtered.map(cust => (
            <TouchableOpacity
              key={cust.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('CustomerDetail', { customerId: cust.id, name: cust.name })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{cust.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{cust.name}</Text>
                <Text style={styles.sub} numberOfLines={1}>{cust.email}</Text>
                <View style={styles.metaRow}>
                  <Icon name="location-on" size={13} color="#94A3B8" />
                  <Text style={styles.metaText} numberOfLines={1}>{cust.location}</Text>
                </View>
              </View>
              <View style={styles.rightCol}>
                <View style={[styles.pill, { backgroundColor: '#EEF2FF' }]}>
                  <Text style={[styles.pillText, { color: '#6366F1' }]}>{cust.plan}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#CBD5E1" />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  searchWrap: { paddingHorizontal: 20, marginTop: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, height: 48,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', fontFamily: typography.body.fontFamily },

  tabsContainer: { paddingTop: 16, paddingBottom: 12 },
  tabsScroll: { paddingHorizontal: 20, gap: 12 },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24,
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
  },
  tabActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  tabCount: { backgroundColor: '#F1F5F9', borderRadius: 10, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  tabCountTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 4, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { color: '#FFFFFF', fontSize: 18, fontFamily: typography.h2.fontFamily },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  sub: { fontSize: 12, color: '#64748B' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { fontSize: 11, color: '#94A3B8', flex: 1 },
  rightCol: { alignItems: 'flex-end', gap: 8 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '700' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
});

export default MyCustomers;
