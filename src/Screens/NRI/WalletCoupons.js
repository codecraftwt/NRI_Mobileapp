import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useWalletAccount } from '../../Hooks/useWalletAccount';

// Wallet balance / cash-out minimum / transaction amounts are USD (from the
// wallet API) — format with $ like the rest of the flow.
const formatUsd = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function WalletCoupons({ navigation }) {
  const {
    balance,
    coupons,
    loading,
    retry,
    transactions,
    transactionsLoading,
    fetchTransactions,
  } = useWalletAccount();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([retry(), fetchTransactions()]);
    setRefreshing(false);
  };

  // `retry`/`fetchTransactions` are new function references every render
  // (not memoized by the hook) — keeping them out of these deps avoids an
  // infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry();
      fetchTransactions();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Coupon & Credits Wallet" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconBox, { backgroundColor: colors.successBackground }]}>
                <Icon name="account-balance-wallet" size={18} color={colors.success} />
              </View>
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Credit Balance</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={colors.success} style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.statValue}>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            )}
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconBox, { backgroundColor: colors.primaryLight + '30' }]}>
                <Icon name="confirmation-number" size={18} color={colors.primary} />
              </View>
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Coupons Available</Text>
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{coupons.length}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Available Coupons</Text>
          {loading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : coupons.length === 0 ? (
            <Text style={styles.emptyText}>No coupons available.</Text>
          ) : (
            coupons.map(c => (
              <View key={c.id ?? c.code} style={styles.couponRow}>
                <View style={styles.couponTopRow}>
                  <View style={styles.couponCodeBadge}>
                    <Text style={styles.couponCodeText}>{c.code}</Text>
                  </View>
                  {c.validUntil ? (
                    <Text style={styles.couponDiscount}>Valid until {c.validUntil}</Text>
                  ) : null}
                </View>
                {c.description ? <Text style={styles.couponDesc}>{c.description}</Text> : null}
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Credit History</Text>
          {transactionsLoading ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : transactions.length === 0 ? (
            <Text style={styles.emptyText}>No wallet activity yet.</Text>
          ) : (
            transactions.map(t => (
              <View key={t.id} style={styles.txnRow}>
                <View style={[styles.txnIcon, { backgroundColor: t.type === 'credit' ? colors.successBackground : colors.warningBackground }]}>
                  <Icon name={t.type === 'credit' ? 'arrow-downward' : 'arrow-upward'} size={20} color={t.type === 'credit' ? colors.success : colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc}>{t.description || 'Wallet transaction'}</Text>
                  <Text style={styles.txnDate}>{t.createdAt}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: t.type === 'credit' ? colors.success : colors.error }]}>
                  {t.type === 'credit' ? '+' : '-'}{formatUsd(t.amount)}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },

  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E0E7FF', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 16, 
    elevation: 3 
  },
  statHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  statIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B', flex: 1 },
  statValue: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  sectionCard: {
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: '#E0E7FF', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 24, 
    elevation: 4 
  },
  sectionTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  couponRow: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 8 },
  couponTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  couponCodeBadge: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  couponCodeText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#1E3A8A', letterSpacing: 1 },
  couponDiscount: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#16A34A' },
  couponDesc: { fontSize: 14, fontFamily: typography.body.fontFamily, color: '#64748B', marginTop: 10 },
  
  emptyText: { fontSize: 14, fontFamily: typography.body.fontFamily, color: '#94A3B8', textAlign: 'center', paddingVertical: 24, fontStyle: 'italic' },
  
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 8 },
  txnIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#1E293B' },
  txnDate: { fontSize: 13, fontFamily: typography.body.fontFamily, color: '#64748B', marginTop: 4 },
  txnAmount: { fontSize: 17, fontFamily: typography.h2.fontFamily },
});

export default WalletCoupons;
