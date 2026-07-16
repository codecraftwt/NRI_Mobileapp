import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { typography } from '../../theme/typography';
import { useMyAddonPackages } from '../../Hooks/useMyAddonPackages';
import { openRazorpayCheckout, openStripeCheckout, extractStripeSessionId } from '../../Utils/paymentGateway';

const GATEWAYS = [
  { key: 'razorpay', label: 'Razorpay', desc: 'UPI, Indian cards — supports auto-renew', icon: 'smartphone' },
  { key: 'stripe', label: 'Stripe', desc: 'International cards — pay month-by-month', icon: 'credit-card' },
];

function statusStyle(status) {
  switch (status) {
    case 'active': return { bg: '#D1FAE5', text: '#059669' };
    case 'pending': return { bg: '#FFEDD5', text: '#C2410C' };
    default: return { bg: '#F3F4F6', text: '#4B5563' };
  }
}

function AddonPackages({ navigation }) {
  const { packages, loading, failed, retry, subscribe, cancelSubscription, verifyPayment, refetch } = useMyAddonPackages();
  const user = useSelector(state => state.user.user);
  const [gateways, setGateways] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [gatewayPickerFor, setGatewayPickerFor] = useState(null);
  const { showAlert, alertProps } = useAppAlert();

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
    setGatewayPickerFor(pkgId);
  };

  const pickGateway = (key) => {
    if (gatewayPickerFor != null) {
      setGateways(prev => ({ ...prev, [gatewayPickerFor]: key }));
    }
    setGatewayPickerFor(null);
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
        showAlert('Subscribed', `You've subscribed to ${pkg.name}.`);
      } else if (result.checkoutUrl) {
        openStripeCheckout(result.checkoutUrl);
        showAlert(
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
                    showAlert('Subscribed', `You've subscribed to ${pkg.name}.`);
                  })
                  .catch((error) => {
                    showAlert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
                  });
              },
            },
          ]
        );
      } else {
        refetch();
        showAlert('Subscribed', result.message || `You've subscribed to ${pkg.name}.`);
      }
    } catch (error) {
      showAlert('Subscription Failed', error?.message || 'Could not complete the subscription. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = (pkg) => {
    showAlert('Cancel Auto-Renewal', `Stop auto-renewal for ${pkg.name}?`, [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Cancel Renewal',
        style: 'destructive',
        onPress: () => {
          cancelSubscription(pkg.mySubscription.id)
            .unwrap()
            .catch((error) => {
              showAlert('Failed', error?.message || 'Could not cancel auto-renewal.');
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D94625']} tintColor="#D94625" />}
      >
        <Text style={styles.introText}>
          Recurring monthly care packages that top up your membership. Pay with Razorpay to auto-renew every month (cancel anytime), or pay month-by-month with Stripe.
        </Text>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#D94625" />
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
                  <Icon name="stars" size={18} color="#FACC15" />
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
                    <Icon name="arrow-drop-down" size={20} color="#64748B" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.subBtn} onPress={() => handleSubscribe(pkg)} disabled={isProcessing}>
                    {isProcessing ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.subBtnText}>Subscribe</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={gatewayPickerFor != null} transparent animationType="slide" onRequestClose={() => setGatewayPickerFor(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setGatewayPickerFor(null)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Payment Method</Text>
            {GATEWAYS.map(g => {
              const selected = gatewayPickerFor != null && (gateways[gatewayPickerFor] || GATEWAYS[0].key) === g.key;
              return (
                <TouchableOpacity key={g.key} style={styles.modalOption} onPress={() => pickGateway(g.key)} activeOpacity={0.7}>
                  <View style={[styles.modalOptionIconBg, selected && styles.modalOptionIconBgActive]}>
                    <Icon name={g.icon} size={20} color={selected ? '#FFFFFF' : '#64748B'} />
                  </View>
                  <View style={styles.modalOptionTextWrap}>
                    <Text style={styles.modalOptionLabel}>{g.label}</Text>
                    <Text style={styles.modalOptionDesc}>{g.desc}</Text>
                  </View>
                  {selected && <Icon name="check-circle" size={22} color="#D94625" />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  introText: { ...typography.body, color: '#64748B', marginBottom: 8 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { ...typography.body, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { ...typography.labelMedium, color: '#EF4444' },
  pkgCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderLeftWidth: 5,
    borderLeftColor: '#D94625',
  },
  pkgHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  pkgTitleWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flex: 1, paddingTop: 2 },
  pkgName: { ...typography.h4, color: '#0F172A', flex: 1, lineHeight: 22 },
  pkgPriceWrap: { alignItems: 'flex-end' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusBadgeText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },
  pkgPrice: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  pkgPriceUnit: { ...typography.tiny, color: '#64748B', marginTop: -2 },
  pkgDesc: { ...typography.body, color: '#64748B', lineHeight: 20, marginTop: 12 },
  pkgActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  methodSelect: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: '#F8FAFC',
  },
  methodSelectText: { ...typography.body, color: '#0F172A', flexShrink: 1 },
  subBtn: {
    backgroundColor: '#D94625',
    borderRadius: 24,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    height: 52,
    minWidth: 110,
  },
  subBtnText: { ...typography.labelMedium, color: '#FFFFFF' },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    borderRadius: 24,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: { ...typography.labelMedium, color: '#EF4444' },

  // ---- Payment Method sheet ----
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 16 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  modalOptionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOptionIconBgActive: { backgroundColor: '#D94625' },
  modalOptionTextWrap: { flex: 1 },
  modalOptionLabel: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  modalOptionDesc: { fontSize: 12, color: '#64748B', marginTop: 2 },
});

export default AddonPackages;
