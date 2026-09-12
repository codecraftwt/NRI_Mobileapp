import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme/typography';
import { useVendorWallet } from '../../Hooks/Vendor/useVendorWallet';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function modeIcon(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'cash') return 'payments';
  if (v === 'upi') return 'qr-code-2';
  if (v.includes('bank')) return 'account-balance';
  return 'account-balance-wallet';
}

function getWithdrawalStatusStyle(status) {
  switch (String(status || '').toLowerCase()) {
    case 'approved': return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'paid': return { bg: '#D1FAE5', text: '#059669' };
    case 'rejected':
    case 'failed': return { bg: '#FEE2E2', text: '#DC2626' };
    case 'reversed': return { bg: '#FEE2E2', text: '#B91C1C' };
    default: return { bg: '#FEF3C7', text: '#D97706' }; // pending
  }
}

function WithdrawalRequests({ navigation }) {
  const { withdrawals, loading, failed, error, retry } = useVendorWallet();

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Withdrawal Requests" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={retry} colors={['#D94625']} tintColor="#D94625" />}
      >
        {loading && withdrawals.length === 0 ? (
          <View style={styles.stateBox}><ActivityIndicator size="large" color="#D94625" /></View>
        ) : failed ? (
          <TouchableOpacity style={styles.stateBox} onPress={retry} activeOpacity={0.7}>
            <Icon name="refresh" size={36} color="#DC2626" />
            <Text style={styles.stateText}>{error?.message || "Couldn't load withdrawal requests. Tap to retry."}</Text>
          </TouchableOpacity>
        ) : withdrawals.length === 0 ? (
          <View style={styles.stateBox}>
            <Icon name="receipt-long" size={44} color="#CBD5E1" />
            <Text style={styles.stateText}>No withdrawal requests yet.</Text>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {withdrawals.map((row) => {
              const st = getWithdrawalStatusStyle(row.status);
              return (
                <View key={row.id} style={styles.requestCard}>
                  <View style={styles.requestCardTop}>
                    <View style={styles.requestModeIconBox}>
                      <Icon name={modeIcon(row.mode)} size={18} color="#4F46E5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.requestAmount}>{formatInr(row.amount)}</Text>
                      <Text style={styles.requestMeta}>#{row.id} · {row.modeLabel} · {formatDate(row.createdAt)}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                      <View style={[styles.statusDot, { backgroundColor: st.text }]} />
                      <Text style={[styles.statusPillText, { color: st.text }]}>{row.statusLabel}</Text>
                    </View>
                  </View>

                  <View style={styles.requestBreakdown}>
                    <View style={styles.breakdownItem}>
                      <Text style={styles.breakdownLabel}>Fee</Text>
                      <Text style={styles.breakdownValueNegative}>-{formatInr(row.fee)}</Text>
                    </View>
                    <View style={styles.breakdownDivider} />
                    <View style={styles.breakdownItem}>
                      <Text style={styles.breakdownLabel}>Payable</Text>
                      <Text style={styles.breakdownValuePositive}>{formatInr(row.payable)}</Text>
                    </View>
                  </View>

                  {!!row.rejectionReason && (
                    <View style={styles.rejectionBox}>
                      <Icon name="info-outline" size={14} color="#DC2626" />
                      <Text style={styles.rejectionReason}>{row.rejectionReason}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  stateBox: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  stateText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 20 },

  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusPillText: { fontSize: 10, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },

  requestCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  requestCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestModeIconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  requestAmount: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  requestMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  requestBreakdown: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 10 },
  breakdownItem: { flex: 1, alignItems: 'center', gap: 2 },
  breakdownDivider: { width: 1, backgroundColor: '#E2E8F0' },
  breakdownLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  breakdownValueNegative: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  breakdownValuePositive: { fontSize: 13, fontWeight: '700', color: '#059669' },

  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10,
  },
  rejectionReason: { flex: 1, fontSize: 12, color: '#DC2626', lineHeight: 17 },
});

export default WithdrawalRequests;
