import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const TIMELINE = [
  { id: '1', label: 'Request Created', time: '18 Jul, 09:00 AM', done: true },
  { id: '2', label: 'Assigned to Care Executive', time: '18 Jul, 10:30 AM', done: true },
  { id: '3', label: 'In Progress', time: '19 Jul, 08:15 AM', done: true },
  { id: '4', label: 'Resolved', time: 'Pending', done: false },
];

function TicketDetail({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <Text style={styles.ticketNo}>NRI-2026-00011</Text>
            <View style={[styles.statusPill, { backgroundColor: '#FFEDD5' }]}>
              <Text style={[styles.statusPillText, { color: '#C2410C' }]}>In Progress</Text>
            </View>
          </View>
          <Text style={styles.service}>Scheduled Home Visits by Care Executive</Text>
          <View style={styles.slaRow}>
            <Icon name="schedule" size={16} color="#DC2626" />
            <Text style={styles.slaText}>SLA Overdue by 6 days</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.infoBlock}>
          <Row icon="person" label="Customer" value="akanksha" />
          <Row icon="location-on" label="Location" value="Pune, Maharashtra" />
          <Row icon="flag" label="Priority" value="Standard" />
          <Row icon="event" label="Created" value="18 Jul 2026" last />
        </View>

        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.infoBlock}>
          {TIMELINE.map((t, idx) => (
            <View key={t.id} style={styles.tlRow}>
              <View style={styles.tlLeft}>
                <View style={[styles.tlDot, { backgroundColor: t.done ? '#16A34A' : '#CBD5E1' }]}>
                  {t.done && <Icon name="check" size={12} color="#FFFFFF" />}
                </View>
                {idx < TIMELINE.length - 1 && <View style={styles.tlLine} />}
              </View>
              <View style={{ flex: 1, paddingBottom: 20 }}>
                <Text style={[styles.tlLabel, !t.done && { color: '#94A3B8' }]}>{t.label}</Text>
                <Text style={styles.tlTime}>{t.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} activeOpacity={0.8}>
          <Icon name="chat" size={20} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>Open Chat</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ icon, label, value, last }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoBorder]}>
      <View style={styles.infoIconBg}><Icon name={icon} size={18} color="#64748B" /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 20 },
  topCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  ticketNo: { fontSize: 15, fontWeight: '700', color: '#1E293B', fontFamily: typography.labelMedium.fontFamily },
  service: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', lineHeight: 22 },
  slaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  slaText: { fontSize: 13, fontWeight: '600', color: '#DC2626' },

  sectionTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A', marginTop: 24, marginBottom: 12 },
  infoBlock: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4, borderWidth: 1, borderColor: '#F1F5F9' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#94A3B8' },
  infoValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  tlRow: { flexDirection: 'row', gap: 14, paddingTop: 14 },
  tlLeft: { alignItems: 'center', width: 24 },
  tlDot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  tlLine: { flex: 1, width: 2, backgroundColor: '#E2E8F0', marginVertical: 2 },
  tlLabel: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  tlTime: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D94625', borderRadius: 16, paddingVertical: 16, marginTop: 24 },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default TicketDetail;
