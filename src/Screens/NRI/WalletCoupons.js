import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';

const discountLabel = (c) => c.discountType === 'percentage' ? `${c.discountValue}% off` : `₹${c.discountValue.toLocaleString('en-IN')} off`;

function WalletCoupons({ navigation }) {
  const wallet = useSelector(state => state.wallet);

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Coupon & Credits Wallet" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: '#E6F7EF' }]}>
              <Icon name="account-balance-wallet" size={20} color="#10B981" />
            </View>
            <Text style={styles.statLabel}>Credit Balance</Text>
            <Text style={styles.statValue}>₹{wallet.walletCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
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
          {wallet.transactions.length === 0 ? (
            <Text style={styles.emptyText}>No wallet activity yet.</Text>
          ) : (
            wallet.transactions.map(t => (
              <View key={t.id} style={styles.txnRow}>
                <View style={[styles.txnIcon, { backgroundColor: t.type === 'credit' ? '#E8F5E9' : '#FFF3E0' }]}>
                  <Icon name={t.type === 'credit' ? 'arrow-downward' : 'arrow-upward'} size={16} color={t.type === 'credit' ? '#4CAF50' : '#FF9800'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnDesc}>{t.description}</Text>
                  <Text style={styles.txnDate}>{t.date}</Text>
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
