import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch, Modal, FlatList } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import apiClient from '../../Api/client';
import { usePlans } from '../../Hooks/usePlans';
import { useAddonPackages } from '../../Hooks/useAddonPackages';
import { useMembershipCheckout } from '../../Hooks/useMembershipCheckout';
import { useMembership } from '../../Hooks/useMembership';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';
import { lightColors as baseColors, typography, spacing, radius } from '../../theme';
import { Dimensions } from 'react-native';

const { width: W, height: H } = Dimensions.get('window');

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};
const colors = C;

// Plan price, add-on priceMonthly, wallet balance and coupon amounts are all
// USD (same as the rest of the flow) — format with $ instead of the old ₹.
const formatUsd = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function MembershipCheckout({ navigation, route }) {
  const { mode = 'new', planId: initialPlanId } = route.params || {};
  const user = useSelector(state => state.user.user);

  const { regularPlans, loading: plansLoading, failed: plansFailed, retry: retryPlans } = usePlans();
  const { packages, loading: packagesLoading, failed: packagesFailed, retry: retryPackages } = useAddonPackages();
  const { retry: refetchMembership } = useMembership();
  const {
    coupons, couponsLoading, fetchCoupons,
    couponResult, couponLoading, validateCoupon, clearCoupon,
    checkoutLoading, checkout,
    verifyLoading, verifyPayment,
  } = useMembershipCheckout();

  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId || null);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [planCouponCode, setPlanCouponCode] = useState('');
  const [addonCouponCode, setAddonCouponCode] = useState('');
  const [gateway, setGateway] = useState('stripe');
  const [useWallet, setUseWallet] = useState(false);
  // { url, paymentId } while the hosted-checkout WebView (Stripe/PayPal) is open.
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', type: 'info', btnText: 'Got it' });

  const showAlert = (title, message, type = 'info', options = {}) => {
    setCustomAlert({
      visible: true,
      title,
      message,
      type,
      btnText: options.btnText || 'Got it',
      onConfirm: options.onConfirm || null,
      secondaryBtnText: options.secondaryBtnText || null,
      onCancel: options.onCancel || null,
    });
  };

  const handleAlertConfirm = () => {
    const callback = customAlert.onConfirm;
    setCustomAlert(prev => ({ ...prev, visible: false }));
    if (callback) callback();
  };

  const handleAlertCancel = () => {
    const callback = customAlert.onCancel;
    setCustomAlert(prev => ({ ...prev, visible: false }));
    if (callback) callback();
  };

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
        showAlert('Coupon Applied', `Code ${result.code} applied — final amount ${formatUsd(result.finalAmount)}.`, 'success');
      })
      .catch((error) => {
        showAlert('Invalid Coupon', error?.message || 'This coupon could not be applied.', 'error');
      });
  };

  const handleViewCoupons = () => {
    if (!selectedPlanId) return;
    fetchCoupons({ planId: selectedPlanId });
    setShowCouponsModal(true);
  };

  const handlePickCoupon = (coupon) => {
    if (!coupon.eligible || !selectedPlanId) return;
    setPlanCouponCode(coupon.code);
    setShowCouponsModal(false);
    validateCoupon({ planId: selectedPlanId, code: coupon.code })
      .unwrap()
      .then((result) => {
        showAlert('Coupon Applied', `Code ${result.code} applied — final amount ${formatUsd(result.finalAmount)}.`, 'success');
      })
      .catch((error) => {
        showAlert('Invalid Coupon', error?.message || 'This coupon could not be applied.', 'error');
      });
  };

  const handleSubmit = async () => {
    if (!selectedPlanId) {
      showAlert('Select a Plan', 'Please choose a membership plan to continue.', 'error');
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
        autoRenew: false,
        useWallet,
      }).unwrap();

      if (result.checkoutUrl) {
        // Stripe / PayPal — open the hosted checkout page in an in-app WebView.
        // Confirmed in handleCheckoutSuccess once it redirects back with a
        // session_id (see StripeCheckoutModal).
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId });
      } else {
        // Wallet credits covered the full amount — already activated.
        refetchMembership();
        showAlert('Membership Activated', result.message || 'Your wallet balance covered the full amount — your membership is now active.', 'success', {
          btnText: 'OK',
          onConfirm: () => navigation.goBack(),
        });
      }
    } catch (error) {
      showAlert('Checkout Failed', error?.message || 'Could not complete checkout. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Hosted checkout (Stripe/PayPal) redirected back with a session_id — confirm
  // it with the backend, which activates the membership.
  const handleCheckoutSuccess = async (sessionId) => {
    const paymentId = checkoutSession?.paymentId;
    setCheckoutSession(null);
    setSubmitting(true);
    try {
      await verifyPayment({ paymentId, sessionId }).unwrap();
      refetchMembership();
      showAlert('Membership Activated', 'Your membership payment was verified successfully.', 'success', {
        btnText: 'OK',
        onConfirm: () => navigation.goBack(),
      });
    } catch (error) {
      showAlert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckoutCancel = () => setCheckoutSession(null);

  const title = mode === 'renew' ? 'Renew Membership' : mode === 'upgrade' ? 'Upgrade Membership' : 'Choose a Plan';

  return (
    <View style={styles.container}>
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />
      <Header navigation={navigation} title={title} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Plan</Text>
          {plansLoading ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color={C.primary} />
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
                  <Text style={styles.planPrice}>{formatUsd(plan.price)}/yr</Text>
                  <View style={[styles.radio, selectedPlanId === plan.id && styles.radioActive]} />
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
              <ActivityIndicator size="small" color={C.primary} />
              <Text style={styles.hint}>Loading add-ons…</Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {packages.map(pkg => {
                const checked = selectedAddonIds.includes(pkg.id);
                return (
                  <TouchableOpacity key={pkg.id} style={[styles.addonRow, checked && styles.planRowSelected]} onPress={() => toggleAddon(pkg.id)}>
                    <View style={[styles.addonCheckbox, checked && styles.addonCheckboxChecked]}>
                      {checked && <Icon name="check" size={14} color="white" />}
                    </View>
                    <Text style={styles.addonName} numberOfLines={1}>{pkg.name}</Text>
                    <Text style={styles.planPrice}>{formatUsd(pkg.priceMonthly)}/mo</Text>
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
            <Text style={styles.rowValue}>{formatUsd(selectedPlan?.price)}</Text>
          </View>
          {planDiscount > 0 && (
            <View style={styles.row}>
              <Text style={[styles.rowLabel, styles.discountText]}>Plan coupon discount</Text>
              <Text style={[styles.rowValue, styles.discountText]}>-{formatUsd(planDiscount)}</Text>
            </View>
          )}
          {selectedAddons.map(pkg => (
            <View key={pkg.id} style={styles.row}>
              <Text style={styles.rowLabel} numberOfLines={1}>+ {pkg.name}</Text>
              <Text style={styles.rowValue}>{formatUsd(pkg.priceMonthly)}/mo</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Amount Payable</Text>
            <Text style={styles.totalValue}>{formatUsd(amountPayable)}</Text>
          </View>

          <Text style={styles.couponLabel}>Have a plan coupon?</Text>
          <View style={styles.couponRow}>
            <TextInput style={styles.couponInput} placeholder="E.G. WELCOME20" placeholderTextColor="#9CA3AF" autoCapitalize="characters" value={planCouponCode} onChangeText={setPlanCouponCode} />
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPlanCoupon} disabled={couponLoading}>
              {couponLoading ? <ActivityIndicator size="small" color={C.primary} /> : <Text style={styles.applyBtnText}>Apply</Text>}
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.viewCouponsRow} onPress={handleViewCoupons}>
            <Icon name="local-offer" size={14} color={C.accent} />
            <Text style={styles.viewCouponsLink}>View available coupons</Text>
            <Icon name="expand-more" size={16} color={C.accent} />
          </TouchableOpacity>

          {selectedAddons.length > 0 && (
            <>
              <Text style={styles.couponLabel}>Have an add-on coupon?</Text>
              <TextInput style={styles.couponInput} placeholder="E.G. CARE499" placeholderTextColor="#9CA3AF" autoCapitalize="characters" value={addonCouponCode} onChangeText={setAddonCouponCode} />
            </>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Details</Text>

          <TouchableOpacity style={[styles.gatewayRow, gateway === 'stripe' && styles.planRowSelected]} onPress={() => setGateway('stripe')}>
            <Icon name="credit-card" size={20} color={gateway === 'stripe' ? C.primary : '#64748B'} />
            <Text style={styles.planName}>Card (Stripe)</Text>
            <View style={[styles.radio, gateway === 'stripe' && styles.radioActive]} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.gatewayRow, gateway === 'paypal' && styles.planRowSelected]} onPress={() => setGateway('paypal')}>
            <Icon name="account-balance-wallet" size={20} color={gateway === 'paypal' ? C.primary : '#64748B'} />
            <Text style={styles.planName}>PayPal</Text>
            <View style={[styles.radio, gateway === 'paypal' && styles.radioActive]} />
          </TouchableOpacity>

          <View style={[styles.switchRow, walletBalance <= 0 && styles.switchRowDisabled]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Use wallet credits</Text>
              <Text style={styles.hint}>Available balance: {formatUsd(walletBalance)}</Text>
            </View>
            <Switch value={useWallet} onValueChange={setUseWallet} disabled={walletBalance <= 0} />
          </View>

          {(submitting || checkoutLoading || verifyLoading) ? (
            <ActivityIndicator size="large" color={C.accent} style={styles.payLoading} />
          ) : (
            <TouchableOpacity style={styles.payBtn} onPress={handleSubmit} disabled={!selectedPlanId}>
              <Icon name="lock" size={16} color="white" />
              <Text style={styles.payBtnText}>Pay {formatUsd(amountPayable)}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={showCouponsModal} transparent animationType="fade" onRequestClose={() => setShowCouponsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCouponsModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Available Coupons</Text>
            {couponsLoading ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="small" color={C.primary} />
                <Text style={styles.hint}>Loading coupons…</Text>
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

      <Modal visible={customAlert.visible} transparent animationType="fade" onRequestClose={handleAlertCancel}>
        <View style={styles.alertOverlay}>
          <View style={styles.alertBox}>
            <View style={[
              styles.alertIconWrap, 
              customAlert.type === 'error' ? styles.alertIconError : 
              customAlert.type === 'success' ? styles.alertIconSuccess : styles.alertIconInfo
            ]}>
              <Icon name={customAlert.type === 'error' ? "error-outline" : customAlert.type === 'success' ? "check-circle-outline" : "info-outline"} size={36} color={customAlert.type === 'error' ? '#EF4444' : customAlert.type === 'success' ? '#10B981' : C.primary} />
            </View>
            <Text style={styles.alertTitle}>{customAlert.title}</Text>
            <Text style={styles.alertMessage}>{customAlert.message}</Text>
            
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              {customAlert.secondaryBtnText && (
                <TouchableOpacity style={[styles.alertBtn, styles.alertBtnSecondary]} onPress={handleAlertCancel}>
                  <Text style={[styles.alertBtnText, styles.alertBtnTextSecondary]}>{customAlert.secondaryBtnText}</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.alertBtn, { flex: 1 }]} onPress={handleAlertConfirm}>
                <Text style={styles.alertBtnText}>{customAlert.btnText}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StripeCheckoutModal
        visible={!!checkoutSession}
        checkoutUrl={checkoutSession?.url}
        onSuccess={handleCheckoutSuccess}
        onCancel={handleCheckoutCancel}
        title="Secure Payment"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', position: 'relative', overflow: 'hidden' },
  bgShape1: { position: 'absolute', top: -H * 0.1, right: -W * 0.2, width: W * 1.2, height: H * 0.4, backgroundColor: C.primary + '08', borderRadius: 100, transform: [{ rotate: '-25deg' }] },
  bgShape2: { position: 'absolute', bottom: -H * 0.1, left: -W * 0.3, width: W * 1.2, height: H * 0.3, backgroundColor: C.accent + '08', borderRadius: 80, transform: [{ rotate: '-35deg' }] },
  bgShape3: { position: 'absolute', top: '40%', left: -W * 0.1, width: W, height: H * 0.05, backgroundColor: C.primary + '05', borderRadius: 20, transform: [{ rotate: '15deg' }] },

  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 20, gap: 12, shadowColor: C.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  cardTitle: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B', marginBottom: 6 },
  hint: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#94A3B8' },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  retryText: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: '#EF4444' },

  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF' },
  planRowSelected: { borderColor: C.primary, backgroundColor: C.primary + '0A' },
  planName: { flex: 1, fontSize: 14, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  planPopular: { fontSize: 11, fontFamily: 'Montserrat-SemiBold', color: C.accent, marginTop: 4 },
  planPrice: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: '#1E293B' },

  addonRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, backgroundColor: '#FFFFFF' },
  addonName: { flex: 1, fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: '#334155' },
  addonCheckbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  addonCheckboxChecked: { backgroundColor: C.primary, borderColor: C.primary },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  rowLabel: { fontSize: 13.5, fontFamily: 'Poppins-Regular', color: '#64748B', flex: 1, marginRight: 8 },
  rowValue: { fontSize: 13.5, fontFamily: 'Montserrat-SemiBold', color: '#1E293B' },
  discountText: { color: '#10B981' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 6 },
  totalLabel: { fontSize: 15, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  totalValue: { fontSize: 18, fontFamily: 'Montserrat-Bold', color: C.primary },

  couponLabel: { fontSize: 12, fontFamily: 'Montserrat-Bold', color: '#1E293B', marginTop: 10 },
  couponRow: { flexDirection: 'row', gap: 10 },
  couponInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 16, height: 48, color: '#1E293B', fontSize: 13, fontFamily: 'Poppins-Regular' },
  applyBtn: { backgroundColor: C.primary, borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', minWidth: 80, alignItems: 'center' },
  applyBtnText: { color: 'white', fontFamily: 'Montserrat-Bold', fontSize: 13 },
  viewCouponsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 6 },
  viewCouponsLink: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: C.accent },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '65%', paddingBottom: 24, paddingTop: 12 },
  modalTitle: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalOptionTextWrap: { flex: 1 },
  modalEmptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#94A3B8', padding: 24, textAlign: 'center' },
  couponCodeText: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  couponIneligibleText: { color: '#9CA3AF' },
  couponDescText: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#64748B', marginTop: 4 },
  couponReasonText: { fontSize: 11.5, fontFamily: 'Poppins-Regular', color: '#EF4444', marginTop: 4 },

  gatewayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, backgroundColor: '#FFFFFF' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: C.primary, backgroundColor: '#FFFFFF', borderWidth: 6 },

  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  switchRowDisabled: { opacity: 0.6 },
  switchLabel: { fontSize: 13.5, fontFamily: 'Montserrat-SemiBold', color: '#1E293B', marginBottom: 2 },

  payBtn: { flexDirection: 'row', backgroundColor: C.accent, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 12, shadowColor: C.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  payBtnText: { color: 'white', fontSize: 16, fontFamily: 'Montserrat-Bold' },
  payLoading: { marginTop: 16 },

  alertOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  alertBox: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', maxWidth: 340, alignItems: 'center', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 20 },
  alertIconWrap: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  alertIconSuccess: { backgroundColor: '#D1FAE5' },
  alertIconError: { backgroundColor: '#FEE2E2' },
  alertIconInfo: { backgroundColor: C.primary + '15' },
  alertTitle: { fontSize: 18, fontFamily: 'Montserrat-Bold', color: '#1E293B', marginBottom: 8, textAlign: 'center' },
  alertMessage: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 22 },
  alertBtn: { backgroundColor: C.primary, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  alertBtnSecondary: { backgroundColor: '#F1F5F9', flex: 1 },
  alertBtnText: { color: 'white', fontSize: 14, fontFamily: 'Montserrat-Bold' },
  alertBtnTextSecondary: { color: '#64748B' },
});

export default MembershipCheckout;
