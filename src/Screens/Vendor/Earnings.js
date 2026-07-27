import React from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useVendorEarnings } from '../../Hooks/useVendorEarnings';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function getStatusStyle(status) {
  switch ((status || '').toLowerCase()) {
    case 'paid': return { bg: '#D1FAE5', text: '#059669' };
    case 'processed': return { bg: '#DBEAFE', text: '#1D4ED8' };
    default: return { bg: '#FEF3C7', text: '#D97706' }; // pending
  }
}

function Earnings({ navigation }) {
  const { totals, payouts, loading, failed, retry } = useVendorEarnings();

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
            <Text style={styles.summaryValue}>{formatInr(totals?.pendingPayout)}</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: '#059669' }]}>
            <Text style={styles.summaryLabel}>Completed Jobs</Text>
            <Text style={styles.summaryValue}>{totals?.completedJobs ?? 0}</Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payout History</Text>
          </View>

          {loading && payouts.length === 0 ? (
            <View style={styles.stateBox}><ActivityIndicator size="large" color="#D94625" /></View>
          ) : failed ? (
            <TouchableOpacity style={styles.stateBox} onPress={retry} activeOpacity={0.7}>
              <Icon name="refresh" size={36} color="#DC2626" />
              <Text style={styles.stateText}>Couldn't load earnings. Tap to retry.</Text>
            </TouchableOpacity>
          ) : payouts.length === 0 ? (
            <View style={styles.stateBox}>
              <Icon name="account-balance-wallet" size={44} color="#CBD5E1" />
              <Text style={styles.stateText}>No payouts yet.</Text>
            </View>
          ) : (
            <View style={styles.cardBlock}>
              {payouts.map((row, index) => {
                const st = getStatusStyle(row.status);
                return (
                  <TouchableOpacity
                    key={row.id}
                    style={[styles.historyRow, index < payouts.length - 1 && styles.borderBottom]}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('PayoutDetail', { payoutId: row.id })}
                  >
                    <View style={styles.historyIconBg}>
                      <Icon name="account-balance-wallet" size={18} color="#3B82F6" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.historyTicket}>{row.period || `Payout #${row.id}`}</Text>
                      <Text style={styles.historyDate}>
                        {formatDate(row.date)}{row.jobsCount != null ? ` · ${row.jobsCount} job${row.jobsCount === 1 ? '' : 's'}` : ''}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={styles.historyAmount}>{formatInr(row.amount)}</Text>
                      <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                        <Text style={[styles.statusPillText, { color: st.text }]}>{row.status}</Text>
                      </View>
                    </View>
                    <Icon name="chevron-right" size={20} color="#CBD5E1" />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
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

  stateBox: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  stateText: { fontSize: 14, color: '#64748B', textAlign: 'center' },

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
  statusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusPillText: { fontSize: 10, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },
});

export default Earnings;
