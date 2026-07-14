import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#E6F7EF' }]}>
              <Icon name="account-balance-wallet" size={20} color="#10B981" />
            </View>
            <Text style={styles.statLabel}>Credit Balance</Text>
            {loading ? (
              <ActivityIndicator size="small" color="#10B981" style={{ marginTop: 4 }} />
            ) : (
              <Text style={styles.statValue}>₹{balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            )}
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#E5F1FF' }]}>
              <Icon name="confirmation-number" size={20} color="#007AFF" />
            </View>
            <Text style={styles.statLabel}>Coupons Available</Text>
            <Text style={styles.statValue}>{wallet.coupons.length}</Text>
          </View>
        </View>

        <View style={styles.ctaCard}>
          <View style={[styles.statIconBox, { backgroundColor: '#FDECEC' }]}>
            <Icon name="card-giftcard" size={20} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ctaText}>Want more credits?</Text>
            <TouchableOpacity style={styles.referBtn} onPress={() => navigation.navigate('Refer & Earn')}>
              <Icon name="share" size={14} color="#007AFF" />
              <Text style={styles.referBtnText}>Refer & Earn</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Icon name="account-balance" size={18} color="#374151" />
            <Text style={styles.sectionTitle}>Cash Out to Bank</Text>
            <View style={styles.eliteBadge}>
              <Text style={styles.eliteBadgeText}>Elite</Text>
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
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Bank details (e.g. HDFC •• 1234, IFSC HDFC0000123)"
                    placeholderTextColor="#9CA3AF"
                    value={bankDetails}
                    onChangeText={setBankDetails}
                  />
                  <TouchableOpacity style={styles.cashOutBtn} onPress={handleCashout} disabled={cashoutLoading}>
                    {cashoutLoading ? (
                      <ActivityIndicator size="small" color="white" />
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
            <ActivityIndicator size="small" color="#007AFF" style={{ paddingVertical: 20 }} />
          ) : transactions.length === 0 ? (
            <Text style={styles.emptyText}>No wallet activity yet.</Text>
          ) : (
            transactions.map(t => (
              <View key={t.id} style={styles.txnRow}>
                <View style={[styles.txnIcon, { backgroundColor: t.type === 'credit' ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Icon name={t.type === 'credit' ? 'arrow-downward' : 'arrow-upward'} size={16} color={t.type === 'credit' ? '#4CAF50' : '#FF9800'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc}>{t.description || 'Wallet transaction'}</Text>
                  <Text style={styles.txnDate}>{t.createdAt}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: t.type === 'credit' ? '#4CAF50' : '#EF4444' }]}>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 2 },
  ctaCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 14, padding: 14, gap: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  ctaText: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 8 },
  referBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  referBtnText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  sectionCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  eliteBadge: { backgroundColor: '#111827', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' },
  eliteBadgeText: { fontSize: 10, color: 'white', fontWeight: 'bold' },
  cashOutText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  cashOutHelp: { fontSize: 12, color: '#6B7280', marginBottom: 10 },
  cashOutPending: { fontSize: 13, color: '#D97706', fontWeight: '600' },
  bold: { fontWeight: 'bold', color: '#111827' },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: '#111827', marginBottom: 10 },
  cashOutBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  cashOutBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  couponRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  couponTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  couponCodeBadge: { backgroundColor: '#E5F1FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  couponCodeText: { fontSize: 12, fontWeight: 'bold', color: '#007AFF' },
  couponDiscount: { fontSize: 14, fontWeight: 'bold', color: '#10B981' },
  couponDesc: { fontSize: 12, color: '#666', marginTop: 6 },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 20 },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  txnIcon: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 13, fontWeight: '600', color: '#333' },
  txnDate: { fontSize: 11, color: '#999', marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: 'bold' },
});

export default WalletCoupons;
