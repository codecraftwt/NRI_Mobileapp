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

function getTransactionStyle(type) {
  return String(type || '').toLowerCase() === 'debit'
    ? { bg: '#FEE2E2', color: '#DC2626', icon: 'arrow-upward', sign: '-' }
    : { bg: '#D1FAE5', color: '#059669', icon: 'arrow-downward', sign: '+' };
}

function WalletHistory({ navigation }) {
  const { transactions, loading, loadingMore, failed, error, retry, loadMore } = useVendorWallet();

  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
    if (distanceFromBottom < 240) loadMore();
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Wallet History" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleScroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={retry} colors={['#D94625']} tintColor="#D94625" />}
      >
        {loading && transactions.length === 0 ? (
          <View style={styles.stateBox}><ActivityIndicator size="large" color="#D94625" /></View>
        ) : failed ? (
          <TouchableOpacity style={styles.stateBox} onPress={retry} activeOpacity={0.7}>
            <Icon name="refresh" size={36} color="#DC2626" />
            <Text style={styles.stateText}>{error?.message || "Couldn't load wallet history. Tap to retry."}</Text>
          </TouchableOpacity>
        ) : transactions.length === 0 ? (
          <View style={styles.stateBox}>
            <Icon name="history" size={44} color="#CBD5E1" />
            <Text style={styles.stateText}>No wallet activity yet.</Text>
          </View>
        ) : (
          <View style={styles.cardBlock}>
            {transactions.map((txn, index) => {
              const st = getTransactionStyle(txn.type);
              return (
                <View key={txn.id} style={[styles.txnRow, index < transactions.length - 1 && styles.borderBottom]}>
                  <View style={[styles.txnIconBox, { backgroundColor: st.bg }]}>
                    <Icon name={st.icon} size={16} color={st.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnDesc} numberOfLines={2}>{txn.description}</Text>
                    <Text style={styles.txnDate}>{formatDate(txn.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txnAmount, { color: st.color }]}>{st.sign}{formatInr(txn.amount)}</Text>
                </View>
              );
            })}
            {loadingMore && (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#D94625" />
              </View>
            )}
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

  cardBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  footerLoader: { paddingVertical: 16, alignItems: 'center' },

  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  txnIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  txnDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: '800' },
});

export default WalletHistory;
