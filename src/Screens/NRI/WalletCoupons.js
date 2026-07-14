import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useWalletAccount } from '../../Hooks/useWalletAccount';

const discountLabel = (c) => c.discountType === 'percentage' ? `${c.discountValue}% off` : `₹${c.discountValue.toLocaleString('en-IN')} off`;

function WalletCoupons({ navigation }) {
  const wallet = useSelector(state => state.wallet);
  const {
    balance,
    cashout,
    loading,
    retry,
    transactions,
    transactionsLoading,
    fetchTransactions,
    cashoutLoading,
    requestCashout,
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

  const [amount, setAmount] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  const handleCashout = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      Alert.alert('Invalid amount', 'Please enter a valid cash-out amount.');
      return;
    }
    if (!bankDetails.trim()) {
      Alert.alert('Bank details required', 'Please enter your bank account details.');
      return;
    }
    try {
      await requestCashout(numericAmount, bankDetails.trim()).unwrap();
      Alert.alert('Request submitted', 'Your cash-out request has been submitted.');
      setAmount('');
      setBankDetails('');
    } catch (error) {
      Alert.alert('Cash-out failed', error?.message || 'Something went wrong. Please try again.');
    }
  };

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
              <Text style={styles.statLabel}>Credit Balance</Text>
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
              <Text style={styles.statLabel}>Coupons Available</Text>
            </View>
            <Text style={styles.statValue}>{wallet.coupons.length}</Text>
          </View>
        </View>

        <View style={styles.ctaCard}>
          <View style={[styles.statIconBox, { backgroundColor: colors.warningBackground, width: 44, height: 44, borderRadius: 12 }]}>
            <Icon name="card-giftcard" size={24} color={colors.warning} />
          </View>
          <View style={{ flex: 1, paddingLeft: 4 }}>
            <Text style={styles.ctaText}>Want more credits?</Text>
            <TouchableOpacity style={styles.referBtn} onPress={() => navigation.navigate('Refer & Earn')}>
              <Icon name="share" size={16} color={colors.primary} />
              <Text style={styles.referBtnText}>Refer & Earn</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Icon name="account-balance" size={20} color={colors.textPrimary} />
            <Text style={styles.sectionTitle}>Cash Out to Bank</Text>
            <View style={styles.eliteBadge}>
              <Text style={styles.eliteBadgeText}>ELITE</Text>
            </View>
          </View>
          {cashout?.eligible ? (
            <>
              <Text style={styles.cashOutHelp}>Minimum cash-out amount: ₹{cashout.minBalance?.toLocaleString('en-IN')}</Text>
              {cashout.pendingRequest ? (
                <Text style={styles.cashOutPending}>You already have a pending cash-out request.</Text>
              ) : (
                <>
                  <TextInput
                    style={styles.input}
                    placeholder="Amount"
                    placeholderTextColor={colors.textPlaceholder}
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Bank details (e.g. HDFC •• 1234, IFSC HDFC0000123)"
                    placeholderTextColor={colors.textPlaceholder}
                    value={bankDetails}
                    onChangeText={setBankDetails}
                  />
                  <TouchableOpacity style={styles.cashOutBtn} onPress={handleCashout} disabled={cashoutLoading}>
                    {cashoutLoading ? (
                      <ActivityIndicator size="small" color={colors.onAccent} />
                    ) : (
                      <Text style={styles.cashOutBtnText}>Request Cash Out</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <Text style={styles.cashOutText}>
              Bank cash-out of credits is an <Text style={styles.bold}>Elite plan</Text> benefit. Other plans use credits on renewals and add-on purchases.
            </Text>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Available Coupons</Text>
          {wallet.coupons.map(c => (
            <View key={c.code} style={styles.couponRow}>
              <View style={styles.couponTopRow}>
                <View style={styles.couponCodeBadge}>
                  <Text style={styles.couponCodeText}>{c.code}</Text>
                </View>
                <Text style={styles.couponDiscount}>{discountLabel(c)}</Text>
              </View>
              <Text style={styles.couponDesc}>{c.description}</Text>
            </View>
          ))}
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
                  {t.type === 'credit' ? '+' : '-'}₹{t.amount}
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
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
  statHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statLabel: { ...typography.small, color: colors.textSecondary },
  statValue: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: colors.textPrimary },
  
  ctaCard: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
  ctaText: { ...typography.h4, fontSize: 15, color: colors.textPrimary, marginBottom: 8 },
  referBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: colors.primary, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  referBtnText: { ...typography.small, fontFamily: typography.labelMedium.fontFamily, color: colors.primary },
  
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, shadowColor: colors.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3 },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  eliteBadge: { backgroundColor: colors.textPrimary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' },
  eliteBadgeText: { ...typography.tiny, color: colors.surface, fontFamily: typography.labelMedium.fontFamily },
  
  cashOutText: { ...typography.body, color: colors.textSecondary, lineHeight: 20, marginTop: 8 },
  cashOutHelp: { ...typography.small, color: colors.textSecondary, marginBottom: 12 },
  cashOutPending: { ...typography.labelMedium, color: colors.warning },
  bold: { fontFamily: typography.labelMedium.fontFamily, color: colors.textPrimary },
  
  input: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, height: 52, color: colors.textPrimary, ...typography.body, marginBottom: 12 },
  cashOutBtn: { backgroundColor: colors.accent, borderRadius: 12, height: 52, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  cashOutBtnText: { ...typography.labelLarge, color: colors.onAccent },
  
  couponRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.surfaceSecondary, marginTop: 4 },
  couponTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  couponCodeBadge: { backgroundColor: colors.primaryLight + '20', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  couponCodeText: { ...typography.small, fontFamily: typography.labelMedium.fontFamily, color: colors.primary, letterSpacing: 0.5 },
  couponDiscount: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: colors.success },
  couponDesc: { ...typography.small, color: colors.textSecondary, marginTop: 8 },
  
  emptyText: { ...typography.body, color: colors.textPlaceholder, textAlign: 'center', paddingVertical: 20 },
  
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: colors.surfaceSecondary, marginTop: 4 },
  txnIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { ...typography.labelMedium, color: colors.textPrimary },
  txnDate: { ...typography.small, color: colors.textSecondary, marginTop: 2 },
  txnAmount: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily },
});

export default WalletCoupons;
