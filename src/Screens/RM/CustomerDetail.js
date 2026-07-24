import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const INFO = [
  { icon: 'email', label: 'Email', value: 'veratol241@jobraux.com' },
  { icon: 'phone', label: 'Phone', value: '+1 925 555 0142' },
  { icon: 'location-on', label: 'NRI Location', value: 'Acalanes Ridge, United States' },
  { icon: 'home', label: 'India Location', value: 'Pune, Maharashtra' },
  { icon: 'card-membership', label: 'Plan', value: 'Membership' },
  { icon: 'event', label: 'Member Since', value: 'Jan 2026' },
];

const REQUESTS = [
  { id: '1', ticket: 'NRI-2026-00011', service: 'Scheduled Home Visits', status: 'In Progress', bg: '#FFEDD5', color: '#C2410C' },
  { id: '2', ticket: 'NRI-2026-00009', service: 'Document Notarization', status: 'Resolved', bg: '#D1FAE5', color: '#059669' },
];

function CustomerDetail({ navigation, route }) {
  const name = route?.params?.name || 'Customer';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{name.charAt(0).toUpperCase()}</Text></View>
          <Text style={styles.name}>{name}</Text>
          <View style={styles.pill}><Text style={styles.pillText}>Active</Text></View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn}>
              <Icon name="call" size={18} color="#3B82F6" />
              <Text style={[styles.actionText, { color: '#3B82F6' }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Icon name="chat" size={18} color="#16A34A" />
              <Text style={[styles.actionText, { color: '#16A34A' }]}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Information</Text>
        <View style={styles.infoBlock}>
          {INFO.map((item, idx) => (
            <View key={item.label} style={[styles.infoRow, idx < INFO.length - 1 && styles.infoBorder]}>
              <View style={styles.infoIconBg}><Icon name={item.icon} size={18} color="#64748B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{item.label}</Text>
                <Text style={styles.infoValue}>{item.value}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Requests</Text>
        <View style={{ gap: 12 }}>
          {REQUESTS.map(r => (
            <TouchableOpacity key={r.id} style={styles.reqCard} activeOpacity={0.7} onPress={() => navigation.navigate('TicketDetail', { ticketId: r.id })}>
              <View style={styles.reqIconBg}><Icon name="confirmation-number" size={20} color="#64748B" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.reqService} numberOfLines={1}>{r.service}</Text>
                <Text style={styles.reqTicket}>{r.ticket}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: r.bg }]}>
                <Text style={[styles.statusPillText, { color: r.color }]}>{r.status}</Text>
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
  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontFamily: typography.h2.fontFamily },
  name: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  pill: { backgroundColor: '#D1FAE5', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  pillText: { fontSize: 12, fontWeight: '700', color: '#059669' },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  actionText: { fontSize: 14, fontWeight: '600' },

  sectionTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A', marginTop: 24, marginBottom: 12 },
  infoBlock: { backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#94A3B8' },
  infoValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 2 },

  reqCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#F1F5F9' },
  reqIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center' },
  reqService: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  reqTicket: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
});

export default CustomerDetail;
