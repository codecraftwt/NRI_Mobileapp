import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import apiClient from '../../Api/client';
import { usePlans } from '../../Hooks/usePlans';
import { useAddonPackages } from '../../Hooks/useAddonPackages';
import { useMembershipCheckout } from '../../Hooks/useMembershipCheckout';
import { useMembership } from '../../Hooks/useMembership';
import { openRazorpayCheckout, openStripeCheckout, extractStripeSessionId } from '../../Utils/paymentGateway';

function MembershipCheckout({ navigation, route }) {
  const { mode = 'new', planId: initialPlanId } = route.params || {};
  const user = useSelector(state => state.user.user);

  const { regularPlans, loading: plansLoading, failed: plansFailed, retry: retryPlans } = usePlans();
  const { packages, loading: packagesLoading, failed: packagesFailed, retry: retryPackages } = useAddonPackages();
  const { retry: refetchMembership } = useMembership();
  const {
    couponResult, couponLoading, validateCoupon, clearCoupon,
    checkoutLoading, checkout,
    verifyLoading, verifyPayment,
  } = useMembershipCheckout();

  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId || null);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [planCouponCode, setPlanCouponCode] = useState('');
  const [addonCouponCode, setAddonCouponCode] = useState('');
  const [gateway, setGateway] = useState('razorpay');
  const [autoRenew, setAutoRenew] = useState(false);
  const [useWallet, setUseWallet] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!selectedPlanId && regularPlans.length > 0) {
      setSelectedPlanId(regularPlans[0].id);
    }
  }, [regularPlans, selectedPlanId]);

  useEffect(() => {
    // Read-only balance check for the "use wallet credits" toggle — not part
    // of the wallet feature itself, so kept as a plain local fetch rather
    // than a full slice/hook.
    apiClient.get('/customer/wallet')
      .then(res => setWalletBalance(res.data?.data?.balance || 0))
      .catch(() => setWalletBalance(0));
  }, []);

  // auto_renew is Razorpay-only and cannot combine with a coupon or wallet credits.
  const autoRenewAllowed = gateway === 'razorpay' && !planCouponCode.trim() && !addonCouponCode.trim() && !useWallet;
  useEffect(() => {
    if (!autoRenewAllowed && autoRenew) setAutoRenew(false);
  }, [autoRenewAllowed, autoRenew]);

  const selectedPlan = regularPlans.find(p => p.id === selectedPlanId) || null;
  const selectedAddons = packages.filter(p => selectedAddonIds.includes(p.id));
  const addonsSubtotal = selectedAddons.reduce((sum, p) => sum + p.priceMonthly, 0);
  const planDiscount = couponResult?.discount || 0;
  const amountPayable = Math.max(0, (selectedPlan?.price || 0) - planDiscount) + addonsSubtotal;

  const toggleAddon = (id) => {
    setSelectedAddonIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleApplyPlanCoupon = () => {
    if (!selectedPlanId || !planCouponCode.trim()) return;
    validateCoupon({ planId: selectedPlanId, code: planCouponCode.trim() })
      .unwrap()
      .then((result) => {
        Alert.alert('Coupon Applied', `Code ${result.code} applied — final amount ₹${result.finalAmount.toLocaleString('en-IN')}.`);
      })
      .catch((error) => {
        Alert.alert('Invalid Coupon', error?.message || 'This coupon could not be applied.');
      });
  };

  const handleSubmit = async () => {
    if (!selectedPlanId) {
      Alert.alert('Select a Plan', 'Please choose a membership plan to continue.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await checkout({
        planId: selectedPlanId,
        gateway,
        addons: selectedAddonIds,
        couponCode: planCouponCode.trim() || undefined,
        addonCouponCode: addonCouponCode.trim() || undefined,
        autoRenew,
        useWallet,
      }).unwrap();

      if (result.order) {
        // Razorpay — hand the order to the native checkout SDK.
        const rzpResult = await openRazorpayCheckout({
          order: result.order,
          name: 'NRI Circle',
          description: `${selectedPlan?.name || 'Membership'} Plan`,
          user,
        });
        await verifyPayment({
          paymentId: result.paymentId,
          razorpayOrderId: rzpResult.razorpayOrderId,
          razorpayPaymentId: rzpResult.razorpayPaymentId,
          razorpaySignature: rzpResult.razorpaySignature,
        }).unwrap();
        refetchMembership();
        Alert.alert('Membership Activated', 'Your membership payment was verified successfully.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (result.checkoutUrl) {
        // Stripe — open the hosted checkout page; there's no in-app return
        // callback, so the user confirms completion manually.
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
                    refetchMembership();
                    Alert.alert('Membership Activated', 'Your membership payment was verified successfully.', [
                      { text: 'OK', onPress: () => navigation.goBack() },
                    ]);
                  })
                  .catch((error) => {
                    Alert.alert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
                  });
              },
            },
          ]
        );
      } else {
        // Wallet credits covered the full amount — already activated.
        refetchMembership();
        Alert.alert('Membership Activated', result.message || 'Your wallet balance covered the full amount — your membership is now active.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Checkout Failed', error?.message || 'Could not complete checkout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'renew' ? 'Renew Membership' : mode === 'upgrade' ? 'Upgrade Membership' : 'Choose a Plan';

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={title} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Plan</Text>
          {plansLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.hint}>Loading plans…</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {regularPlans.map(plan => (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planRow, selectedPlanId === plan.id && styles.planRowSelected]}
                  onPress={() => { setSelectedPlanId(plan.id); clearCoupon(); setPlanCouponCode(''); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    {plan.isPopular && <Text style={styles.planPopular}>Most popular</Text>}
                  </View>
                  <Text style={styles.planPrice}>₹{plan.price.toLocaleString('en-IN')}/yr</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {plansFailed && (
            <TouchableOpacity onPress={retryPlans}>
              <Text style={styles.retryText}>Couldn't load plans. Tap to retry.</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Optional Add-on Packages</Text>
          {packagesLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.hint}>Loading add-ons…</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {packages.map(pkg => {
                const checked = selectedAddonIds.includes(pkg.id);
                return (
                  <TouchableOpacity key={pkg.id} style={[styles.addonRow, checked && styles.planRowSelected]} onPress={() => toggleAddon(pkg.id)}>
                    <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                      {checked && <Icon name="check" size={13} color="white" />}
                    </View>
                    <Text style={styles.planName} numberOfLines={1}>{pkg.name}</Text>
                    <Text style={styles.planPrice}>₹{pkg.priceMonthly.toLocaleString('en-IN')}/mo</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          {packagesFailed && (
            <TouchableOpacity onPress={retryPackages}>
              <Text style={styles.retryText}>Couldn't load add-on packages. Tap to retry.</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{selectedPlan?.name || 'Plan'}</Text>
            <Text style={styles.rowValue}>₹{(selectedPlan?.price || 0).toLocaleString('en-IN')}</Text>
          </View>
          {planDiscount > 0 && (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, styles.discountText]}>Plan coupon discount</Text>
              <Text style={[styles.rowValue, styles.discountText]}>-₹{planDiscount.toLocaleString('en-IN')}</Text>
            </View>
          )}
          {selectedAddons.map(pkg => (
            <View key={pkg.id} style={styles.row}>
              <Text style={styles.rowLabel} numberOfLines={1}>+ {pkg.name}</Text>
              <Text style={styles.rowValue}>₹{pkg.priceMonthly.toLocaleString('en-IN')}/mo</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount Payable</Text>
            <Text style={styles.totalValue}>₹{amountPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>

          <Text style={styles.couponLabel}>Have a plan coupon?</Text>
          <View style={styles.couponRow}>
            <TextInput style={styles.couponInput} placeholder="E.G. WELCOME20" placeholderTextColor="#9CA3AF" autoCapitalize="characters" value={planCouponCode} onChangeText={setPlanCouponCode} />
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPlanCoupon} disabled={couponLoading}>
              {couponLoading ? <ActivityIndicator size="small" color="#007AFF" /> : <Text style={styles.applyBtnText}>Apply</Text>}
            </TouchableOpacity>
          </View>

          {selectedAddons.length > 0 && (
            <>
              <Text style={styles.couponLabel}>Have an add-on coupon?</Text>
              <TextInput style={styles.couponInput} placeholder="E.G. CARE499" placeholderTextColor="#9CA3AF" autoCapitalize="characters" value={addonCouponCode} onChangeText={setAddonCouponCode} />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Details</Text>

          <TouchableOpacity style={[styles.gatewayRow, gateway === 'razorpay' && styles.planRowSelected]} onPress={() => setGateway('razorpay')}>
            <Icon name="smartphone" size={20} color={gateway === 'razorpay' ? '#007AFF' : '#64748B'} />
            <Text style={styles.planName}>UPI / Card (Razorpay)</Text>
            <View style={[styles.radio, gateway === 'razorpay' && styles.radioActive]} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gatewayRow, gateway === 'stripe' && styles.planRowSelected]} onPress={() => setGateway('stripe')}>
            <Icon name="credit-card" size={20} color={gateway === 'stripe' ? '#007AFF' : '#64748B'} />
            <Text style={styles.planName}>Card (Stripe)</Text>
            <View style={[styles.radio, gateway === 'stripe' && styles.radioActive]} />
          </TouchableOpacity>

          <View style={[styles.switchRow, !autoRenewAllowed && styles.switchRowDisabled]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Auto-renew my membership</Text>
              <Text style={styles.hint}>Razorpay only — can't combine with a coupon or wallet credits.</Text>
            </View>
            <Switch value={autoRenew} onValueChange={setAutoRenew} disabled={!autoRenewAllowed} />
          </View>

          <View style={[styles.switchRow, walletBalance <= 0 && styles.switchRowDisabled]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Use wallet credits</Text>
              <Text style={styles.hint}>Available balance: ₹{walletBalance.toLocaleString('en-IN')}</Text>
            </View>
            <Switch value={useWallet} onValueChange={setUseWallet} disabled={walletBalance <= 0} />
          </View>

          {(submitting || checkoutLoading || verifyLoading) ? (
            <ActivityIndicator size="large" color="#FF7C1A" style={styles.payLoading} />
          ) : (
            <TouchableOpacity style={styles.payBtn} onPress={handleSubmit} disabled={!selectedPlanId}>
              <Icon name="lock" size={16} color="white" />
              <Text style={styles.payBtnText}>Pay ₹{amountPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 16, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B', marginBottom: 4 },
  hint: { fontSize: 11.5, color: '#9CA3AF' },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  retryText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  planRowSelected: { borderColor: '#007AFF', backgroundColor: '#F0F7FF' },
  planName: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#111827' },
  planPopular: { fontSize: 11, color: '#F59E0B', fontWeight: '700', marginTop: 2 },
  planPrice: { fontSize: 13.5, fontWeight: '700', color: '#111827' },

  addonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#007AFF', borderColor: '#007AFF' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  rowLabel: { fontSize: 13, color: '#64748B', flex: 1, marginRight: 8 },
  rowValue: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  discountText: { color: '#10B981' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4 },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },

  couponLabel: { fontSize: 12, color: '#1E293B', fontWeight: '700', marginTop: 8 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, height: 42, color: '#1E293B', fontSize: 13 },
  applyBtn: { borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center', minWidth: 64, alignItems: 'center' },
  applyBtnText: { color: '#007AFF', fontWeight: '700', fontSize: 13 },

  gatewayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#CBD5E1' },
  radioActive: { borderColor: '#007AFF', backgroundColor: '#007AFF' },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12 },
  switchRowDisabled: { opacity: 0.55 },
  switchLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B' },

  payBtn: { flexDirection: 'row', backgroundColor: '#FF7C1A', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 },
  payBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  payLoading: { marginTop: 12 },
});

export default MembershipCheckout;
