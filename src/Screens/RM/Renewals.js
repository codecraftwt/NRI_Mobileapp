import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const MOCK = [
  { id: '1', name: 'Test', plan: 'Membership', expiry: '05 Aug 2026', daysLeft: 12, urgency: 'soon' },
  { id: '2', name: 'akanksha', plan: 'Care Plus', expiry: '28 Jul 2026', daysLeft: 4, urgency: 'urgent' },
  { id: '3', name: 'Pradnya', plan: 'Membership', expiry: '15 Sep 2026', daysLeft: 53, urgency: 'later' },
];

function badge(u) {
  if (u === 'urgent') return { bg: '#FEE2E2', color: '#DC2626', label: 'Urgent' };
  if (u === 'soon') return { bg: '#FEF3C7', color: '#CA8A04', label: 'Due Soon' };
  return { bg: '#D1FAE5', color: '#059669', label: 'Upcoming' };
}

function Renewals({ navigation }) {
  const [activeTab, setActiveTab] = useState('All');
  const tabs = ['All', 'Urgent', 'Due Soon', 'Upcoming'];
  const filtered = MOCK.filter(r => activeTab === 'All' || badge(r.urgency).label === activeTab);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Renewals</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {tabs.map(tab => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity key={tab} style={[styles.tab, isActive && styles.tabActive]} onPress={() => setActiveTab(tab)} activeOpacity={0.7}>
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {filtered.map(r => {
          const b = badge(r.urgency);
          return (
            <View key={r.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{r.name.charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.name}</Text>
                  <Text style={styles.plan}>{r.plan}</Text>
                </View>
                <View style={[styles.pill, { backgroundColor: b.bg }]}>
                  <Text style={[styles.pillText, { color: b.color }]}>{b.label}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.cardBottom}>
                <View style={styles.metaItem}>
                  <Icon name="event" size={15} color="#94A3B8" />
                  <Text style={styles.metaText}>Expires {r.expiry}</Text>
                </View>
                <Text style={[styles.daysLeft, { color: b.color }]}>{r.daysLeft} days left</Text>
              </View>
              <TouchableOpacity style={styles.remindBtn} activeOpacity={0.8}>
                <Icon name="notifications-active" size={16} color="#D94625" />
                <Text style={styles.remindText}>Send Renewal Reminder</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#FFFFFF' },

  tabsContainer: { paddingTop: 16, paddingBottom: 8 },
  tabsScroll: { paddingHorizontal: 20, gap: 10 },
  tab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  tabActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 8, gap: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontFamily: typography.h2.fontFamily },
  name: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  plan: { fontSize: 12, color: '#64748B', marginTop: 2 },
  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748B' },
  daysLeft: { fontSize: 13, fontWeight: '700' },
  remindBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FFF3EE', borderRadius: 12, paddingVertical: 12, marginTop: 14, borderWidth: 1, borderColor: '#FCE3D8' },
  remindText: { fontSize: 13, fontWeight: '700', color: '#D94625' },
});

export default Renewals;
