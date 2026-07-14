import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useMyAddonPackages } from '../../Hooks/useMyAddonPackages';
import { openRazorpayCheckout, openStripeCheckout, extractStripeSessionId } from '../../Utils/paymentGateway';

const GATEWAYS = [
  { key: 'razorpay', label: 'Razorpay (auto-renew)' },
  { key: 'stripe', label: 'Stripe (monthly)' },
];

function statusStyle(status) {
  switch (status) {
    case 'active': return { bg: colors.successBackground, text: colors.success };
    case 'pending': return { bg: colors.warningBackground, text: colors.warning };
    default: return { bg: colors.surfaceSecondary, text: colors.textSecondary };
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
            <ActivityIndicator size="small" color={colors.primary} />
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
                <View style={styles.pkgTitleWrap}>
                  <Icon name="stars" size={18} color={colors.gold || '#FACC15'} />
                  <Text style={styles.pkgName} numberOfLines={2}>{pkg.name}</Text>
                </View>
                <View style={styles.pkgPriceWrap}>
                  <Text style={styles.pkgPrice}>₹{pkg.priceMonthly.toLocaleString('en-IN')}</Text>
                  <Text style={styles.pkgPriceUnit}>/mo</Text>
                </View>
              </View>
              
              {!!subscription && (
                <View style={[styles.statusBadge, { backgroundColor: statusStyle(subscription.status).bg, alignSelf: 'flex-start', marginTop: 4, marginBottom: 4 }]}>
                  <Text style={[styles.statusBadgeText, { color: statusStyle(subscription.status).text }]}>{subscription.status}</Text>
                </View>
              )}
              
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
                    <Icon name="arrow-drop-down" size={20} color={colors.textSecondary} />
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
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  introText: { ...typography.body, color: colors.textSecondary, marginBottom: 8 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { ...typography.labelMedium, color: colors.error },
  pkgCard: { 
    backgroundColor: colors.surface, 
    borderRadius: 16, 
    padding: 16, 
    shadowColor: colors.shadow, 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 1, 
    shadowRadius: 12, 
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 5,
    borderLeftColor: colors.primary,
  },
  pkgHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  pkgTitleWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1, paddingTop: 2 },
  pkgName: { ...typography.h4, color: colors.textPrimary, flex: 1, lineHeight: 22 },
  pkgPriceWrap: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },
  pkgPrice: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: colors.textPrimary },
  pkgPriceUnit: { ...typography.tiny, color: colors.textSecondary, marginTop: -2 },
  pkgDesc: { ...typography.body, color: colors.textSecondary, lineHeight: 20, marginTop: 12 },
  pkgActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  methodSelect: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    borderWidth: 1, 
    borderColor: colors.border, 
    borderRadius: 12, 
    paddingHorizontal: 16, 
    height: 52, 
    backgroundColor: colors.surfaceMuted 
  },
  methodSelectText: { ...typography.body, color: colors.textPrimary, flexShrink: 1 },
  subBtn: { 
    backgroundColor: colors.accent, 
    borderRadius: 24, 
    paddingHorizontal: 24, 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: 52,
    minWidth: 110 
  },
  subBtnText: { ...typography.labelMedium, color: colors.onAccent },
  cancelBtn: { 
    flex: 1, 
    borderWidth: 1.5, 
    borderColor: colors.error, 
    borderRadius: 24, 
    height: 52,
    justifyContent: 'center',
    alignItems: 'center' 
  },
  cancelBtnText: { ...typography.labelMedium, color: colors.error },
});

export default AddonPackages;
