import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
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
  const { showAlert, alertProps } = useAppAlert();

  const handleCashout = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      showAlert('Invalid amount', 'Please enter a valid cash-out amount.');
      return;
    }
    if (!bankDetails.trim()) {
      showAlert('Bank details required', 'Please enter your bank account details.');
      return;
    }
    try {
      await requestCashout(numericAmount, bankDetails.trim()).unwrap();
      showAlert('Request submitted', 'Your cash-out request has been submitted.');
      setAmount('');
      setBankDetails('');
    } catch (error) {
      showAlert('Cash-out failed', error?.message || 'Something went wrong. Please try again.');
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
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Credit Balance</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={colors.success} style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            )}
          </View>
          <View style={styles.statCard}>
            <View style={styles.statHeaderRow}>
              <View style={[styles.statIconBox, { backgroundColor: colors.primaryLight + '30' }]}>
                <Icon name="confirmation-number" size={18} color={colors.primary} />
              </View>
              <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit>Coupons Available</Text>
            </View>
            <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{wallet.coupons.length}</Text>
          </View>
        </View>

        <View style={styles.ctaCard}>
          <View style={styles.ctaIconWrap}>
            <Icon name="card-giftcard" size={28} color="#F59E0B" />
          </View>
          <View style={{ flex: 1, paddingLeft: 8 }}>
            <Text style={styles.ctaText}>Want more credits?</Text>
            <TouchableOpacity style={styles.referBtn} onPress={() => navigation.navigate('Refer & Earn')} activeOpacity={0.8}>
              <Icon name="share" size={16} color="#FFFFFF" />
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
      <AppAlert {...alertProps} />
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
  
  ctaCard: { 
    flexDirection: 'row', 
    backgroundColor: '#1E3A8A', 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.2, 
    shadowRadius: 20, 
    elevation: 6 
  },
  ctaIconWrap: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  ctaText: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', marginBottom: 12 },
  referBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#D94625', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, shadowColor: '#D94625', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  referBtnText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  
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
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  eliteBadge: { backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 'auto' },
  eliteBadgeText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  cashOutText: { fontSize: 14, fontFamily: typography.body.fontFamily, color: '#475569', lineHeight: 22, marginTop: 8 },
  cashOutHelp: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#64748B', marginBottom: 16 },
  cashOutPending: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#D97706' },
  bold: { fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  
  input: { fontFamily: typography.body.fontFamily, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 56, color: '#0F172A', fontSize: 15, marginBottom: 16 },
  cashOutBtn: { backgroundColor: '#1E3A8A', borderRadius: 16, height: 56, justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  cashOutBtnText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  
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
