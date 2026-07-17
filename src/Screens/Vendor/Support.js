import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const FAQS = [
  { id: '1', question: 'How do I accept a new job?', icon: 'help-outline' },
  { id: '2', question: 'When will I receive my payout?', icon: 'help-outline' },
  { id: '3', question: 'How do I update my availability?', icon: 'help-outline' },
];

const MY_TICKETS = [
  { id: '1', subject: 'Payout delayed for NRI-2026-00007', status: 'Open' },
  { id: '2', subject: 'Unable to update bank details', status: 'Resolved' },
];

function getStatusPill(status) {
  return status === 'Resolved'
    ? { bg: '#D1FAE5', text: '#059669' }
    : { bg: '#DBEAFE', text: '#1D4ED8' };
}

function Support({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={[styles.cardBlock, styles.contactCard]}>
          <View style={styles.contactIconBg}>
            <Icon name="support-agent" size={26} color="#3B82F6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>Contact Support</Text>
            <Text style={styles.contactSub}>Our team is available Mon-Sat, 9am-7pm</Text>
          </View>
          <TouchableOpacity style={styles.contactBtn}>
            <Icon name="chat-bubble-outline" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>FAQs</Text>
          </View>
          <View style={styles.cardBlock}>
            {FAQS.map((faq, index) => (
              <TouchableOpacity key={faq.id} style={[styles.faqRow, index < FAQS.length - 1 && styles.borderBottom]} activeOpacity={0.7}>
                <Icon name={faq.icon} size={18} color="#64748B" />
                <Text style={styles.faqText}>{faq.question}</Text>
                <Icon name="chevron-right" size={20} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>My Support Tickets</Text>
          </View>
          <View style={styles.cardBlock}>
            {MY_TICKETS.map((ticket, index) => {
              const statusPill = getStatusPill(ticket.status);
              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={[styles.ticketRow, index < MY_TICKETS.length - 1 && styles.borderBottom]}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('SupportTicketDetail', { ticketId: ticket.id })}
                >
                  <Text style={styles.ticketText} numberOfLines={1}>{ticket.subject}</Text>
                  <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
                    <Text style={[styles.statusPillText, { color: statusPill.text }]}>{ticket.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.newTicketBtn}>
          <Icon name="add" size={18} color="#FFFFFF" />
          <Text style={styles.newTicketBtnText}>Raise a New Ticket</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },

  sectionContainer: { marginBottom: 32 },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#1A1A1A' },

  cardBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  contactCard: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  contactIconBg: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  contactTitle: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  contactSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  contactBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D94625', justifyContent: 'center', alignItems: 'center' },

  faqRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  faqText: { fontSize: 14, color: '#0F172A', flex: 1 },

  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  ticketText: { fontSize: 14, color: '#0F172A', flex: 1, paddingRight: 12 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontWeight: '600' },

  newTicketBtn: { flexDirection: 'row', gap: 8, backgroundColor: '#D94625', borderRadius: 26, paddingVertical: 16, justifyContent: 'center', alignItems: 'center' },
  newTicketBtnText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
});

export default Support;
