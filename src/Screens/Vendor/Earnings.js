import React from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const PAYOUT_HISTORY = [
  { id: '1', date: '10 Jul 2026', ticket: 'NRI-2026-00007', amount: '₹1,200', status: 'Paid' },
  { id: '2', date: '02 Jul 2026', ticket: 'NRI-2026-00005', amount: '₹850', status: 'Paid' },
  { id: '3', date: '24 Jun 2026', ticket: 'NRI-2026-00002', amount: '₹1,500', status: 'Paid' },
];

function Earnings() {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: '#1E3A8A' }]}>
            <Text style={styles.summaryLabel}>Pending Payout</Text>
            <Text style={styles.summaryValue}>₹0.00</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#059669' }]}>
            <Text style={styles.summaryLabel}>Completed Earnings</Text>
            <Text style={styles.summaryValue}>₹3,550</Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payout History</Text>
          </View>

          <View style={styles.cardBlock}>
            {PAYOUT_HISTORY.map((row, index) => (
              <View key={row.id} style={[styles.historyRow, index < PAYOUT_HISTORY.length - 1 && styles.borderBottom]}>
                <View style={styles.historyIconBg}>
                  <Icon name="account-balance-wallet" size={18} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTicket}>{row.ticket}</Text>
                  <Text style={styles.historyDate}>{row.date}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.historyAmount}>{row.amount}</Text>
                  <View style={styles.paidPill}>
                    <Text style={styles.paidPillText}>{row.status}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100 },

  summaryRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  summaryCard: { flex: 1, borderRadius: 20, padding: 20 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginBottom: 8 },
  summaryValue: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },

  sectionContainer: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
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
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  historyIconBg: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center' },
  historyTicket: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  historyDate: { fontSize: 12, color: '#64748B', marginTop: 2 },
  historyAmount: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  paidPill: { backgroundColor: '#D1FAE5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  paidPillText: { fontSize: 10, fontFamily: typography.labelMedium.fontFamily, color: '#059669' },
});

export default Earnings;
