import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const TICKETS = [
  { id: '1', subject: 'App login issue for customer', ref: 'SUP-2026-0021', status: 'Open', bg: '#DBEAFE', color: '#2563EB', date: '22 Jul' },
  { id: '2', subject: 'Clarification on renewal policy', ref: 'SUP-2026-0018', status: 'Resolved', bg: '#D1FAE5', color: '#059669', date: '19 Jul' },
];

const TOPICS = [
  { id: 'account', label: 'Account & Access', icon: 'account-circle', color: '#3B82F6' },
  { id: 'billing', label: 'Billing', icon: 'receipt-long', color: '#F97316' },
  { id: 'tech', label: 'Technical', icon: 'build', color: '#8B5CF6' },
  { id: 'other', label: 'Other', icon: 'help-outline', color: '#10B981' },
];

function GeneralSupport({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>General Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>How can we help?</Text>
        <View style={styles.topicGrid}>
          {TOPICS.map(t => (
            <TouchableOpacity key={t.id} style={styles.topicCard} activeOpacity={0.7}>
              <View style={[styles.topicIconBg, { backgroundColor: t.color + '15' }]}>
                <Icon name={t.icon} size={24} color={t.color} />
              </View>
              <Text style={styles.topicLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
          <Icon name="add" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Raise New Ticket</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>My Support Tickets</Text>
        <View style={{ gap: 12 }}>
          {TICKETS.map(t => (
            <TouchableOpacity key={t.id} style={styles.card} activeOpacity={0.7}>
              <View style={styles.cardIconBg}><Icon name="support-agent" size={20} color="#64748B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardSubject} numberOfLines={1}>{t.subject}</Text>
                <Text style={styles.cardMeta}>{t.ref} · {t.date}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: t.bg }]}>
                <Text style={[styles.statusPillText, { color: t.color }]}>{t.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 20 },
  sectionTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A', marginBottom: 12, marginTop: 8 },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  topicCard: {
    width: '47%', backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  topicIconBg: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  topicLabel: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D94625', borderRadius: 16, paddingVertical: 16, marginTop: 20 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  cardIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  cardSubject: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  cardMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
});

export default GeneralSupport;
