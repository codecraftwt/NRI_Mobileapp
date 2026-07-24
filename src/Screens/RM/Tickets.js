import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const MOCK_TICKETS = [
  { id: '1', ticket: 'NRI-2026-00011', customer: 'akanksha', service: 'Scheduled Home Visits by Care Executive', sla: 'Overdue 6 days', overdue: true, status: 'In Progress' },
  { id: '2', ticket: 'NRI-2026-00012', customer: 'akanksha', service: 'Scheduled Home Visits by Care Executive', sla: 'Overdue 6 days', overdue: true, status: 'Assigned' },
  { id: '3', ticket: 'NRI-2026-00010', customer: 'Pradnya', service: 'Medicine Reminder Coordination', sla: 'Due in 2 days', overdue: false, status: 'In Progress' },
  { id: '4', ticket: 'NRI-2026-00009', customer: 'Test', service: 'Document Notarization Assistance', sla: 'Resolved', overdue: false, status: 'Resolved' },
];

function getStatusPill(status) {
  switch (status) {
    case 'Resolved': return { bg: '#D1FAE5', text: '#059669' };
    case 'In Progress': return { bg: '#FFEDD5', text: '#C2410C' };
    case 'Assigned': return { bg: '#DBEAFE', text: '#2563EB' };
    default: return { bg: '#F3F4F6', text: '#4B5563' };
  }
}

function Tickets({ navigation }) {
  const [activeTab, setActiveTab] = useState('All');

  const tabs = [
    { key: 'All', label: 'All' },
    { key: 'Assigned', label: 'Assigned' },
    { key: 'In Progress', label: 'In Progress' },
    { key: 'Resolved', label: 'Resolved' },
  ];

  const getCount = (key) => key === 'All' ? MOCK_TICKETS.length : MOCK_TICKETS.filter(t => t.status === key).length;
  const filtered = MOCK_TICKETS.filter(t => activeTab === 'All' || t.status === activeTab);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tickets</Text>
        <Text style={styles.headerSub}>Requests raised by your customers</Text>
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
            <Icon name="confirmation-number" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Tickets Found</Text>
          </View>
        ) : (
          filtered.map((t, idx) => {
            const pill = getStatusPill(t.status);
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TicketDetail', { ticketId: t.id })}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.rowNumWrap}><Text style={styles.rowNum}>{idx + 1}</Text></View>
                  <View style={styles.ticketInfo}>
                    <Text style={styles.ticketNumber}>{t.ticket}</Text>
                    <Text style={styles.serviceName} numberOfLines={2}>{t.service}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.statusPillText, { color: pill.text }]}>{t.status}</Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardActionRow}>
                  <View style={styles.detailItem}>
                    <Icon name="person" size={14} color="#94A3B8" />
                    <Text style={styles.detailText}>{t.customer}</Text>
                  </View>
                  <View style={[styles.slaPill, { backgroundColor: t.overdue ? '#FEE2E2' : '#D1FAE5' }]}>
                    <Text style={[styles.slaText, { color: t.overdue ? '#DC2626' : '#059669' }]}>{t.sla}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
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

  tabsContainer: { paddingTop: 20, paddingBottom: 12 },
  tabsScroll: { paddingHorizontal: 20, gap: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  tabActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  tabCount: { backgroundColor: '#F1F5F9', borderRadius: 10, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  tabCountActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  tabCountText: { fontSize: 11, fontWeight: '700', color: '#64748B' },
  tabCountTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 8, gap: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  rowNumWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  rowNum: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  ticketInfo: { flex: 1, gap: 4 },
  ticketNumber: { fontSize: 15, fontWeight: '700', color: '#1E293B', fontFamily: typography.labelMedium?.fontFamily },
  serviceName: { fontSize: 13, color: '#475569', lineHeight: 18 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  cardDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  cardActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  slaPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  slaText: { fontSize: 11, fontWeight: '700' },

  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
});

export default Tickets;
