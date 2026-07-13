import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { updateProfile, updateMembership } from '../../../Redux/slices/userSlice';
import { addInvoice } from '../../../Redux/slices/walletSlice';
import { useMembershipCheckout } from '../../../Hooks/useMembershipCheckout';
import { openRazorpayCheckout, openStripeCheckout, extractStripeSessionId } from '../../../Utils/paymentGateway';

function OnboardingPayment({ route, navigation }) {
  const { profile, plan, selectedAddons = [] } = route.params || {};
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const { couponResult, couponLoading, validateCoupon, checkoutLoading, checkout, verifyLoading, verifyPayment } = useMembershipCheckout();

  const [planCouponCode, setPlanCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [autoRenew, setAutoRenew] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const basePrice = plan?.price || 0;
  const addonsSubtotal = selectedAddons.reduce((sum, a) => sum + a.priceMonthly, 0);
  const planDiscount = couponResult?.discount || 0;
  const amountPayable = Math.max(0, basePrice - planDiscount) + addonsSubtotal;

  // auto_renew is Razorpay-only and can't combine with a coupon.
  const autoRenewAllowed = paymentMethod === 'razorpay' && !planCouponCode.trim();
  useEffect(() => {
    if (!autoRenewAllowed && autoRenew) setAutoRenew(false);
  }, [autoRenewAllowed, autoRenew]);

  const handleApplyPlanCoupon = () => {
    if (!plan?.id || !planCouponCode.trim()) return;
    validateCoupon({ planId: plan.id, code: planCouponCode.trim() })
      .unwrap()
      .then((result) => {
        Alert.alert('Coupon Applied', `Code ${result.code} applied — final amount ₹${result.finalAmount.toLocaleString('en-IN')}.`);
      })
      .catch((error) => {
        Alert.alert('Invalid Coupon', error?.message || 'This coupon could not be applied.');
      });
  };

  const loading = submitting || checkoutLoading || verifyLoading;

  const handlePay = async () => {
    if (!plan?.id) {
      Alert.alert('No Plan Selected', 'Please go back and choose a membership plan.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await checkout({
        planId: plan.id,
        gateway: paymentMethod,
        addons: selectedAddons.map(a => a.id),
        couponCode: planCouponCode.trim() || undefined,
        autoRenew,
        useWallet: false,
      }).unwrap();

      const finishUp = () => {
        dispatch(updateProfile({
          countryOfResidence: profile?.countryOfResidence,
          city: profile?.city,
          homeState: profile?.homeState,
          phone: profile?.phone,
        }));
        dispatch(updateMembership(plan?.name));
        dispatch(addInvoice({
          id: `INV-2026-${Date.now().toString().slice(-4)}`,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          description: `${plan?.name} Membership Plan (Annual)${selectedAddons.length ? ` + ${selectedAddons.length} add-on(s)` : ''}`,
          amount: basePrice,
          status: 'Paid',
          cgst: 0,
          sgst: 0,
          igst: 0,
          total: amountPayable,
        }));
        navigation.replace('OnboardingWelcome', { plan });
      };

      if (result.order) {
        const rzpResult = await openRazorpayCheckout({
          order: result.order,
          name: 'NRI Circle',
          description: `${plan?.name || 'Membership'} Plan`,
          user,
        });
        await verifyPayment({
          paymentId: result.paymentId,
          razorpayOrderId: rzpResult.razorpayOrderId,
          razorpayPaymentId: rzpResult.razorpayPaymentId,
          razorpaySignature: rzpResult.razorpaySignature,
        }).unwrap();
        finishUp();
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
                  .then(finishUp)
                  .catch((error) => {
                    Alert.alert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
                  });
              },
            },
          ]
        );
      } else {
        finishUp();
      }
    } catch (error) {
      Alert.alert('Payment Failed', error?.message || 'Could not complete checkout. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <OnboardingTopBar navigation={navigation} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <StepIndicator steps={ONBOARDING_STEPS} currentStep={4} />

        <Text style={styles.eyebrow}>STEP 4 · PAYMENT</Text>
        <Text style={styles.title}>Complete your purchase</Text>
        <Text style={styles.subtitle}>Review your selection, apply a coupon if you have one, and choose how you'd like to pay.</Text>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="receipt-long" size={16} color="#007AFF" />
            <Text style={styles.cardHeaderText}>Order Summary</Text>
          </View>

          <View style={styles.planChip}>
            <Icon name="check-circle" size={14} color="#007AFF" />
            <Text style={styles.planChipText}>{plan?.name} Plan</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>Membership period</Text>
            <Text style={styles.rowValue}>365 days</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Base membership rate</Text>
            <Text style={styles.rowValue}>₹{basePrice.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          {planDiscount > 0 && (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: '#10B981' }]}>Coupon Discount</Text>
              <Text style={[styles.rowValue, { color: '#10B981' }]}>-₹{planDiscount.toLocaleString('en-IN')}</Text>
            </View>
          )}

          {selectedAddons.length > 0 && (
            <>
              <View style={styles.divider} />
              <View style={styles.addonsHeaderRow}>
                <Icon name="layers" size={13} color="#94A3B8" />
                <Text style={styles.addonsHeaderText}>SELECTED ADD-ONS</Text>
              </View>
              {selectedAddons.map(item => (
                <View key={item.id} style={styles.row}>
                  <Text style={styles.rowLabel} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.rowValue}>₹{item.priceMonthly.toLocaleString('en-IN', { minimumFractionDigits: 2 })}/mo</Text>
                </View>
              ))}
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Add-ons subtotal</Text>
                <Text style={styles.rowValue}>₹{addonsSubtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
            </>
          )}

          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.amountPayableLabel}>Amount Payable</Text>
            <Text style={styles.amountPayableValue}>₹{amountPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>

          <Text style={styles.couponLabel}>HAVE A PLAN COUPON?</Text>
          <View style={styles.couponRow}>
            <TextInput style={styles.couponInput} placeholder="E.G. WELCOME20" placeholderTextColor="#94A3B8" autoCapitalize="characters" value={planCouponCode} onChangeText={setPlanCouponCode} />
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPlanCoupon} disabled={couponLoading}>
              {couponLoading ? <ActivityIndicator size="small" color="#007AFF" /> : <Text style={styles.applyBtnText}>Apply</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="mark-email-read" size={16} color="#007AFF" />
            <Text style={styles.cardHeaderText}>Payment Details</Text>
          </View>
          <Text style={styles.gatewayIntro}>Select your preferred international payment gateway below:</Text>

          <TouchableOpacity style={[styles.gatewayRow, paymentMethod === 'stripe' && styles.gatewayRowActive]} onPress={() => setPaymentMethod('stripe')}>
            <Icon name="credit-card" size={22} color={paymentMethod === 'stripe' ? '#007AFF' : '#64748B'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.gatewayName}>Card (Stripe)</Text>
              <Text style={styles.gatewayDesc}>Accepts major cards (Visa, Mastercard, Amex)</Text>
            </View>
            <View style={[styles.radio, paymentMethod === 'stripe' && styles.radioActive]} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.gatewayRow, paymentMethod === 'razorpay' && styles.gatewayRowActive]} onPress={() => setPaymentMethod('razorpay')}>
            <Icon name="smartphone" size={22} color={paymentMethod === 'razorpay' ? '#007AFF' : '#64748B'} />
            <View style={{ flex: 1 }}>
              <Text style={styles.gatewayName}>UPI / Card (Razorpay)</Text>
              <Text style={styles.gatewayDesc}>UPI, Indian Cards, Netbanking & Wallets</Text>
            </View>
            <View style={[styles.radio, paymentMethod === 'razorpay' && styles.radioActive]} />
          </TouchableOpacity>

          <View style={[styles.autoRenewRow, !autoRenewAllowed && styles.autoRenewRowDisabled]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.autoRenewLabel}>Auto-renew my membership</Text>
              <Text style={styles.autoRenewDesc}>Auto-renewal is available with Razorpay (UPI/Indian cards) only, and can't combine with a coupon.</Text>
            </View>
            <Switch
              value={autoRenew}
              onValueChange={setAutoRenew}
              disabled={!autoRenewAllowed}
              trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
              thumbColor={autoRenew ? '#007AFF' : '#9CA3AF'}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#FF7C1A" style={styles.payLoading} />
          ) : (
            <TouchableOpacity style={styles.payBtn} onPress={handlePay}>
              <Icon name="lock" size={16} color="white" />
              <Text style={styles.payBtnText}>Secure Payment & Activation</Text>
            </TouchableOpacity>
          )}

          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Icon name="shield" size={12} color="#10B981" />
              <Text style={styles.trustText}>Secure SSL</Text>
            </View>
            <View style={styles.trustItem}>
              <Icon name="schedule" size={12} color="#F59E0B" />
              <Text style={styles.trustText}>7-Day Refund</Text>
            </View>
            <View style={styles.trustItem}>
              <Icon name="check-circle" size={12} color="#10B981" />
              <Text style={styles.trustText}>Verified Gateway</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF3FA' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  eyebrow: { fontSize: 11, color: '#007AFF', fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginTop: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginTop: 8 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardHeaderText: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  planChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#E5F1FF', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 12 },
  planChipText: { fontSize: 12, color: '#007AFF', fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { fontSize: 13, color: '#64748B', flex: 1, marginRight: 8 },
  rowValue: { fontSize: 13, color: '#1E293B', fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 10 },
  addonsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  addonsHeaderText: { fontSize: 10.5, color: '#94A3B8', fontWeight: '700', letterSpacing: 0.5 },
  amountPayableLabel: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  amountPayableValue: { fontSize: 18, fontWeight: 'bold', color: '#007AFF' },
  couponLabel: { fontSize: 10.5, color: '#94A3B8', fontWeight: '700', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, height: 42, color: '#1E293B', fontSize: 13 },
  applyBtn: { borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center', minWidth: 64, alignItems: 'center' },
  applyBtnText: { color: '#007AFF', fontWeight: '700', fontSize: 13 },
  gatewayIntro: { fontSize: 12.5, color: '#64748B', marginBottom: 12 },
  gatewayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 10, padding: 12, marginBottom: 10 },
  gatewayRowActive: { borderColor: '#007AFF', backgroundColor: '#F0F6FF' },
  gatewayName: { fontSize: 13.5, fontWeight: '700', color: '#1E293B' },
  gatewayDesc: { fontSize: 11.5, color: '#94A3B8', marginTop: 2 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#CBD5E1' },
  radioActive: { borderColor: '#007AFF', backgroundColor: '#007AFF' },
  autoRenewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, marginTop: 4 },
  autoRenewRowDisabled: { opacity: 0.55 },
  autoRenewLabel: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  autoRenewDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  payBtn: { flexDirection: 'row', backgroundColor: '#FF7C1A', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 18 },
  payBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  payLoading: { marginTop: 20 },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trustText: { fontSize: 10.5, color: '#64748B', fontWeight: '600' },
});

export default OnboardingPayment;
