import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, Dimensions, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import StripeCheckoutModal from '../../../Components/StripeCheckoutModal';
import TermsPrivacyModal from '../../../Components/TermsPrivacyModal';
import SignaturePad from '../../../Components/SignaturePad';
import { runRazorpayPayment } from '../../../Utils/paymentGateway';
import { usePaymentGateways, gatewayIcon, GATEWAY_META } from '../../../Hooks/usePaymentGateways';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { updateProfile, updateMembership } from '../../../Redux/slices/userSlice';
import { setPendingCustomPlanRequest, onboardingUserKey } from '../../../Redux/slices/onboardingSlice';
import { addInvoice } from '../../../Redux/slices/walletSlice';
import { clearCart, selectCartItems } from '../../../Redux/slices/cartSlice';
import { setPendingBundleFinish } from '../../../Redux/slices/pendingRequestsSlice';
import { addCartItem } from '../../../Api/cartApi';
import { getServices } from '../../../Api/catalogApi';
import { useCartPriceSync } from '../../../Hooks/useCartPriceSync';
import apiClient from '../../../Api/client';
import { usePlans } from '../../../Hooks/usePlans';
import { useMembershipCheckout } from '../../../Hooks/useMembershipCheckout';
import { createCustomPlan as createCustomPlanRequestAction } from '../../../Redux/slices/customPlanSlice';
import { useStates } from '../../../Hooks/useStates';
import { useCities } from '../../../Hooks/useCities';
import { usePriorities } from '../../../Hooks/usePriorities';
import { lightColors as baseColors, typography, spacing, radius, STATUS_BAR_HEIGHT } from '../../../theme';

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

// The bundled custom-plan opening fee (see `customQuote` below) comes back
// in its own currency from POST /customer/custom-plans, not necessarily USD
// like the rest of this screen — format it with its own symbol.
function formatMoney(amount, currency) {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${toAmount(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function convertPlanAmountToUsd(amount, plan) {
  const usdPrice = toAmount(plan?.usdPrice);
  const basePrice = toAmount(plan?.price);
  const sourceAmount = toAmount(amount);

  if (!sourceAmount) return 0;
  if (usdPrice && basePrice) return (sourceAmount / basePrice) * usdPrice;
  return sourceAmount;
}

// The checkout response's own `data.bundle` only ever carries service names/
// count, per the backend — no id. The actual bundle id only shows up on the
// PAYMENT VERIFY response, as `pending_checkout_bundle_finish.bundle_id`
// (mapped to `pendingCheckoutBundleFinish` in paymentsApi.js). Prefer that;
// fall back to the checkout bundle only for its service names, and only when
// there's truly nothing from verify (e.g. no gateway payment was needed at
// all, so verify() was never called).
function resolveBundleInfo(verifyData, checkoutBundle) {
  if (verifyData?.pendingCheckoutBundleFinish?.bundleId != null) {
    return {
      bundleId: verifyData.pendingCheckoutBundleFinish.bundleId,
      serviceNames: verifyData.pendingCheckoutBundleFinish.serviceNames,
    };
  }
  const bundleId = checkoutBundle?.id ?? checkoutBundle?.bundle_id ?? null;
  if (bundleId == null) return null;
  return { bundleId, serviceNames: checkoutBundle?.serviceNames ?? checkoutBundle?.service_names };
}


// Labelled select that opens a centered, searchable list of options — used by
// the cart service-request form (State / City / Taluka / Relation / Priority).
function FormSelect({ label, required, value, placeholder, options, disabled, loading, onSelect }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}{required ? ' *' : ''}</Text>
      <TouchableOpacity
        style={[styles.selectBox, (disabled || loading) && styles.selectBoxDisabled]}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={C.primary} />
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>
              {value || placeholder}
            </Text>
            <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
          </>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.selectOverlay} activeOpacity={1} onPress={close}>
          <View style={styles.selectSheet}>
            <Text style={styles.selectSheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.selectOption} onPress={() => { onSelect(item); close(); }}>
                  <Text style={styles.selectOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color={C.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.selectEmpty}>No options available.</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function OnboardingPayment({ route, navigation }) {
  const { profile, customQuote: routeCustomQuote } = route.params || {};
  const dispatch = useDispatch();
  const { regularPlans, loading: plansLoading, failed: plansFailed, retry: retryPlans } = usePlans();
  const plan = regularPlans.find(p => p.isPopular) || regularPlans[0] || null;
  const {
    coupons, couponsLoading, fetchCoupons,
    couponResult, couponLoading, validateCoupon, clearCoupon,
    checkoutLoading, checkout, verifyLoading, verifyPayment,
  } = useMembershipCheckout();

  // Set by Services.js when a guest tapped "Request a Quote" before signing
  // in. Once the wizard reaches this screen, auto-request a quote for the
  // "Custom Task" catalog service (the generic "need something custom" entry
  // point) via POST /customer/custom-plans — with no membership yet, that
  // returns { requires_membership: true, service_id, subject, message, fee }
  // (see customPlanApi.createCustomPlan), which becomes the same bundled
  // `customQuote` a service-linked quote screen would pass via route params.
  const pendingCustomPlanRequest = useSelector(s => s.onboarding.pendingCustomPlanRequest);
  const [autoCustomQuote, setAutoCustomQuote] = useState(null);
  const [customQuoteLoading, setCustomQuoteLoading] = useState(false);
  const [customQuoteError, setCustomQuoteError] = useState(null);
  // Set if the auto-request came back already created (no fee owed / already
  // covered) instead of requiring membership — rare for a brand-new guest,
  // but if it happens there's nothing to bundle; just deep-link to it once
  // membership checkout finishes normally.
  const [preCreatedCustomPlanTicket, setPreCreatedCustomPlanTicket] = useState(null);
  const customQuote = routeCustomQuote || autoCustomQuote;

  useEffect(() => {
    if (!pendingCustomPlanRequest || routeCustomQuote || autoCustomQuote || customQuoteLoading) return;
    let cancelled = false;
    setCustomQuoteLoading(true);
    setCustomQuoteError(null);
    (async () => {
      try {
        const services = await getServices({ search: 'Custom Task' });
        const target = services.find(s => s.pricing?.isQuoted) || services[0];
        if (!target) throw new Error("Couldn't find the Custom Task service.");
        const result = await dispatch(createCustomPlanRequestAction({
          subject: `${target.name} (consultation fee)`,
          message: "I'd like to request a custom quote for something not in the service catalog.",
          serviceId: target.id,
        })).unwrap();
        if (cancelled) return;
        if (result.requiresMembership) {
          setAutoCustomQuote({ serviceId: result.serviceId, subject: result.subject, message: result.message, fee: result.fee });
        } else if (result.ticket) {
          // No fee owed / already covered — already created, nothing to bundle.
          setPreCreatedCustomPlanTicket({ id: result.ticket.id, ticketNumber: result.ticket.ticketNumber });
        }
        // result.requiresPayment shouldn't happen for a brand-new guest (it
        // means an active membership already exists) — nothing to bundle
        // into membership checkout here if it does; just proceed normally.
        dispatch(setPendingCustomPlanRequest(false));
      } catch (err) {
        if (!cancelled) setCustomQuoteError(err?.message || "Couldn't prepare your custom quote — you can still finish membership and try again from Custom Plan afterward.");
      } finally {
        if (!cancelled) setCustomQuoteLoading(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCustomPlanRequest]);

  // Cart-driven purchase path. When the user reached this step from the cart
  // (or a direct service purchase), Step 2 also collects the service-request
  // details and bills the selected services alongside the membership. With an
  // empty cart this is a plain membership registration — unchanged.
  const cartItems = useSelector(selectCartItems);
  const savedLocation = useSelector(s => s.serviceLocation);
  const userId = useSelector(s => onboardingUserKey(s.user.user));
  const fromCart = cartItems.length > 0;

  // A recurring cart service can't ride this membership checkout session (a
  // checkout session only ever produces one subscription, and the membership
  // itself is already that one) — the backend silently excludes it from the
  // charge and leaves it pending until the customer completes it separately
  // from their dashboard. Split the cart so the platform/membership fee shown
  // and charged here never double-counts a recurring item's price.
  const oneTimeCartItems = cartItems.filter(i => !i.isRecurring);
  const recurringCartItems = cartItems.filter(i => i.isRecurring);
  const servicesSubtotal = oneTimeCartItems.reduce((sum, it) => sum + (Number(it.price) || 0), 0);

  const [planCouponCode, setPlanCouponCode] = useState('');
  // Available gateways come from the backend (already NRI + admin-toggle gated).
  const { gateways: allGateways } = usePaymentGateways();
  // PayPal never combines a pending custom-quote fee into this checkout
  // (same rule as it never combining a cart) — drop it from the picker
  // whenever a customQuote is bundled in.
  const gateways = customQuote ? allGateways.filter(g => g.value !== 'paypal') : allGateways;
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  useEffect(() => {
    if (gateways.length && !gateways.some(g => g.value === paymentMethod)) {
      setPaymentMethod(gateways[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateways]);
  const [submitting, setSubmitting] = useState(false);
  // Two-step sub-flow for the cart path: 'details' (booking location) then
  // 'summary' (order summary + payment). Plain membership skips straight to summary.
  const [step, setStep] = useState('details');

  // "Where — for your cart's service requests" — just enough to price/pay.
  // Who this is for, the exact address, and documents are collected on
  // FinishRequest, after payment. Location prefilled from the first cart item
  // (the city the services were priced for).
  const firstItem = cartItems[0] || {};
  const [reqForm, setReqForm] = useState({
    state: firstItem.stateName || savedLocation?.stateName || '',
    city: firstItem.cityName || savedLocation?.cityName || '',
    // Prefill the PIN code the guest picked when choosing services (carried on
    // the cart item), so they don't re-enter it after registering.
    pincode: firstItem.pincode || savedLocation?.pincode || '',
    priority: '',
  });
  const setField = (key, val) => setReqForm(prev => ({ ...prev, [key]: val }));

  const { stateNames, states } = useStates();
  const { cityNames, cities } = useCities(reqForm.state);
  const { priorities } = usePriorities();
  const priorityLabelOf = (p) => `${p.name} — ${toAmount(p.surcharge) > 0 ? formatUsd(p.surcharge) : 'Free'}`;
  const priorityLabels = priorities.map(priorityLabelOf);
  const selectedPriority = priorities.find(p => priorityLabelOf(p) === reqForm.priority) || null;
  const prioritySurcharge = fromCart ? toAmount(selectedPriority?.surcharge) : 0;

  useEffect(() => {
    const stateName = firstItem.stateName || savedLocation?.stateName || '';
    const cityName = firstItem.cityName || savedLocation?.cityName || '';
    const pincode = firstItem.pincode || savedLocation?.pincode || '';
    setReqForm(prev => ({
      ...prev,
      state: prev.state || stateName,
      city: prev.city || cityName,
      pincode: prev.pincode || pincode,
    }));
  }, [firstItem.stateName, firstItem.cityName, firstItem.pincode, savedLocation?.stateName, savedLocation?.cityName, savedLocation?.pincode]);

  // Default the Priority field to the standard/default tier once tiers load.
  useEffect(() => {
    if (fromCart && !reqForm.priority && priorities.length) {
      const def = priorities.find(p => p.isDefault) || priorities[0];
      if (def) setField('priority', priorityLabelOf(def));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCart, priorities]);

  // Re-bind the EXACT vendor price for every cart service from the live
  // GET /services?city_id=<id> response, so the Order Summary and Amount Payable
  // shown here match what the backend charges (only runs for the cart flow).
  useCartPriceSync(fromCart);
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  // { url, paymentId } while the hosted Stripe checkout WebView is open.
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

  // Required e-signature (POST /customer/membership/checkout now 422s
  // without accept_terms/signer_name/signature_data) — checking the box
  // reveals the "type to sign" field, which live-renders into signatureData.
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signatureData, setSignatureData] = useState('');
  const [legalModal, setLegalModal] = useState({ visible: false, tab: 'terms' });
  const openLegalModal = (tab) => setLegalModal({ visible: true, tab });
  const closeLegalModal = () => setLegalModal(prev => ({ ...prev, visible: false }));
  const readyToPay = acceptTerms && !!signerName.trim() && !!signatureData;

  const showAlert = (title, message, type = 'info') => {
    setCustomAlert({ visible: true, title, message, type });
  };

  const hideAlert = () => {
    setCustomAlert(prev => ({ ...prev, visible: false }));
  };

  // The plan's `price` is INR; `usd_price` is the USD amount we actually
  // charge/display (falls back to price if usd_price isn't set on a plan).
  const basePrice = toAmount(plan?.usdPrice) || toAmount(plan?.price) || 0;
  // Coupon discount comes back in the plan's base (INR) currency — convert it
  // to USD so it lines up with the USD base price.
  const planDiscount = convertPlanAmountToUsd(couponResult?.discount, plan);
  const taxableAmount = Math.max(0, basePrice - planDiscount);
  const gstAmount = Math.round(taxableAmount * GST_RATE * 100) / 100;
  const membershipPayable = taxableAmount + gstAmount;

  // Selected services (cart) billed together with the membership in one payment.
  // Services subtotal + the chosen priority tier's flat surcharge.
  // Note: The backend CartCheckoutService currently does not apply the 18% GST 
  // to cart items when they are bundled as one-time line items on a membership 
  // subscription checkout, so we match that here to ensure the total matches Stripe exactly.
  const servicesBase = servicesSubtotal + prioritySurcharge;
  const servicesGst = 0; // Math.round(servicesBase * GST_RATE * 100) / 100;
  const servicesPayable = servicesBase + servicesGst;
  // A pending custom-plan request fee (see customQuote above) rides along
  // with this same membership checkout, one combined charge — mirrors how a
  // cart's one-time services are bundled in. Summed directly into the USD
  // total like cart item prices already are elsewhere on this screen — this
  // assumes the fee comes back in the customer's USD billing currency (same
  // assumption the rest of this screen makes); it's only ever shown/added
  // for display, the backend computes the real combined charge itself.
  const customQuoteFee = toAmount(customQuote?.fee?.amount);
  const customQuoteCurrency = customQuote?.fee?.currency || 'USD';
  const amountPayable = membershipPayable + (fromCart ? servicesPayable : 0) + customQuoteFee;

  const handleApplyPlanCoupon = () => {
    if (!planCouponCode.trim()) return;
    validateCoupon({ code: planCouponCode.trim() })
      .unwrap()
      .then((result) => {
        const finalAmount = basePrice - convertPlanAmountToUsd(result.discount, plan);
        showAlert('Coupon Applied', `Code ${result.code} applied `, 'success');
      })
      .catch((error) => {
        showAlert('Invalid Coupon', error?.message || 'This coupon could not be applied.', 'error');
      });
  };

  const handleCouponTextChange = (text) => {
    if (couponResult) clearCoupon();
    setPlanCouponCode(text);
  };

  const handleRemovePlanCoupon = () => {
    clearCoupon();
    setPlanCouponCode('');
  };

  // The registration-gate plan is resolved server-side — no plan_id needed
  // (unlike the multi-plan MembershipCheckout.js flow).
  const handleViewCoupons = () => {
    fetchCoupons({});
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
        showAlert('Coupon Applied', `Code ${result.code} applied`, 'success');
      })
      .catch((error) => {
        showAlert('Invalid Coupon', error?.message || 'This coupon could not be applied.', 'error');
      });
  };

  const loading = submitting || checkoutLoading || verifyLoading;

  // Activates the membership locally, creates the cart's service requests, then
  // moves on to the welcome screen once the gateway payment is confirmed.
  // `pendingRecurringBundle` (from the verify() response) is forwarded so the
  // welcome screen can prompt for it — a recurring cart service is priced
  // alongside the membership but can't ride the same checkout session, so it's
  // left unpaid until the customer completes it separately.
  // `combinedCart` is the checkout response's own combined_cart flag — a
  // coupon no longer forces it false on its own, but PayPal (never combines)
  // still can, so only treat the cart as booked/clearable when the backend
  // actually confirmed it rode along, not just because fromCart was true.
  // `bundleInfo` is { bundleId, serviceNames } resolved via resolveBundleInfo()
  // — present whenever combined_cart rode along. Under the new pay-first
  // contract nothing is created yet even though the membership payment
  // cleared: who/where + documents still need to go through FinishRequest
  // (mode: 'bundle') via POST /billing/checkout-bundles/{id}/finish before
  // OnboardingWelcome.
  const finishUp = async (pendingRecurringBundle, combinedCart = true, customPlanTicket = null, bundleInfo = null) => {
    // Fall back to the ticket the auto-quote effect already created above
    // (the rare "no fee owed" branch) if this payment itself didn't raise one.
    const resolvedCustomPlanTicket = customPlanTicket || preCreatedCustomPlanTicket;
    dispatch(updateProfile({
      countryOfResidence: profile?.countryOfResidence,
      stateProvince: profile?.stateProvince,
      city: profile?.city,
      homeState: profile?.homeState,
      phone: profile?.phone,
      whatsapp: profile?.whatsapp,
      // Remember the plan price paid at registration (USD) so the dashboard
      // membership card can show it even before the API echoes a price.
      planPrice: basePrice,
      planCurrency: 'USD',
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

    // Membership itself is confirmed at this point regardless of the bundle —
    // only clear the local cart once its tickets actually exist though (see
    // the bundleId branch below); a combinedCart:false cart (e.g. PayPal,
    // which never combines) was left untouched server-side, so it's never
    // cleared here.
    const cartWasBooked = fromCart && combinedCart;

    const bundleId = bundleInfo?.bundleId ?? null;
    if (cartWasBooked && bundleId) {
      dispatch(setPendingBundleFinish({
        userId,
        bundleId,
        serviceNames: bundleInfo?.serviceNames ?? oneTimeCartItems.map(it => it.name).join(', '),
        stateId: states.find(s => s.name === reqForm.state)?.id || null,
        cityId: cities.find(c => c.name === reqForm.city)?.id || cartItems[0]?.cityId || savedLocation?.cityId || null,
        stateName: reqForm.state,
        cityName: reqForm.city,
      }));
      // FinishRequest (who/where + documents) comes right after payment —
      // OnboardingWelcome only shows once that's actually done (see its
      // success navigation to 'OnboardingWelcome').
      navigation.navigate('FinishRequest', {
        mode: 'bundle',
        bundleId,
        plan,
        pendingRecurringBundle,
        customPlanTicket: resolvedCustomPlanTicket,
      });
      return;
    }

    // No bundle to finish (no cart, or the cart didn't ride along) — nothing
    // left to clear/create, go straight to the welcome screen as before.
    if (cartWasBooked) dispatch(clearCart());

    navigation.replace('OnboardingWelcome', {
      plan,
      hasServiceRequests: cartWasBooked,
      pendingRecurringBundle,
      cartNotBooked: fromCart && !combinedCart,
      // Set when this payment also raised the bundled custom-plan request
      // (see customQuote above) — lets the welcome screen deep-link into
      // SupportTicketChat with { ticketId, kind: 'custom_plan' }.
      customPlanTicket: resolvedCustomPlanTicket,
    });
  };

  const handlePay = async () => {
    if (!plan) {
      showAlert('No Plan Selected', 'Please go back and choose a membership plan.', 'error');
      return;
    }
    if (!acceptTerms) {
      showAlert('Terms Required', 'Please agree to the Terms & Conditions and Privacy Policy to continue.', 'error');
      return;
    }
    if (!signerName.trim() || !signatureData) {
      showAlert('Signature Required', 'Please type your full legal name to sign before paying.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (fromCart) {
        // Sync Redux cart to backend before checkout so they ride along with membership
        for (const item of cartItems) {
          try {
            await addCartItem(item.serviceId, item.isRecurring ? 'recurring' : 'one_time');
          } catch (e) {
            setSubmitting(false);
            showAlert('Cart Sync Failed', e?.message || 'Could not sync cart items.');
            return;
          }
        }
        
        try {
          const cartRes = await apiClient.get('/customer/cart');
          const count = cartRes.data?.data?.count ?? 0;
          if (count === 0) {
            setSubmitting(false);
            showAlert('Cart Empty', 'Backend cart count is 0 after syncing items!');
            return;
          }
        } catch (e) {
            setSubmitting(false);
            showAlert('Cart Fetch Failed', 'Could not verify backend cart.');
            return;
        }
      }

      const result = await checkout({
        gateway: paymentMethod,
        couponCode: planCouponCode.trim() || undefined,
        autoRenew: true,
        useWallet: false,
        acceptTerms: true,
        signerName: signerName.trim(),
        signatureData,
        customQuoteServiceId: customQuote?.serviceId || undefined,
        customQuoteSubject: customQuote?.subject || undefined,
        customQuoteMessage: customQuote?.message || undefined,
        stateId: states.find(s => s.name === reqForm.state)?.id || undefined,
        cityId: cities.find(c => c.name === reqForm.city)?.id || (fromCart ? (cartItems[0]?.cityId || savedLocation?.cityId) : undefined) || undefined,
        pincode: reqForm.pincode?.trim() || undefined,
        urgency: selectedPriority?.slug || 'standard',
      }).unwrap();

      if (result.checkoutUrl) {
        // Stripe returns a hosted checkout_url. Open it in an
        // in-app WebView; the payment is confirmed in handleCheckoutSuccess
        // once the gateway redirects back to the success_url with a session_id
        // (see StripeCheckoutModal).
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId, combinedCart: result.combinedCart, bundle: result.bundle });
      } else if (result.order) {
        // Razorpay — no hosted page; drive the native SDK then verify inline.
        // Auto-renew membership → order carries a subscription_id (verified
        // with razorpay_subscription_id inside runRazorpayPayment).
        const verifyResult = await runRazorpayPayment({
          order: result.order,
          paymentId: result.paymentId,
          name: 'NRI Circle Membership',
          description: plan?.name || 'Membership',
          user: { name: profile?.fullName, email: profile?.email, phone: profile?.phone },
          verify: (params) => verifyPayment(params).unwrap(),
        });
        await finishUp(verifyResult?.data?.pendingRecurringBundle, result.combinedCart, verifyResult?.data?.customPlanTicket, resolveBundleInfo(verifyResult?.data, result.bundle));
      } else if (result.planId) {
        // PayPal auto-renew returns a plan_id for a native SDK flow not built
        // on mobile — steer to a supported gateway instead of a false success.
        showAlert('Not Available', 'This payment method isn\'t supported in the app yet. Please choose Card (Stripe) or Razorpay.', 'error');
      } else {
        // Wallet credits / free plan covered the full amount — nothing to pay,
        // so verify() was never called; fall back to the checkout bundle
        // (names only, but there's no gateway payment id to look up anyway).
        await finishUp(undefined, result.combinedCart, undefined, resolveBundleInfo(null, result.bundle));
      }
    } catch (error) {
      // Diagnostic: surface the HTTP status so a gateway rejection can be told
      // apart (502 = account can't process this currency/subscription, 503 =
      // Razorpay disabled by admin, 422 = not an NRI customer). Visible in
      // Metro / `adb logcat`.
      console.warn('[Razorpay] checkout failed', { gateway: paymentMethod, status: error?.status, message: error?.message });
      showAlert('Payment Failed', error?.message || 'Could not complete checkout. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // The hosted Stripe page redirected back with a session_id — confirm
  // it with the backend, which is what actually activates the membership.
  const handleCheckoutSuccess = async (sessionId) => {
    const session = checkoutSession;
    setCheckoutSession(null);
    setSubmitting(true);
    try {
      const verifyResult = await verifyPayment({ paymentId: session?.paymentId, sessionId }).unwrap();
      await finishUp(verifyResult?.data?.pendingRecurringBundle, session?.combinedCart, verifyResult?.data?.customPlanTicket, resolveBundleInfo(verifyResult?.data, session?.bundle));
    } catch (error) {
      showAlert('Verification Failed', error?.message || 'We could not confirm your payment. If you were charged, please contact support.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckoutCancel = () => {
    setCheckoutSession(null);
    setSubmitting(false);
  };

  // Validate the pre-pay booking-details fields (location + priority) before
  // moving to payment — who/where + documents are collected afterward on
  // FinishRequest, once the membership payment (and the cart bundle it
  // creates) has actually cleared.
  const handleContinueToPayment = () => {
    const missing = [];
    if (!reqForm.state) missing.push('State');
    if (!reqForm.city) missing.push('City / District');
    if (!reqForm.pincode.trim()) missing.push('PIN Code');
    if (!reqForm.priority) missing.push('Priority');

    if (missing.length) {
      showAlert('Missing Details', `Please fill: ${missing.join(', ')}.`, 'error');
      return;
    }
    setStep('summary');
  };

  // Cart path splits Step 2 into: details (booking location) → summary
  // (order + payment). Plain membership shows the summary directly.
  const showDetails = fromCart && step === 'details';
  const showSummary = !fromCart || step === 'summary';

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

        {/* Two-step indicator (cart path only) */}
        {fromCart && (
          <View style={styles.subStepsRow}>
            <View style={[styles.subStep, showDetails && styles.subStepActive]}>
              <Text style={[styles.subStepText, showDetails && styles.subStepTextActive]}>1 · Where</Text>
            </View>
            <View style={[styles.subStep, showSummary && styles.subStepActive]}>
              <Text style={[styles.subStepText, showSummary && styles.subStepTextActive]}>2 · Order & Payment</Text>
            </View>
          </View>
        )}

        {/* Pay-first: only what's needed to price/pay the cart's service
            requests. Who this is for, the exact address, and any documents
            are collected on FinishRequest, right after payment. */}
        {showDetails && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="place" size={16} color={C.primary} />
              <Text style={styles.cardHeaderText}>Where — for your cart's service requests</Text>
            </View>

            <FormSelect label="State" required value={reqForm.state} placeholder="Select state" options={stateNames} onSelect={v => { setField('state', v); setField('city', ''); setField('taluka', ''); }} />

            <FormSelect label="City / District" required value={reqForm.city} placeholder={reqForm.state ? 'Select city' : 'Select state first'} options={cityNames} disabled={!reqForm.state} onSelect={v => { setField('city', v); setField('taluka', ''); }} />

            <Text style={styles.fieldLabel}>PIN Code *</Text>
            <TextInput style={styles.input} placeholder="e.g. 416002" placeholderTextColor="#94A3B8" keyboardType="number-pad" value={reqForm.pincode} onChangeText={t => setField('pincode', t)} />

            <FormSelect label="Priority" required value={reqForm.priority} placeholder="Standard — Free" options={priorityLabels} onSelect={v => setField('priority', v)} />

            <Text style={styles.fieldHint}>Who this is for, the exact address, and any notes/attachments are collected on the next step, after payment.</Text>
          </View>
        )}

        {showDetails && (
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinueToPayment} activeOpacity={0.9}>
            <Text style={styles.continueBtnText}>Continue to Payment</Text>
            <Icon name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {showSummary && fromCart && (
          <TouchableOpacity style={styles.backToDetails} onPress={() => setStep('details')} activeOpacity={0.7}>
            <Icon name="arrow-back" size={16} color={C.primary} />
            <Text style={styles.backToDetailsText}>Back to details</Text>
          </TouchableOpacity>
        )}

        {showSummary && (plansLoading || (pendingCustomPlanRequest && customQuoteLoading) ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={styles.loadingText}>{customQuoteLoading ? 'Preparing your custom quote…' : 'Loading your plan…'}</Text>
          </View>
        ) : plansFailed || !plan ? (
          <TouchableOpacity style={styles.retryBox} onPress={retryPlans}>
            <Text style={styles.retryText}>Couldn't load your plan. Tap to retry.</Text>
          </TouchableOpacity>
        ) : (
          <>
            {!!customQuoteError && !customQuote && (
              <View style={styles.customQuoteErrorBanner}>
                <Icon name="error-outline" size={16} color="#B45309" />
                <Text style={styles.customQuoteErrorText}>{customQuoteError}</Text>
              </View>
            )}
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
                <Text style={styles.rowLabel}>{fromCart || customQuote ? 'Membership GST (18%)' : 'GST (18%)'}</Text>
                <Text style={styles.rowValue}>{formatUsd(gstAmount)}</Text>
              </View>

              {(fromCart || !!customQuote) && (
                <>
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, styles.rowLabelStrong]}>Membership Total</Text>
                    <Text style={[styles.rowValue, styles.rowValueStrong]}>{formatUsd(membershipPayable)}</Text>
                  </View>

                  {oneTimeCartItems.length > 0 && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.servicesChip}>
                        <Icon name="shopping-cart" size={13} color={C.accent} />
                        <Text style={styles.servicesChipText}>Services ({oneTimeCartItems.length})</Text>
                      </View>
                      {oneTimeCartItems.map((it) => (
                        <View key={it.serviceId} style={styles.row}>
                          <Text style={styles.rowLabel} numberOfLines={2}>{it.name}</Text>
                          <Text style={styles.rowValue}>{formatUsd(it.price)}</Text>
                        </View>
                      ))}
                      {prioritySurcharge > 0 && (
                        <View style={styles.row}>
                          <Text style={styles.rowLabel}>Priority ({selectedPriority?.name})</Text>
                          <Text style={styles.rowValue}>+{formatUsd(prioritySurcharge)}</Text>
                        </View>
                      )}
                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>Services GST {servicesGst > 0 ? "(18%)" : "(Included in Membership)"}</Text>
                        <Text style={styles.rowValue}>{formatUsd(servicesGst)}</Text>
                      </View>
                      <View style={styles.row}>
                        <Text style={[styles.rowLabel, styles.rowLabelStrong]}>Services Total</Text>
                        <Text style={[styles.rowValue, styles.rowValueStrong]}>{formatUsd(servicesPayable)}</Text>
                      </View>
                    </>
                  )}

                  {recurringCartItems.length > 0 && (
                    <>
                      <View style={styles.divider} />
                      <View style={styles.recurringChip}>
                        <Icon name="autorenew" size={13} color="#B45309" />
                        <Text style={styles.recurringChipText}>Recurring Services ({recurringCartItems.length}) — not charged now</Text>
                      </View>
                      {recurringCartItems.map((it) => (
                        <View key={it.serviceId} style={styles.row}>
                          <Text style={styles.rowLabel} numberOfLines={2}>{it.name}</Text>
                          <Text style={styles.rowValue}>{formatUsd(it.price)}{it.billingInterval ? '/mo' : ''}</Text>
                        </View>
                      ))}
                      <Text style={styles.recurringNote}>
                        Not included in the amount payable below — a recurring service is billed
                        separately from your membership/platform fee. Once your registration payment
                        is confirmed, you'll see a "Pay Now" prompt for these on your dashboard.
                      </Text>
                    </>
                  )}
                </>
              )}

              {!!customQuote && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.servicesChip}>
                    <Icon name="chat-bubble-outline" size={13} color={C.accent} />
                    <Text style={styles.servicesChipText}>Custom Quote Request</Text>
                  </View>
                  <View style={styles.row}>
                    <Text style={styles.rowLabel} numberOfLines={2}>{customQuote.subject || 'Custom plan request fee'}</Text>
                    <Text style={styles.rowValue}>{formatMoney(customQuoteFee, customQuoteCurrency)}</Text>
                  </View>
                  <View style={styles.customQuoteNoteRow}>
                    <Icon name="info-outline" size={13} color="#94A3B8" />
                    <Text style={styles.customQuoteNoteText}>
                      This fee only opens your request — it is <Text style={styles.combinedNoteStrong}>not</Text> the
                      price for the work itself. Our team reviews what you describe and quotes that
                      separately, once your membership is active.
                    </Text>
                  </View>
                </>
              )}

              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.amountPayableLabel}>Amount Payable</Text>
                <Text style={styles.amountPayableValue}>{formatUsd(amountPayable)}</Text>
              </View>
              {fromCart && oneTimeCartItems.length > 0 && (
                <Text style={styles.combinedNote}>
                  Included in the amount payable above — one-time services are paid together with
                  your membership in this one payment.
                </Text>
              )}

              <Text style={styles.couponLabel}>HAVE A COUPON?</Text>
              <View style={styles.couponRow}>
                <TextInput style={styles.couponInput} placeholder="E.G. WELCOME10" placeholderTextColor="#94A3B8" autoCapitalize="characters" value={planCouponCode} onChangeText={handleCouponTextChange} />
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={couponResult ? handleRemovePlanCoupon : handleApplyPlanCoupon}
                  disabled={couponLoading}
                >
                  {couponLoading ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <Text style={styles.applyBtnText}>
                      {couponResult ? 'Remove' : 'Apply'}
                    </Text>
                  )}
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
              <Text style={styles.gatewayIntro}>Choose how you'd like to pay:</Text>

              {gateways.map(g => (
                <TouchableOpacity
                  key={g.value}
                  style={[styles.gatewayRow, paymentMethod === g.value && styles.gatewayRowActive]}
                  activeOpacity={0.8}
                  onPress={() => setPaymentMethod(g.value)}
                >
                  <Icon name={gatewayIcon(g.value)} size={22} color={paymentMethod === g.value ? C.primary : '#64748B'} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.gatewayName}>{g.label}</Text>
                    {!!GATEWAY_META[g.value]?.desc && <Text style={styles.gatewayDesc}>{GATEWAY_META[g.value].desc}</Text>}
                  </View>
                  <View style={[styles.radio, paymentMethod === g.value && styles.radioActive]} />
                </TouchableOpacity>
              ))}

              <TouchableOpacity style={styles.agreeRow} onPress={() => setAcceptTerms(v => !v)} activeOpacity={0.7}>
                <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                  {acceptTerms && <Icon name="check" size={14} color="#FFFFFF" />}
                </View>
                <Text style={styles.agreeText}>
                  I've read and agree to the{' '}
                  <Text style={styles.agreeLink} onPress={() => openLegalModal('terms')}>Terms & Conditions</Text>
                  {' '}and{' '}
                  <Text style={styles.agreeLink} onPress={() => openLegalModal('privacy')}>Privacy Policy</Text>.
                </Text>
              </TouchableOpacity>

              {acceptTerms && (
                <View style={styles.signatureSection}>
                  <View style={styles.divider} />
                  <Text style={styles.signatureTitle}>Type your full legal name to sign</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Priya Sharma"
                    placeholderTextColor="#94A3B8"
                    value={signerName}
                    onChangeText={setSignerName}
                    autoCapitalize="words"
                  />
                  <View style={styles.signatureBox}>
                    <View style={styles.signatureBoxLabelWrap}>
                      <Text style={styles.signatureBoxLabelText} numberOfLines={1}>YOUR</Text>
                      <Text style={styles.signatureBoxLabelText} numberOfLines={1}>SIGNATURE</Text>
                    </View>
                    <View style={styles.signatureBoxDivider} />
                    <SignaturePad name={signerName} onChange={setSignatureData} />
                  </View>
                  <Text style={styles.signatureFootnote}>Typing your name above counts as your electronic signature on this agreement.</Text>
                </View>
              )}

              {loading ? (
                <ActivityIndicator size="large" color={C.accent} style={styles.payLoading} />
              ) : (
                <TouchableOpacity
                  style={[styles.payBtn, !readyToPay && styles.payBtnDisabled]}
                  onPress={() => handlePay()}
                  disabled={!readyToPay}
                  activeOpacity={readyToPay ? 0.8 : 1}
                >
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
        ))}
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

      <TermsPrivacyModal
        visible={legalModal.visible}
        initialTab={legalModal.tab}
        onClose={closeLegalModal}
        onAgree={() => setAcceptTerms(true)}
      />

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
  rowLabelStrong: { color: '#1E293B', fontFamily: 'Montserrat-SemiBold' },
  rowValueStrong: { fontFamily: 'Montserrat-Bold' },
  servicesChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.accent + '15', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 6 },
  servicesChipText: { fontSize: 13, color: colors.accent, fontFamily: 'Montserrat-Bold' },
  combinedNote: { fontSize: 11.5, fontFamily: 'Poppins-Regular', color: '#94A3B8', lineHeight: 17, marginTop: 8 },
  combinedNoteStrong: { fontFamily: 'Montserrat-Bold', color: '#64748B' },
  customQuoteNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 },
  customQuoteNoteText: { flex: 1, fontSize: 11.5, fontFamily: 'Poppins-Regular', color: '#94A3B8', lineHeight: 17 },
  recurringChip: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#FEF3C7', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 6, marginBottom: 6 },
  recurringChipText: { fontSize: 13, color: '#B45309', fontFamily: 'Montserrat-Bold' },
  recurringNote: { fontSize: 11.5, fontFamily: 'Poppins-Regular', color: '#B45309', lineHeight: 17, marginTop: 8 },
  customQuoteErrorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderRadius: radius.lg, padding: 12, borderWidth: 1, borderColor: '#FEF3C7' },
  customQuoteErrorText: { flex: 1, fontSize: 12.5, fontFamily: 'Poppins-Regular', color: '#92400E', lineHeight: 18 },

  // Two-step sub-flow indicator
  subStepsRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  subStep: { flex: 1, borderRadius: radius.full, paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  subStepActive: { backgroundColor: colors.primary + '15' },
  subStepText: { fontSize: 11.5, fontFamily: 'Montserrat-SemiBold', color: '#94A3B8' },
  subStepTextActive: { color: colors.primary },

  continueBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.accent, height: 56, borderRadius: radius.full, marginTop: 4,
    shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5,
  },
  continueBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Montserrat-Bold' },
  backToDetails: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  backToDetailsText: { fontSize: 13, color: colors.primary, fontFamily: 'Montserrat-SemiBold' },

  // Document upload rows
  docUploadWrap: { marginTop: 14 },
  docInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  docChooseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: radius.lg, paddingHorizontal: 14, height: 44, backgroundColor: '#F8FAFC',
  },
  docChooseBtnText: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: colors.primary },
  docFileName: { flex: 1, fontSize: 12.5, fontFamily: 'Poppins-Regular', color: '#94A3B8' },
  filePill: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary + '10',
    borderRadius: radius.lg, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8,
  },
  filePillText: { flex: 1, fontSize: 12.5, fontFamily: 'Poppins-Regular', color: '#1E293B' },
  filePillView: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  filePillViewText: { fontSize: 12, color: C.primary, fontFamily: 'Montserrat-SemiBold' },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: STATUS_BAR_HEIGHT, paddingHorizontal: 20, paddingBottom: 12 },
  previewName: { flex: 1, fontSize: 14, color: '#FFFFFF', fontFamily: 'Montserrat-SemiBold' },
  previewImage: { flex: 1, width: '100%' },

  // Required documents list
  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  docName: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: '#1E293B' },
  docDesc: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#94A3B8', marginTop: 2, lineHeight: 17 },
  required: { color: colors.error },

  // Cart service-request form fields
  fieldLabel: { fontSize: 13, fontFamily: 'Montserrat-Bold', color: colors.primary, marginBottom: 6, marginTop: 2, letterSpacing: 0.2 },
  fieldHint: { fontSize: 11.5, fontFamily: 'Poppins-Regular', color: '#94A3B8', lineHeight: 17, marginTop: 4 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, paddingHorizontal: 14, height: 48, color: '#1E293B', fontSize: 14, fontFamily: 'Poppins-Regular', marginBottom: 14 },
  inputMultiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, paddingHorizontal: 14, height: 48 },
  selectBoxDisabled: { opacity: 0.5 },
  selectText: { flex: 1, fontSize: 14, color: '#1E293B', fontFamily: 'Poppins-Regular' },
  selectPlaceholder: { color: '#94A3B8' },
  selectOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', paddingHorizontal: 24 },
  selectSheet: { backgroundColor: '#fff', borderRadius: radius.xl, maxHeight: '60%', paddingVertical: 16 },
  selectSheetTitle: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  selectOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  selectOptionText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#1E293B' },
  selectEmpty: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#94A3B8', padding: 20, textAlign: 'center' },
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
  agreeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, paddingTop: 4 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  agreeText: { flex: 1, fontSize: 13.5, fontFamily: 'Montserrat-SemiBold', color: '#1E293B', lineHeight: 20 },
  agreeLink: { color: colors.accent, fontFamily: 'Montserrat-Bold' },
  signatureSection: { marginTop: 6 },
  signatureTitle: { fontSize: 13.5, fontFamily: 'Montserrat-Bold', color: '#1E293B', marginBottom: 10 },
  signatureBox: {
    flexDirection: 'row', alignItems: 'stretch', height: 92, backgroundColor: '#F8FAFC',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, overflow: 'hidden',
  },
  signatureBoxLabelWrap: { width: 76, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  signatureBoxLabelText: { fontSize: 10, fontFamily: 'Montserrat-Bold', color: '#94A3B8', letterSpacing: 0.3, lineHeight: 15, textAlign: 'center' },
  signatureBoxDivider: { width: 1, alignSelf: 'center', height: '60%', backgroundColor: '#E2E8F0' },
  signatureFootnote: { fontSize: 11.5, fontFamily: 'Poppins-Regular', color: '#94A3B8', marginTop: 10, lineHeight: 16 },
  payBtn: { flexDirection: 'row', backgroundColor: colors.accent, height: 56, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24, shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  payBtnDisabled: { opacity: 0.45, shadowOpacity: 0 },
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
