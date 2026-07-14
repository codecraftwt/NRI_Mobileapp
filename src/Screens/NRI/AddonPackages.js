import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useMyAddonPackages } from '../../Hooks/useMyAddonPackages';
import { openRazorpayCheckout, openStripeCheckout, extractStripeSessionId } from '../../Utils/paymentGateway';

const GATEWAYS = [
  { key: 'razorpay', label: 'Razorpay (auto-renew)' },
  { key: 'stripe', label: 'Stripe (monthly)' },
];

function statusStyle(status) {
  switch (status) {
    case 'active': return { bg: '#E8F5E9', text: '#4CAF50' };
    case 'pending': return { bg: '#FFF3E0', text: '#FF9800' };
    default: return { bg: '#F3F4F6', text: '#6B7280' };
  }
}

function AddonPackages({ navigation }) {
  const { packages, loading, failed, retry, subscribe, cancelSubscription, verifyPayment, refetch } = useMyAddonPackages();
  const user = useSelector(state => state.user.user);
  const [gateways, setGateways] = useState({});
  const [processingId, setProcessingId] = useState(null);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  // `retry` is a new function reference every render (not memoized by the
  // hook) — keeping it out of these deps avoids an infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const chooseGateway = (pkgId) => {
    Alert.alert(
      'Payment Method',
      undefined,
      GATEWAYS.map(g => ({
        text: g.label,
        onPress: () => setGateways(prev => ({ ...prev, [pkgId]: g.key })),
      })).concat({ text: 'Cancel', style: 'cancel' })
    );
  };

  const handleSubscribe = async (pkg) => {
    const gateway = gateways[pkg.id] || GATEWAYS[0].key;
    setProcessingId(pkg.id);
    try {
      const result = await subscribe(pkg.id, gateway).unwrap();

      if (result.order) {
        const rzpResult = await openRazorpayCheckout({
          order: result.order,
          name: 'NRI Circle',
          description: `${pkg.name} — monthly add-on`,
          user,
        });
        await verifyPayment({
          paymentId: result.paymentId,
          razorpayOrderId: rzpResult.razorpayOrderId,
          razorpayPaymentId: rzpResult.razorpayPaymentId,
          razorpaySignature: rzpResult.razorpaySignature,
          razorpaySubscriptionId: rzpResult.razorpaySubscriptionId,
        }).unwrap();
        refetch();
        Alert.alert('Subscribed', `You've subscribed to ${pkg.name}.`);
      } else if (result.checkoutUrl) {
        openStripeCheckout(result.checkoutUrl);
        Alert.alert(
          'Complete Payment',
          'Complete your payment in the browser, then come back and tap "I\'ve Paid" to confirm.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: "I've Paid",
              onPress: () => {
                const sessionId = extractStripeSessionId(result.checkoutUrl);
                verifyPayment({ paymentId: result.paymentId, sessionId })
                  .unwrap()
                  .then(() => {
                    refetch();
                    Alert.alert('Subscribed', `You've subscribed to ${pkg.name}.`);
                  })
                  .catch((error) => {
                    Alert.alert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
                  });
              },
            },
          ]
        );
      } else {
        refetch();
        Alert.alert('Subscribed', result.message || `You've subscribed to ${pkg.name}.`);
      }
    } catch (error) {
      Alert.alert('Subscription Failed', error?.message || 'Could not complete the subscription. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = (pkg) => {
    Alert.alert('Cancel Auto-Renewal', `Stop auto-renewal for ${pkg.name}?`, [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Cancel Renewal',
        style: 'destructive',
        onPress: () => {
          cancelSubscription(pkg.mySubscription.id)
            .unwrap()
            .catch((error) => {
              Alert.alert('Failed', error?.message || 'Could not cancel auto-renewal.');
            });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Add-on Packages" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
        <Text style={styles.introText}>
          Recurring monthly care packages that top up your membership. Pay with Razorpay to auto-renew every month (cancel anytime), or pay month-by-month with Stripe.
        </Text>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading add-on packages…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load add-on packages. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {packages.map(pkg => {
          const subscription = pkg.mySubscription;
          const isProcessing = processingId === pkg.id;
          return (
            <View key={pkg.id} style={styles.pkgCard}>
              <View style={styles.pkgHeaderRow}>
                <Text style={styles.pkgName}>{pkg.name}</Text>
                {!!subscription && (
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle(subscription.status).bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusStyle(subscription.status).text }]}>{subscription.status}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.pkgPrice}>
                ₹{pkg.priceMonthly.toLocaleString('en-IN')}<Text style={styles.pkgPriceUnit}>/month</Text>
              </Text>
              {!!pkg.description && <Text style={styles.pkgDesc}>{pkg.description}</Text>}

              {subscription ? (
                <View style={styles.pkgActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(pkg)}>
                    <Text style={styles.cancelBtnText}>Cancel Auto-Renewal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.pkgActions}>
                  <TouchableOpacity style={styles.methodSelect} onPress={() => chooseGateway(pkg.id)} disabled={isProcessing}>
                    <Text style={styles.methodSelectText} numberOfLines={1}>
                      {GATEWAYS.find(g => g.key === (gateways[pkg.id] || GATEWAYS[0].key)).label}
                    </Text>
                    <Icon name="arrow-drop-down" size={20} color="#6B7280" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subBtn} onPress={() => handleSubscribe(pkg)} disabled={isProcessing}>
                    {isProcessing ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.subBtnText}>Subscribe</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  introText: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 4 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  pkgCard: { backgroundColor: 'white', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  pkgHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  pkgName: { fontSize: 16, fontWeight: 'bold', color: '#111827', flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10.5, fontWeight: 'bold', textTransform: 'capitalize' },
  pkgPrice: { fontSize: 20, color: '#007AFF', fontWeight: '700', marginTop: 4 },
  pkgPriceUnit: { fontSize: 13, color: '#6B7280', fontWeight: '400' },
  pkgDesc: { fontSize: 12.5, color: '#6B7280', lineHeight: 18, marginTop: 8 },
  pkgActions: { flexDirection: 'row', gap: 8, marginTop: 14 },
  methodSelect: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9 },
  methodSelectText: { fontSize: 12, color: '#374151', flexShrink: 1 },
  subBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  subBtnText: { fontSize: 13, color: 'white', fontWeight: '600' },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: '#EF4444', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
});

export default AddonPackages;
