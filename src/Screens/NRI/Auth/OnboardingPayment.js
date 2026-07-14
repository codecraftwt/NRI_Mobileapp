import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal, FlatList, Dimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { updateProfile, updateMembership } from '../../../Redux/slices/userSlice';
import { addInvoice } from '../../../Redux/slices/walletSlice';
import { useMembershipCheckout } from '../../../Hooks/useMembershipCheckout';
import { openRazorpayCheckout, openStripeCheckout, extractStripeSessionId } from '../../../Utils/paymentGateway';
import { lightColors as colors, typography, spacing, radius } from '../../../theme';

const { width: W, height: H } = Dimensions.get('window');

function OnboardingPayment({ route, navigation }) {
  const { profile, plan, selectedAddons = [] } = route.params || {};
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const {
    coupons, couponsLoading, fetchCoupons,
    couponResult, couponLoading, validateCoupon,
    checkoutLoading, checkout, verifyLoading, verifyPayment,
  } = useMembershipCheckout();

  const [planCouponCode, setPlanCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [autoRenew, setAutoRenew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCouponsModal, setShowCouponsModal] = useState(false);

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

  const handleViewCoupons = () => {
    if (!plan?.id) return;
    fetchCoupons({ planId: plan.id });
    setShowCouponsModal(true);
  };

  const handlePickCoupon = (coupon) => {
    if (!coupon.eligible || !plan?.id) return;
    setPlanCouponCode(coupon.code);
    setShowCouponsModal(false);
    validateCoupon({ planId: plan.id, code: coupon.code })
      .unwrap()
      .then((result) => {
        Alert.alert('Coupon Applied', `Code ${result.code} applied — final amount ₹${result.finalAmount.toLocaleString('en-IN')}.`);
      })
      .catch((error) => {
        Alert.alert('Invalid Coupon', error?.message || 'This coupon could not be applied.');
      });
  };

  const loading = submitting || checkoutLoading || verifyLoading;

  const handlePay = async (overrideAutoRenew) => {
    if (!plan?.id) {
      Alert.alert('No Plan Selected', 'Please go back and choose a membership plan.');
      return;
    }
    const effectiveAutoRenew = overrideAutoRenew ?? autoRenew;
    setSubmitting(true);
    try {
      const result = await checkout({
        planId: plan.id,
        gateway: paymentMethod,
        addons: selectedAddons.map(a => a.id),
        couponCode: planCouponCode.trim() || undefined,
        autoRenew: effectiveAutoRenew,
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
          razorpaySubscriptionId: rzpResult.razorpaySubscriptionId,
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
      // Razorpay declines recurring/e-mandate authorization when the card's
      // issuing bank hasn't enabled recurring payments for that card (an
      // RBI e-mandate/bank-side restriction, not something this request can
      // force to succeed) — offer a one-time payment instead of a dead end.
      const isRecurringUnsupported = effectiveAutoRenew && /recurring/i.test(error?.message || '');
      if (isRecurringUnsupported) {
        Alert.alert(
          'Auto-Renew Not Supported',
          "Your card's bank doesn't support recurring/auto-renew payments. You can complete this as a one-time payment now and turn on auto-renew later from a different card or UPI.",
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Pay Once Instead', onPress: () => handlePay(false) },
          ]
        );
      } else {
        Alert.alert('Payment Failed', error?.message || 'Could not complete checkout. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />
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
          <TouchableOpacity style={styles.viewCouponsRow} onPress={handleViewCoupons}>
            <Icon name="local-offer" size={14} color="#7C3AED" />
            <Text style={styles.viewCouponsLink}>View available coupons</Text>
            <Icon name="expand-more" size={16} color="#7C3AED" />
          </TouchableOpacity>
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
              <Text style={styles.autoRenewDesc}>Auto-renewal is available with Razorpay (UPI/Indian cards) only, and can't combine with a coupon. Your card's bank must support recurring/e-mandate payments — if it doesn't, you can pay once now and enable this later.</Text>
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
            <TouchableOpacity style={styles.payBtn} onPress={() => handlePay()}>
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

      <Modal visible={showCouponsModal} transparent animationType="fade" onRequestClose={() => setShowCouponsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCouponsModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Available Coupons</Text>
            {couponsLoading ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.gatewayDesc}>Loading coupons…</Text>
              </View>
            ) : (
              <FlatList
                data={coupons}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => handlePickCoupon(item)}
                    disabled={!item.eligible}
                  >
                    <View style={styles.modalOptionTextWrap}>
                      <Text style={[styles.couponCodeText, !item.eligible && styles.couponIneligibleText]}>
                        {item.code} · {item.valueLabel}
                      </Text>
                      {!!item.description && <Text style={styles.couponDescText}>{item.description}</Text>}
                      {!item.eligible && !!item.reason && <Text style={styles.couponReasonText}>{item.reason}</Text>}
                    </View>
                    {item.eligible && <Icon name="chevron-right" size={20} color="#007AFF" />}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.modalEmptyText}>No coupons available right now.</Text>}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  // Dynamic Background Layers matching Auth screen
  bgShape1: { position: 'absolute', top: -H * 0.15, right: -W * 0.3, width: W * 1.5, height: H * 0.5, backgroundColor: '#E0F2FE' + '60', borderRadius: 80, transform: [{ rotate: '-25deg' }] },
  bgShape2: { position: 'absolute', bottom: -H * 0.2, left: -W * 0.4, width: W * 1.5, height: H * 0.4, backgroundColor: '#FFEDD5' + '60', borderRadius: 60, transform: [{ rotate: '-35deg' }] },
  bgShape3: { position: 'absolute', top: '35%', left: -W * 0.1, width: W * 1.2, height: H * 0.05, backgroundColor: '#0ea5e9' + '10', borderRadius: 20, transform: [{ rotate: '15deg' }] },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40, paddingTop: spacing.md, gap: 16 },
  eyebrow: { fontSize: 12, color: colors.primary, fontFamily: 'Montserrat-Bold', letterSpacing: 1, textAlign: 'center', marginTop: 8 },
  title: { fontSize: 26, fontFamily: 'Montserrat-Bold', color: '#1A1A1A', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8, paddingHorizontal: spacing.md },
  card: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.xl, shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardHeaderText: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  planChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.primaryLight + '20', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  planChipText: { fontSize: 13, color: colors.primary, fontFamily: 'Montserrat-Bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#64748B', flex: 1, marginRight: 8 },
  rowValue: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  addonsHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  addonsHeaderText: { fontSize: 11, color: '#94A3B8', fontFamily: 'Montserrat-Bold', letterSpacing: 0.5 },
  amountPayableLabel: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  amountPayableValue: { fontSize: 20, fontFamily: 'Montserrat-Bold', color: colors.primary },
  couponLabel: { fontSize: 11, color: '#94A3B8', fontFamily: 'Montserrat-Bold', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, paddingHorizontal: 16, height: 48, color: '#1E293B', fontSize: 14, fontFamily: 'Poppins-Regular' },
  applyBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: 20, justifyContent: 'center', minWidth: 64, alignItems: 'center' },
  applyBtnText: { color: colors.primary, fontFamily: 'Montserrat-Bold', fontSize: 14 },
  viewCouponsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12 },
  viewCouponsLink: { fontSize: 13, color: colors.primary, fontFamily: 'Montserrat-SemiBold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '60%', paddingBottom: 24, paddingTop: 16 },
  modalTitle: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalOptionTextWrap: { flex: 1 },
  modalEmptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#94A3B8', padding: 24, textAlign: 'center' },
  couponCodeText: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: '#111827' },
  couponIneligibleText: { color: '#9CA3AF' },
  couponDescText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#6B7280', marginTop: 4 },
  couponReasonText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: colors.error, marginTop: 4 },
  gatewayIntro: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#64748B', marginBottom: 16 },
  gatewayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: radius.lg, padding: 16, marginBottom: 12 },
  gatewayRowActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight + '10' },
  gatewayName: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: '#1E293B' },
  gatewayDesc: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#94A3B8', marginTop: 4 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1' },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  autoRenewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F8FAFC', borderRadius: radius.lg, padding: 16, marginTop: 8 },
  autoRenewRowDisabled: { opacity: 0.55 },
  autoRenewLabel: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: '#1E293B' },
  autoRenewDesc: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#94A3B8', marginTop: 4, lineHeight: 18 },
  payBtn: { flexDirection: 'row', backgroundColor: colors.accent, height: 56, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24, shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  payBtnText: { color: 'white', fontSize: 16, fontFamily: 'Montserrat-Bold' },
  payLoading: { marginTop: 20 },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 20 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontSize: 11, fontFamily: 'Montserrat-SemiBold', color: '#64748B' },
});

export default OnboardingPayment;
