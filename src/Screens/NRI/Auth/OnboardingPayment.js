import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, Dimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useStripe } from '@stripe/stripe-react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { updateProfile, updateMembership } from '../../../Redux/slices/userSlice';
import { addInvoice } from '../../../Redux/slices/walletSlice';
import { usePlans } from '../../../Hooks/usePlans';
import { useMembershipCheckout } from '../../../Hooks/useMembershipCheckout';
import { openRazorpayCheckout } from '../../../Utils/paymentGateway';
import { lightColors as baseColors, typography, spacing, radius } from '../../../theme';

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};
const colors = C;

const { width: W, height: H } = Dimensions.get('window');

const GST_RATE = 0.18;

function toAmount(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatUsd(amount) {
  return `$${toAmount(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function convertPlanAmountToUsd(amount, plan) {
  const usdPrice = toAmount(plan?.usdPrice);
  const basePrice = toAmount(plan?.price);
  const sourceAmount = toAmount(amount);

  if (!sourceAmount) return 0;
  if (usdPrice && basePrice) return (sourceAmount / basePrice) * usdPrice;
  return sourceAmount;
}

function OnboardingPayment({ route, navigation }) {
  const { profile } = route.params || {};
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { regularPlans, loading: plansLoading, failed: plansFailed, retry: retryPlans } = usePlans();
  const plan = regularPlans.find(p => p.isPopular) || regularPlans[0] || null;
  const {
    coupons, couponsLoading, fetchCoupons,
    couponResult, couponLoading, validateCoupon,
    checkoutLoading, checkout, verifyLoading, verifyPayment,
  } = useMembershipCheckout();

  const [planCouponCode, setPlanCouponCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [submitting, setSubmitting] = useState(false);
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

  const showAlert = (title, message, type = 'info') => {
    setCustomAlert({ visible: true, title, message, type });
  };

  const hideAlert = () => {
    setCustomAlert(prev => ({ ...prev, visible: false }));
  };

  const basePrice = plan?.price || 0;
  const planDiscount = couponResult?.discount || 0;
  const taxableAmount = Math.max(0, basePrice - planDiscount);
  const gstAmount = Math.round(taxableAmount * GST_RATE * 100) / 100;
  const amountPayable = taxableAmount + gstAmount;

  const handleApplyPlanCoupon = () => {
    if (!planCouponCode.trim()) return;
    validateCoupon({ code: planCouponCode.trim() })
      .unwrap()
      .then((result) => {
        const finalAmount = basePrice - convertPlanAmountToUsd(result.discount, plan);
        showAlert('Coupon Applied', `Code ${result.code} applied — final amount ${formatUsd(finalAmount)}.`, 'success');
      })
      .catch((error) => {
        showAlert('Invalid Coupon', error?.message || 'This coupon could not be applied.', 'error');
      });
  };

  const handleViewCoupons = () => {
    if (!plan?.id) return;
    fetchCoupons({ planId: plan.id });
    setShowCouponsModal(true);
  };

  const handlePickCoupon = (coupon) => {
    if (!coupon.eligible) return;
    setPlanCouponCode(coupon.code);
    setShowCouponsModal(false);
    validateCoupon({ code: coupon.code })
      .unwrap()
      .then((result) => {
        const finalAmount = basePrice - convertPlanAmountToUsd(result.discount, plan);
        showAlert('Coupon Applied', `Code ${result.code} applied — final amount ${formatUsd(finalAmount)}.`, 'success');
      })
      .catch((error) => {
        showAlert('Invalid Coupon', error?.message || 'This coupon could not be applied.', 'error');
      });
  };

  const loading = submitting || checkoutLoading || verifyLoading;

  const handlePay = async () => {
    if (!plan) {
      showAlert('No Plan Selected', 'Please go back and choose a membership plan.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const result = await checkout({
        gateway: paymentMethod,
        couponCode: planCouponCode.trim() || undefined,
        autoRenew: false,
        useWallet: false,
      }).unwrap();

      const finishUp = () => {
        dispatch(updateProfile({
          countryOfResidence: profile?.countryOfResidence,
          stateProvince: profile?.stateProvince,
          city: profile?.city,
          homeState: profile?.homeState,
          phone: profile?.phone,
          whatsapp: profile?.whatsapp,
        }));
        dispatch(updateMembership(plan?.name));
        dispatch(addInvoice({
          id: `INV-2026-${Date.now().toString().slice(-4)}`,
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          description: `${plan?.name} Membership Plan (Annual)`,
          amount: basePrice,
          status: 'Paid',
          cgst: 0,
          sgst: 0,
          igst: gstAmount,
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
      } else if (result.clientSecret) {
        const { error: initError } = await initPaymentSheet({
          paymentIntentClientSecret: result.clientSecret,
          merchantDisplayName: 'NRI Circle',
          defaultBillingDetails: { name: user?.name, email: user?.email, phone: user?.phone },
        });
        if (initError) throw new Error(initError.message);

        const { error: presentError } = await presentPaymentSheet();
        if (presentError) {
          // User closed the sheet without paying — not a failure, just bail quietly.
          if (presentError.code === 'Canceled') return;
          throw new Error(presentError.message);
        }

        await verifyPayment({ paymentId: result.paymentId }).unwrap();
        finishUp();
      } else if (paymentMethod === 'stripe') {
        // Stripe was selected but checkout returned nothing PaymentSheet can use —
        // surface the raw backend payload so we can see its true shape.
        throw new Error(`No usable client secret. Raw response: ${JSON.stringify(result.raw)}`);
      } else {
        finishUp();
      }
    } catch (error) {
      showAlert('Payment Failed', error?.message || 'Could not complete checkout. Please try again.', 'error');
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
        <StepIndicator steps={ONBOARDING_STEPS} currentStep={2} />

        <Text style={styles.eyebrow}>STEP 2 · PAYMENT</Text>
        <Text style={styles.title}>Complete your purchase</Text>
        <Text style={styles.subtitle}>Review your selection and choose how you'd like to pay.</Text>

        {plansLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>Loading your plan…</Text>
          </View>
        ) : plansFailed || !plan ? (
          <TouchableOpacity style={styles.retryBox} onPress={retryPlans}>
            <Text style={styles.retryText}>Couldn't load your plan. Tap to retry.</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Icon name="receipt-long" size={16} color={C.primary} />
                <Text style={styles.cardHeaderText}>Order Summary</Text>
              </View>

              <View style={styles.planChip}>
                <Icon name="check-circle" size={14} color={C.primary} />
                <Text style={styles.planChipText}>{plan?.name} Plan</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.rowLabel}>Membership period</Text>
                <Text style={styles.rowValue}>365 days</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Base membership rate</Text>
                <Text style={styles.rowValue}>{formatUsd(basePrice)}</Text>
              </View>
              {planDiscount > 0 && (
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: '#10B981' }]}>Coupon Discount</Text>
                  <Text style={[styles.rowValue, { color: '#10B981' }]}>-{formatUsd(planDiscount)}</Text>
                </View>
              )}
              <View style={styles.row}>
                <Text style={styles.rowLabel}>GST (18%)</Text>
                <Text style={styles.rowValue}>{formatUsd(gstAmount)}</Text>
              </View>

              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.amountPayableLabel}>Amount Payable</Text>
                <Text style={styles.amountPayableValue}>{formatUsd(amountPayable)}</Text>
              </View>

              <Text style={styles.couponLabel}>HAVE A COUPON?</Text>
              <View style={styles.couponRow}>
                <TextInput style={styles.couponInput} placeholder="E.G. WELCOME10" placeholderTextColor="#94A3B8" autoCapitalize="characters" value={planCouponCode} onChangeText={setPlanCouponCode} />
                <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPlanCoupon} disabled={couponLoading}>
                  {couponLoading ? <ActivityIndicator size="small" color={C.primary} /> : <Text style={styles.applyBtnText}>Apply</Text>}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.viewCouponsRow} onPress={handleViewCoupons}>
                <Icon name="local-offer" size={14} color={C.accent} />
                <Text style={styles.viewCouponsLink}>View available offers</Text>
                <Icon name="expand-more" size={16} color={C.accent} />
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Icon name="mark-email-read" size={16} color={C.primary} />
                <Text style={styles.cardHeaderText}>Payment Details</Text>
              </View>
              <Text style={styles.gatewayIntro}>Select your preferred international payment gateway below:</Text>

              <TouchableOpacity style={[styles.gatewayRow, paymentMethod === 'stripe' && styles.gatewayRowActive]} onPress={() => setPaymentMethod('stripe')}>
                <Icon name="credit-card" size={22} color={paymentMethod === 'stripe' ? C.primary : '#64748B'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.gatewayName}>Card (Stripe)</Text>
                  <Text style={styles.gatewayDesc}>Accepts major cards (Visa, Mastercard, Amex)</Text>
                </View>
                <View style={[styles.radio, paymentMethod === 'stripe' && styles.radioActive]} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.gatewayRow, paymentMethod === 'razorpay' && styles.gatewayRowActive]} onPress={() => setPaymentMethod('razorpay')}>
                <Icon name="smartphone" size={22} color={paymentMethod === 'razorpay' ? C.primary : '#64748B'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.gatewayName}>UPI / Card (Razorpay)</Text>
                  <Text style={styles.gatewayDesc}>UPI, Indian Cards, Netbanking & Wallets</Text>
                </View>
                <View style={[styles.radio, paymentMethod === 'razorpay' && styles.radioActive]} />
              </TouchableOpacity>

              {loading ? (
                <ActivityIndicator size="large" color={C.accent} style={styles.payLoading} />
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
          </>
        )}
      </ScrollView>

      <Modal visible={showCouponsModal} transparent animationType="fade" onRequestClose={() => setShowCouponsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCouponsModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Available Coupons</Text>
            {couponsLoading ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="small" color={C.primary} />
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
                    {item.eligible && <Icon name="chevron-right" size={20} color={C.primary} />}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.modalEmptyText}>No coupons available right now.</Text>}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={customAlert.visible} transparent animationType="fade" onRequestClose={hideAlert}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[styles.alertIconWrap, customAlert.type === 'error' ? styles.alertIconError : styles.alertIconSuccess]}>
              <Icon name={customAlert.type === 'error' ? "error-outline" : "check-circle-outline"} size={36} color={customAlert.type === 'error' ? '#EF4444' : '#10B981'} />
            </View>
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMessage}>{customAlert.message}</Text>
            <TouchableOpacity style={styles.alertBtn} onPress={hideAlert}>
              <Text style={styles.alertBtnText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  // Dynamic Background Layers matching Auth screen
  bgShape1: { position: 'absolute', top: -H * 0.15, right: -W * 0.3, width: W * 1.5, height: H * 0.5, backgroundColor: C.primary + '10', borderRadius: 80, transform: [{ rotate: '-25deg' }] },
  bgShape2: { position: 'absolute', bottom: -H * 0.2, left: -W * 0.4, width: W * 1.5, height: H * 0.4, backgroundColor: C.accent + '10', borderRadius: 60, transform: [{ rotate: '-35deg' }] },
  bgShape3: { position: 'absolute', top: '35%', left: -W * 0.1, width: W * 1.2, height: H * 0.05, backgroundColor: C.primary + '05', borderRadius: 20, transform: [{ rotate: '15deg' }] },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40, paddingTop: spacing.md, gap: 16 },
  eyebrow: { fontSize: 12, color: colors.primary, fontFamily: 'Montserrat-Bold', letterSpacing: 1, textAlign: 'center', marginTop: 8 },
  title: { fontSize: 26, fontFamily: 'Montserrat-Bold', color: '#1A1A1A', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8, paddingHorizontal: spacing.md },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.xl, shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardHeaderText: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  planChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.primary + '15', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 16 },
  planChipText: { fontSize: 13, color: colors.primary, fontFamily: 'Montserrat-Bold' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  rowLabel: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#64748B', flex: 1, marginRight: 8 },
  rowValue: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: '#1E293B' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  amountPayableLabel: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  amountPayableValue: { fontSize: 20, fontFamily: 'Montserrat-Bold', color: colors.primary },
  couponLabel: { fontSize: 11, color: '#94A3B8', fontFamily: 'Montserrat-Bold', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, paddingHorizontal: 16, height: 48, color: '#1E293B', fontSize: 14, fontFamily: 'Poppins-Regular' },
  applyBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: 20, justifyContent: 'center', minWidth: 64, alignItems: 'center' },
  applyBtnText: { color: colors.primary, fontFamily: 'Montserrat-Bold', fontSize: 14 },
  viewCouponsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 12 },
  viewCouponsLink: { fontSize: 13, color: colors.accent, fontFamily: 'Montserrat-SemiBold' },
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
  gatewayRowActive: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  gatewayName: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: '#1E293B' },
  gatewayDesc: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#94A3B8', marginTop: 4 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1' },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  payBtn: { flexDirection: 'row', backgroundColor: colors.accent, height: 56, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24, shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  payBtnText: { color: 'white', fontSize: 16, fontFamily: 'Montserrat-Bold' },
  payLoading: { marginTop: 20 },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 20 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { fontSize: 11, fontFamily: 'Montserrat-SemiBold', color: '#64748B' },
  alertOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertBox: { backgroundColor: '#fff', borderRadius: radius.xl, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  alertIconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  alertIconSuccess: { backgroundColor: '#D1FAE5' },
  alertIconError: { backgroundColor: '#FEE2E2' },
  alertTitle: { fontSize: 18, fontFamily: 'Montserrat-Bold', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  alertMessage: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  alertBtn: { backgroundColor: C.primary, width: '100%', height: 48, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center' },
  alertBtnText: { color: 'white', fontSize: 15, fontFamily: 'Montserrat-Bold' },
});

export default OnboardingPayment;
