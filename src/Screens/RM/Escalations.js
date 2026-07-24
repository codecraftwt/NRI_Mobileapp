import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const MOCK = [
  { id: '1', ticket: 'NRI-2026-00012', customer: 'akanksha', issue: 'SLA breached — no executive assigned', priority: 'Critical', raised: '2 days ago', status: 'Open' },
  { id: '2', ticket: 'NRI-2026-00007', customer: 'Pradnya', issue: 'Customer dissatisfied with visit quality', priority: 'High', raised: '5 days ago', status: 'In Review' },
  { id: '3', ticket: 'NRI-2026-00004', customer: 'Test', issue: 'Delayed report submission', priority: 'Medium', raised: '1 week ago', status: 'Resolved' },
];

function priorityBadge(p) {
  if (p === 'Critical') return { bg: '#FEE2E2', color: '#DC2626' };
  if (p === 'High') return { bg: '#FFEDD5', color: '#C2410C' };
  return { bg: '#FEF3C7', color: '#CA8A04' };
}
function statusBadge(s) {
  if (s === 'Resolved') return { bg: '#D1FAE5', color: '#059669' };
  if (s === 'In Review') return { bg: '#DBEAFE', color: '#2563EB' };
  return { bg: '#FEE2E2', color: '#DC2626' };
}

function Escalations({ navigation }) {
  const [activeTab, setActiveTab] = useState('All');
  const tabs = ['All', 'Open', 'In Review', 'Resolved'];
  const filtered = MOCK.filter(e => activeTab === 'All' || e.status === activeTab);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Escalations</Text>
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
        {filtered.map(e => {
          const p = priorityBadge(e.priority);
          const s = statusBadge(e.status);
          return (
            <TouchableOpacity key={e.id} style={styles.card} activeOpacity={0.7} onPress={() => navigation.navigate('TicketDetail', { ticketId: e.id })}>
              <View style={styles.cardTop}>
                <View style={[styles.alertIcon, { backgroundColor: p.bg }]}>
                  <Icon name="priority-high" size={20} color={p.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ticket}>{e.ticket}</Text>
                  <Text style={styles.issue} numberOfLines={2}>{e.issue}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Icon name="person" size={14} color="#94A3B8" />
                  <Text style={styles.metaText}>{e.customer}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Icon name="schedule" size={14} color="#94A3B8" />
                  <Text style={styles.metaText}>{e.raised}</Text>
                </View>
              </View>

              <View style={styles.badgeRow}>
                <View style={[styles.badge, { backgroundColor: p.bg }]}>
                  <Text style={[styles.badgeText, { color: p.color }]}>{e.priority}</Text>
                </View>
                <View style={[styles.badge, { backgroundColor: s.bg }]}>
                  <Text style={[styles.badgeText, { color: s.color }]}>{e.status}</Text>
                </View>
              </View>
            </TouchableOpacity>
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
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  alertIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  ticket: { fontSize: 14, fontWeight: '700', color: '#1E293B', fontFamily: typography.labelMedium.fontFamily },
  issue: { fontSize: 13, color: '#475569', lineHeight: 18, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  metaRow: { flexDirection: 'row', gap: 20 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#64748B' },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
});

export default Escalations;
