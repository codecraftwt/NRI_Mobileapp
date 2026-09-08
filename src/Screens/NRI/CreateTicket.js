import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { setPendingTicketFinalize, setPendingSubscriptionFinalize } from '../../Redux/slices/pendingRequestsSlice';
import { onboardingUserKey } from '../../Redux/slices/onboardingSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { getWallet } from '../../Api/walletApi';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';
import { useServiceCategories } from '../../Hooks/useServiceCategories';
import { usePriorities } from '../../Hooks/usePriorities';
import { useServicesByCategory } from '../../Hooks/useServicesByCategory';
import { useServiceGroups } from '../../Hooks/useServiceGroups';
import { useServiceSubscription } from '../../Hooks/useServiceSubscription';
import { useTicketBooking } from '../../Hooks/useTicketBooking';
import { useMembership } from '../../Hooks/useMembership';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';
import { runRazorpayPayment } from '../../Utils/paymentGateway';
import { usePaymentGateways, gatewayIcon, GATEWAY_META } from '../../Hooks/usePaymentGateways';

const ONE_TIME = 'One-Time Request';
const RECURRING = 'Recurring Subscription';
const REQUEST_TYPES = [ONE_TIME, RECURRING];
// Standard GST rate used for the instant local estimate (shown before a state
// is picked). The server quote returns the authoritative gst_rate/gst_amount
// once state_id is available and takes over from this estimate.
const GST_RATE = 0.18;
// Recurring services are priced/quoted in USD (customer_price).
const formatUsdMonthly = (pricing) => {
  if (!pricing) return '';
  if (pricing.isQuoted) return 'On quote';
  return `$${Number(pricing.customerPrice ?? 0).toFixed(2)}/${pricing.unit || 'monthly'}`;
};

// One-time charges are quoted in USD (customer_price / total_amount), same as
// the catalog — format them with a $ instead of the old ₹ display.
const formatUsdAmount = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Dropdown label for a priority tier — appends the flat surcharge when it has
// one so the cost is visible in the picker (the default tier shows no fee).
const priorityLabel = (p) => (p.surcharge > 0 ? `${p.name} (+${formatUsdAmount(p.surcharge)})` : p.name);

// The quote's gst_rate may arrive as a fraction (0.18) or a whole percent
// (18) — normalize to a percent for the "GST (18%)" label, dropping trailing
// decimals when it's a round number.
const formatGstLabel = (rate) => {
  if (rate == null) return 'GST';
  const pct = rate <= 1 ? rate * 100 : rate;
  const rounded = Number.isInteger(pct) ? pct : Number(pct.toFixed(2));
  return `GST (${rounded}%)`;
};
function SelectField({ label, required, value, placeholder, options, disabled, loading, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity
        style={[styles.selectBox, (disabled || loading) && styles.selectBoxDisabled]}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#3298D4" />
            <Text style={[styles.selectText, styles.placeholderText, { marginLeft: 8 }]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>
              {value || placeholder}
            </Text>
            <Icon name="keyboard-arrow-down" size={20} color="#666" />
          </>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color="#3298D4" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function CreateTicket({ route, navigation }) {
  const [requestType, setRequestType] = useState(route.params?.requestType === 'recurring' ? RECURRING : ONE_TIME);
  const [serviceCategory, setServiceCategory] = useState(route.params?.initialCategory || '');
  const [selectedBaseServiceIds, setSelectedBaseServiceIds] = useState(route.params?.initialBaseServiceIds || []);
  const [selectedAddonIds, setSelectedAddonIds] = useState(route.params?.initialAddons || []);
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState(route.params?.initialSubscriptionServiceIds || []);
  const isRecurring = requestType === RECURRING;
  // The selected one-time priority tier's slug (posted as `urgency`). Defaults
  // to 'standard' so quotes work before the /priorities list loads; corrected
  // to the API's default tier once available.
  const [prioritySlug, setPrioritySlug] = useState('standard');
  // State/city are pre-filled from the location gate (Services → ServiceDetail).
  const [state, setState] = useState(route.params?.initialState || '');
  const [city, setCity] = useState(route.params?.initialCity || '');
  const [pincode, setPincode] = useState('');
  const [couponCode, setCouponCode] = useState('');
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  // While the hosted-checkout WebView (Stripe/PayPal) is open:
  // { url, paymentId?, kind, successTitle, successMessage }
  const [checkoutSession, setCheckoutSession] = useState(null);
  const { showAlert, alertProps } = useAppAlert();

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  // Real geo cities (GET /geo/cities?state_id=) — vendor availability and
  // pricing are keyed on the city, and city_id is now required at checkout.
  const { cities, cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useCities(state);
  const { categoryNames, loading: loadingCategories, failed: categoriesFailed, retry: retryCategories } = useServiceCategories();

  // Resolved geo ids — needed by the service/quote calls below. cityId prefers
  // the resolved city, falling back to the id passed from the location gate
  // (in case the /geo/cities list hasn't loaded yet on first render).
  const stateId = state ? states.find(s => s.name === state)?.id : null;
  const cityId = (city ? cities.find(c => c.name === city)?.id : null) ?? route.params?.initialCityId ?? null;
  // State + city are picked in the location step (Services) and can't be
  // changed here — the fetched services are specific to that location.
  const locationLocked = !!(route.params?.initialState && route.params?.initialCity);
  const { priorities, loading: prioritiesLoading, failed: prioritiesFailed, retry: retryPriorities } = usePriorities();
  const { loading: loadingPincodeLookup, lookup: lookupPincode } = usePostalCodeLookup();
  const { membership, usage } = useMembership();
  const user = useSelector(s => s.user.user);
  const userId = useSelector(s => onboardingUserKey(s.user.user));
  const dispatch = useDispatch();
  const { gateways } = usePaymentGateways();
  // Keep the selected gateway valid against the backend's available list.
  useEffect(() => {
    if (gateways.length && !gateways.some(g => g.value === paymentMethod)) {
      setPaymentMethod(gateways[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateways]);
  const {
    services: baseServices,
    loading: loadingBaseServices,
    failed: baseServicesFailed,
    retry: retryBaseServices,
  } = useServicesByCategory(serviceCategory, state, { type: 'base', cityId });
  const {
    services: addonServices,
    loading: loadingAddonServices,
    failed: addonServicesFailed,
    retry: retryAddonServices,
  } = useServicesByCategory(serviceCategory, state, { type: 'addon', cityId });

  // Recurring services for the subscription flow (Service.allows_recurring).
  const { recurring: recurringServices, loading: loadingRecurring } = useServiceGroups(serviceCategory, state, cityId);
  const { createLoading: subscribeLoading, createSubscription } = useServiceSubscription();

  // Available coupons come from the customer wallet (GET /customer/wallet),
  // fetched on demand when the coupons modal opens.
  const [walletCoupons, setWalletCoupons] = useState([]);
  const [walletCouponsLoading, setWalletCouponsLoading] = useState(false);

  const {
    quote,
    quoteLoading,
    fetchQuote,
    appliedCoupon,
    couponApplyLoading,
    applyCoupon,
    clearCoupon,
    submitLoading,
    submitTicket,
    verifyLoading,
    verifyPayment,
    reset: resetBooking,
  } = useTicketBooking();

  const primaryBaseServiceId = selectedBaseServiceIds[0] || null;
  const selectedService = baseServices.find(s => s.id === primaryBaseServiceId) || null;

  // The backend's usage endpoint always returns null for requests_limit/
  // visits_limit — the actual per-plan entitlement lives on the active
  // membership's plan features instead (verified live via GET /plans:
  // slugs 'service-requests' and 'parent-care-visits', values like "10"/"2"
  // that vary per plan tier), so that's what we cross-reference here.
  const serviceRequestsLimit = membership?.features?.find(f => f.slug === 'service-requests')?.value ?? usage?.requestsLimit ?? null;
  const parentCareVisitsLimit = membership?.features?.find(f => f.slug === 'parent-care-visits')?.value ?? usage?.visitsLimit ?? null;

  // The base service is what the category's membership already includes
  // (per the backend: "Standard ... request — included in your membership.
  // Add specific services as needed.") — it isn't meant to be a manual pick,
  // so default to the first one as soon as the category's list loads. The


  // The emergency tier isn't offered only for services that *explicitly*
  // disallow it. When the service omits `allows_emergency` (undefined/null),
  // treat it as allowed so the Emergency tier from /priorities still shows.
  const emergencyAllowed = !selectedService || selectedService.allowsEmergency !== false;
  const availablePriorities = priorities.filter(p => emergencyAllowed || !p.isEmergencyTier);

  // Keep the selection valid: default to the API's default tier (or the first
  // available) once priorities load, and reset off an emergency tier that's no
  // longer valid for the chosen service.
  useEffect(() => {
    if (availablePriorities.length === 0) return;
    if (!availablePriorities.some(p => p.slug === prioritySlug)) {
      const fallback = availablePriorities.find(p => p.isDefault) || availablePriorities[0];
      setPrioritySlug(fallback.slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorities, emergencyAllowed]);

  const addonIdsKey = selectedAddonIds.join(',');
  const baseServiceIdsKey = selectedBaseServiceIds.join(',');

  // Re-quote from the server any time the booking selection changes —
  // pricing (plan overage, express surcharge, coupon discount) is computed
  // server-side, not re-derived here.
  useEffect(() => {
    // city_id is now required by the quote endpoint — don't call it until a
    // city is resolved (avoids a guaranteed 422).
    if (selectedBaseServiceIds.length === 0 || !stateId || !cityId) return;
    fetchQuote({
      serviceId: selectedBaseServiceIds[0],
      extraServices: selectedBaseServiceIds.slice(1),
      addons: selectedAddonIds,
      stateId,
      cityId,
      urgency: prioritySlug || 'standard',
      couponCode: appliedCoupon?.code,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseServiceIdsKey, addonIdsKey, stateId, cityId, prioritySlug, appliedCoupon?.code]);

  // The server quote needs a state (the API 422s without state_id), which
  // sits further down the form than the add-on checkboxes. So the panel
  // doesn't sit blank while the user is still picking add-ons, compute an
  // instant local estimate from the already-fetched addon prices — the
  // authoritative `quote` (handles plan overage/express surcharge/coupon)
  // takes over as soon as it's available.
  const selectedAddonServices = addonServices.filter(s => selectedAddonIds.includes(s.id));
  const localAddonsSubtotal = selectedAddonServices.reduce((sum, s) => sum + (s.pricing?.customerPrice || 0), 0);
  const selectedBaseServicesList = baseServices.filter(s => selectedBaseServiceIds.includes(s.id));
  const localBasePrice = selectedBaseServicesList.reduce((sum, s) => sum + (s.pricing?.customerPrice || 0), 0);
  // The chosen priority tier's flat surcharge (0 for the default tier) — folded
  // into the local estimate; the server quote returns the authoritative amount.
  const selectedPriority = availablePriorities.find(p => p.slug === prioritySlug) || null;
  const prioritySurcharge = selectedPriority?.surcharge || 0;
  const localSubtotal = localBasePrice + localAddonsSubtotal + prioritySurcharge;
  const localGst = Math.round(localSubtotal * GST_RATE * 100) / 100;
  const localTotal = localSubtotal + localGst;

  // Service line items for the server-quote view. The service list itself
  // carries no price and the quote's `lines` array frequently comes back empty
  // — in that case the authoritative base charge is the quote's `customer_price`
  // (quote.customerPrice). Show it as a single service-charge row so the charge
  // is always visible instead of collapsing into the GST line. Only fall back to
  // the (usually price-less) selected services when the backend gives real lines.
  const quoteBaseCharge = Number(quote?.customerPrice ?? localBasePrice ?? 0);
  const quoteLines = quote?.lines?.length
    ? quote.lines
    : (quoteBaseCharge > 0
        ? [{
            serviceId: primaryBaseServiceId || 'base',
            name: selectedBaseServicesList.length === 1
              ? selectedBaseServicesList[0].name
              : selectedBaseServicesList.length > 1
                ? 'Services'
                : selectedService?.name || 'Service charge',
            customerPrice: quoteBaseCharge,
          }]
        : []);

  // The live backend bakes GST into total_amount and often returns
  // gst_amount / gst_rate as null on the quote — so GST didn't render and the
  // total could come back empty. Derive both when missing:
  // GST = total − (base lines + add-ons + surcharge − discount).
  const quoteBaseSum = quoteLines.reduce((sum, l) => sum + Number(l.customerPrice || 0), 0);
  const quotePreGst = quote
    ? quoteBaseSum + Number(quote.addonsSubtotal || 0) + Number(quote.expressSurcharge || 0) - Number(quote.discount || 0)
    : 0;
  const quoteGstAmount = quote
    ? (Number(quote.gstAmount) > 0
        ? Number(quote.gstAmount)
        : Math.max(0, Math.round((Number(quote.totalAmount || 0) - quotePreGst) * 100) / 100))
    : 0;
  // If the quote didn't return usable GST, estimate it at the standard rate so
  // the customer always sees a GST line and a correct total.
  const effectiveQuoteGst = quoteGstAmount > 0
    ? quoteGstAmount
    : Math.round(quotePreGst * GST_RATE * 100) / 100;
  const quoteGstRate = quote?.gstRate != null
    ? quote.gstRate
    : (quotePreGst > 0 ? effectiveQuoteGst / quotePreGst : GST_RATE);
  // Total comes straight from the backend quote (total_amount) when present, so
  // it always matches what the customer is actually charged; the service +
  // add-ons + surcharge − discount + GST rows above are built to add up to it.
  // Only fall back to the reconstructed sum when the quote returned no total.
  const quoteTotal = Number(quote?.totalAmount) > 0
    ? Number(quote.totalAmount)
    : quotePreGst + effectiveQuoteGst;

  // --- Recurring subscription selection ---
  const selectedSubscriptionServices = recurringServices.filter(s => selectedSubscriptionIds.includes(s.id));
  const subscriptionMonthlyTotal = selectedSubscriptionServices.reduce((sum, s) => sum + (s.pricing?.customerPrice || 0), 0);

  // city_id (a resolved city) is required by the backend for both flows. Both
  // are pay-first now: who/where + documents are collected afterward on
  // FinishRequest, once the payment started here has cleared.
  const isValid = isRecurring
    ? (serviceCategory && selectedSubscriptionIds.length > 0 && !!state && !!cityId && pincode.trim().length > 0)
    : (serviceCategory && selectedBaseServiceIds.length > 0 && !!prioritySlug
        && !!state && !!cityId && pincode.trim().length > 0);

  const handlePincodeLookup = () => {
    if (!pincode || pincode.trim().length < 4) {
      showAlert('Enter PIN Code', 'Please enter a valid PIN code to look up.');
      return;
    }
    lookupPincode(pincode.trim())
      .unwrap()
      .then((result) => {
        const match = result?.results?.[0];
        if (!match) {
          showAlert('Not Found', 'No address found for that PIN code.');
          return;
        }
        if (match.stateName) setState(match.stateName);
        if (match.cityName) setCity(match.cityName);
      })
      .catch((error) => {
        showAlert('Lookup Failed', error?.message || 'Could not look up that PIN code. Please try again.');
      });
  };

  const handleSelectCategory = (v) => {
    setServiceCategory(v);
    setSelectedBaseServiceIds([]);
    setSelectedAddonIds([]);
    setSelectedSubscriptionIds([]);
    setCouponCode('');
    clearCoupon();
    resetBooking();
  };

  const handleSelectRequestType = (v) => {
    setRequestType(v);
    // The two modes track different selections/pricing — clear the other one's
    // state so a leftover base-service or subscription pick can't leak across.
    setSelectedBaseServiceIds([]);
    setSelectedAddonIds([]);
    setSelectedSubscriptionIds([]);
    setCouponCode('');
    clearCoupon();
    resetBooking();
  };

  const toggleAddon = (id) => {
    setSelectedAddonIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const toggleSubscriptionService = (id) => {
    setSelectedSubscriptionIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    applyCoupon({ code: couponCode.trim(), addons: selectedAddonIds, stateId, cityId })
      .unwrap()
      .then((result) => {
        Alert.alert('Coupon Applied', `Code ${result.code} applied — you save ${formatUsdAmount(result.discount)}.`);
      })
      .catch((error) => {
        Alert.alert('Invalid Coupon', error?.message || 'This coupon could not be applied.');
      });
  };

  const handleViewCoupons = () => {
    setShowCouponsModal(true);
    setWalletCouponsLoading(true);
    getWallet()
      .then((res) => setWalletCoupons(res.coupons || []))
      .catch(() => setWalletCoupons([]))
      .finally(() => setWalletCouponsLoading(false));
  };

  const handlePickCoupon = (coupon) => {
    setCouponCode(coupon.code);
    setShowCouponsModal(false);
    applyCoupon({ code: coupon.code, addons: selectedAddonIds, stateId, cityId })
      .unwrap()
      .then((result) => {
        Alert.alert('Coupon Applied', `Code ${result.code} applied — you save ${formatUsdAmount(result.discount)}.`);
      })
      .catch((error) => {
        Alert.alert('Invalid Coupon', error?.message || 'This coupon could not be applied.');
      });
  };

  // After a successful booking/payment, land on the main Services page (the
  // Services tab's list), not just the previous screen.
  const goToServices = () => navigation.navigate('Services', { screen: 'ServicesMain' });

  // Called once the hosted-checkout WebView (Stripe/PayPal) redirects back
  // with a session_id. Both tickets and subscriptions are pay-first now:
  // the payment_id is confirmed via /payments/verify, then handed off to
  // FinishRequest to actually create the ticket/subscription (who/where +
  // documents).
  const handleCheckoutSuccess = async (sessionId) => {
    const session = checkoutSession;
    setCheckoutSession(null);
    try {
      if (session?.paymentId) {
        await verifyPayment({ paymentId: session.paymentId, sessionId }).unwrap();
      }
      if (session?.payFirst) {
        navigation.navigate('FinishRequest', {
          mode: session?.kind === 'subscription' ? 'subscription' : 'ticket',
          paymentId: session.paymentId,
        });
        return;
      }
      showAlert(session?.successTitle || 'Payment Successful', session?.successMessage || 'Your payment has been confirmed.', [
        { text: 'OK', onPress: goToServices },
      ]);
    } catch (error) {
      showAlert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
    }
  };

  const handleCheckoutCancel = () => {
    setCheckoutSession(null);
    // The request isn't confirmed until it's paid — make that explicit instead
    // of silently closing (which looked like the request went through).
    showAlert(
      'Payment Required',
      "Your request isn't confirmed until payment is completed. You can finish paying anytime from My Requests.",
      [{ text: 'OK' }]
    );
  };

  // Pay-first: this only prices the selection and starts payment — nothing is
  // created until FinishRequest's finalize call succeeds (see mode:
  // 'subscription' there).
  const submitSubscription = async (gateway) => {
    if (!isValid) return;
    try {
      const result = await createSubscription({
        serviceIds: selectedSubscriptionIds,
        gateway,
        stateId,
        cityId,
        pincode: pincode.trim(),
      }).unwrap();

      if (result.paymentId) {
        dispatch(setPendingSubscriptionFinalize({
          userId,
          paymentId: result.paymentId,
          serviceIds: selectedSubscriptionIds,
          serviceNames: selectedSubscriptionServices.map(s => s.name),
          stateId,
          cityId,
          stateName: state,
          cityName: city,
        }));
      }

      if (result.checkoutUrl) {
        // Stripe / PayPal hosted checkout — open in the in-app WebView;
        // handleCheckoutSuccess routes to FinishRequest once it redirects
        // back with a session_id.
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId, kind: 'subscription', payFirst: true });
        return;
      }
      if (result.order) {
        // Razorpay — no hosted page; drive the native SDK then verify inline.
        await runRazorpayPayment({
          order: result.order,
          paymentId: result.paymentId,
          name: 'NRI Circle',
          description: 'Recurring service subscription',
          user,
          verify: (params) => verifyPayment(params).unwrap(),
        });
      }
      navigation.navigate('FinishRequest', { mode: 'subscription', paymentId: result.paymentId });
    } catch (error) {
      showAlert('Subscription Failed', error?.message || 'Could not start your subscription. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    if (isRecurring) {
      // Billed through the customer's chosen international gateway.
      submitSubscription(paymentMethod);
      return;
    }
    try {
      // Pay-first: this only prices the selection and starts payment — nothing
      // is created until FinishRequest's finalize call succeeds.
      const result = await submitTicket({
        serviceId: selectedBaseServiceIds[0],
        extraServices: selectedBaseServiceIds.slice(1),
        addons: selectedAddonIds,
        couponCode: appliedCoupon?.code,
        stateId,
        cityId,
        pincode: pincode.trim(),
        urgency: prioritySlug || 'standard',
        gateway: paymentMethod,
      }).unwrap();

      if (result.paymentId) {
        dispatch(setPendingTicketFinalize({
          userId,
          paymentId: result.paymentId,
          serviceIds: [selectedBaseServiceIds[0], ...selectedBaseServiceIds.slice(1), ...selectedAddonIds],
          serviceNames: [...selectedBaseServicesList.map(s => s.name), ...selectedAddonServices.map(s => s.name)],
          stateId,
          cityId,
          stateName: state,
          cityName: city,
          amount: result.amount,
          currency: result.currency,
          origin: 'single',
        }));
      }

      if (result.requiresPayment && result.checkoutUrl) {
        // Stripe / PayPal hosted checkout — open in the in-app WebView;
        // handleCheckoutSuccess routes to FinishRequest once it redirects
        // back with a session_id.
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId, payFirst: true });
        return;
      }
      if (result.requiresPayment && result.order) {
        // Razorpay — no hosted page; drive the native SDK then verify inline.
        await runRazorpayPayment({
          order: result.order,
          paymentId: result.paymentId,
          name: 'NRI Circle',
          description: 'Service request',
          user,
          verify: (params) => verifyPayment(params).unwrap(),
        });
      }
      // Either nothing was owed (requires_payment: false) or the Razorpay
      // payment above just cleared — either way, finish the request on
      // FinishRequest (it reads the pending state we just set).
      navigation.navigate('FinishRequest', { mode: 'ticket', paymentId: result.paymentId });
    } catch (error) {
      showAlert('Submission Failed', error?.message || 'Could not submit your request. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Submit a Service Request</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* {membership && usage && (
          <View style={styles.usageBanner}>
            <Icon name="info-outline" size={16} color="#D94625" style={{ marginTop: 2 }} />
            <Text style={styles.usageBannerText}>
              You have used <Text style={styles.bold}>{usage.requestsUsed ?? 0}{serviceRequestsLimit != null ? ` of ${serviceRequestsLimit}` : ''}</Text> service requests included in your {membership.planName} plan this month.
              {' '}Parent-care visits used: <Text style={styles.bold}>{usage.visitsUsed ?? 0}{parentCareVisitsLimit != null ? ` of ${parentCareVisitsLimit}` : ''}</Text>.
            </Text>
          </View>
        )} */}

        {/* Priority tiers — one-time requests only (recurring subscriptions
            have no per-request urgency). */}
        {!isRecurring && (
          <>
            <Text style={styles.sectionTitle}>Priority</Text>
            <View style={styles.card}>
              <SelectField
                label="Priority"
                required
                value={selectedPriority ? priorityLabel(selectedPriority) : ''}
                placeholder="Select priority..."
                options={availablePriorities.map(priorityLabel)}
                loading={prioritiesLoading}
                onSelect={(label) => {
                  const picked = availablePriorities.find(p => priorityLabel(p) === label);
                  if (picked) setPrioritySlug(picked.slug);
                }}
              />
              {prioritiesFailed && (
                <TouchableOpacity onPress={retryPriorities}>
                  <Text style={styles.retryText}>Couldn't load priorities. Tap to retry.</Text>
                </TouchableOpacity>
              )}
              {!emergencyAllowed && !prioritiesLoading && (
                <Text style={styles.hint}>Emergency priority isn't available for the selected service.</Text>
              )}
            </View>
          </>
        )}

        {/* <Text style={styles.sectionTitle}>What do you need?</Text>
        <View style={styles.card}>
          <SelectField
            label="Request Type"
            required
            value={requestType}
            placeholder="Select request type..."
            options={REQUEST_TYPES}
            onSelect={handleSelectRequestType}
          />
          <SelectField
            label="Service Category"
            required
            value={serviceCategory}
            placeholder="Select a category..."
            options={categoryNames}
            loading={loadingCategories}
            onSelect={handleSelectCategory}
            disabled={!!route.params?.initialCategory}
          />
          {categoriesFailed && (
            <TouchableOpacity onPress={retryCategories}>
              <Text style={styles.retryText}>Couldn't load categories. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          {isRecurring && (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Services to Subscribe To<Text style={styles.required}> *</Text></Text>
              {!serviceCategory ? (
                <Text style={styles.hint}>Select a category to see recurring services.</Text>
              ) : loadingRecurring ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator size="small" color="#3298D4" />
                  <Text style={styles.hint}>Loading services…</Text>
                </View>
              ) : recurringServices.length === 0 ? (
                <Text style={styles.hint}>No recurring services available for this category.</Text>
              ) : (
                <View style={{ gap: 12 }}>
                  {recurringServices.map(s => {
                    const isSelected = selectedSubscriptionIds.includes(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.addonCard, isSelected && styles.addonCardSelected]}
                        onPress={() => toggleSubscriptionService(s.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.addonCheckboxSquare, isSelected && styles.addonCheckboxSquareChecked]}>
                          {isSelected && <Icon name="check" size={14} color="white" />}
                        </View>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={styles.addonCardName}>{s.name}</Text>
                          <Text style={styles.addonCardSub}>{s.description || 'Billed monthly'}</Text>
                        </View>
                        <Text style={styles.addonCardPrice}>{formatUsdMonthly(s.pricing)}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}

          {!isRecurring && (<>
          <SelectField
            label="Priority"
            required
            value={priority}
            placeholder="Select priority..."
            options={priorityOptions}
            onSelect={setPriority}
          />
          {selectedService && !selectedService.allowsEmergency && (
            <Text style={styles.hint}>Emergency priority isn't available for this service.</Text>
          )}

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Base Service<Text style={styles.required}> *</Text></Text>
            {!serviceCategory ? (
              <Text style={styles.hint}>Select a category to see available services.</Text>
            ) : loadingBaseServices ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator size="small" color="#3298D4" />
                <Text style={styles.hint}>Loading services…</Text>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {baseServices.filter(s => selectedBaseServiceIds.includes(s.id)).map(s => {
                  const included = !s.pricing || s.pricing.customerPrice === 0;
                  return (
                    <View
                      key={s.id}
                      style={[styles.baseServiceCard, styles.baseServiceCardSelected]}
                    >
                      <View style={{ flex: 1, paddingRight: 12 }}>
                        <Text style={styles.baseServiceName}>{s.name}</Text>
                        {!!s.pricing?.turnaroundLabel && <Text style={styles.baseServiceSub}>{s.pricing.turnaroundLabel}</Text>}
                      </View>
                      {included ? (
                        <View style={styles.includedPill}>
                          <Text style={styles.includedPillText}>Included</Text>
                        </View>
                      ) : (
                        <Text style={styles.baseServicePrice}>{s.pricing.displayPrice}</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          {baseServicesFailed && (
            <TouchableOpacity onPress={retryBaseServices}>
              <Text style={styles.retryText}>Couldn't load services. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          {serviceCategory && selectedAddonIds.length > 0 && (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Selected Add-ons</Text>
              {loadingAddonServices ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator size="small" color="#3298D4" />
                  <Text style={styles.hint}>Loading add-ons…</Text>
                </View>
              ) : (
                <View style={{ gap: 12 }}>
                  {addonServices.filter(s => selectedAddonIds.includes(s.id)).map(s => {
                    return (
                      <View
                        key={s.id}
                        style={[styles.addonCard, styles.addonCardSelected]}
                      >
                        <View style={[styles.addonCheckboxSquare, styles.addonCheckboxSquareChecked]}>
                          <Icon name="check" size={14} color="white" />
                        </View>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                          <Text style={styles.addonCardName}>{s.name}</Text>
                          {!!s.pricing?.turnaroundLabel && <Text style={styles.addonCardSub}>{s.pricing.turnaroundLabel}</Text>}
                        </View>
                        <Text style={styles.addonCardPrice}>{s.pricing?.displayPrice}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
              {addonServicesFailed && (
                <TouchableOpacity onPress={retryAddonServices}>
                  <Text style={styles.retryText}>Couldn't load add-ons. Tap to retry.</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          </>)}
        </View> */}

        {/* Both flows are pay-first now: who this is for, the exact address,
            and any required documents are collected on FinishRequest, after
            payment — this only needs enough to price/pay the selection. */}
        <Text style={styles.sectionTitle}>Where</Text>
        <View style={styles.card}>
          <SelectField
            label="State"
            required
            value={state}
            placeholder="Select state..."
            options={stateNames}
            disabled={locationLocked}
            onSelect={(v) => {
              setState(v);
              setCity('');
            }}
            loading={loadingStates}
          />
          {statesFailed && !locationLocked && (
            <TouchableOpacity onPress={retryStates}>
              <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <SelectField
            label="City"
            required
            value={city}
            placeholder="Select state first..."
            options={cityNames}
            disabled={locationLocked || !state}
            loading={loadingCities}
            onSelect={setCity}
          />
          {citiesFailed && !locationLocked && (
            <TouchableOpacity onPress={retryCities}>
              <Text style={styles.retryText}>Couldn't load cities. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>PIN Code<Text style={styles.required}> *</Text></Text>
            <View style={styles.pincodeRow}>
              <TextInput
                style={[styles.input, styles.pincodeInput]}
                value={pincode}
                onChangeText={setPincode}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="e.g. 400001"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity style={styles.lookupBtn} onPress={handlePincodeLookup} disabled={loadingPincodeLookup}>
                {loadingPincodeLookup ? (
                  <ActivityIndicator size="small" color="#3298D4" />
                ) : (
                  <Text style={styles.lookupBtnText}>Find</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.estimateCard}>
          <Text style={styles.sectionTitle}>{isRecurring ? 'Subscription Summary' : 'Estimated Charges'}</Text>
          {isRecurring ? (
            selectedSubscriptionServices.length === 0 ? (
              <Text style={styles.hint}>Choose one or more services to subscribe to.</Text>
            ) : (
              <>
                {selectedSubscriptionServices.map(s => (
                  <View key={s.id} style={[styles.priceRow, styles.priceRowDashed]}>
                    <Text style={styles.priceLabel} numberOfLines={1}>+ {s.name}</Text>
                    <Text style={styles.priceValue}>{formatUsdMonthly(s.pricing)}</Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total / month</Text>
                  <Text style={styles.totalValue}>${subscriptionMonthlyTotal.toFixed(2)}</Text>
                </View>
                <Text style={[styles.hint, { marginTop: 4 }]}>Billed automatically each period until you cancel.</Text>
              </>
            )
          ) : selectedBaseServiceIds.length === 0 ? (
            <Text style={styles.hint}>Choose a service to see pricing.</Text>
          ) : quote && stateId ? (
            <>
              {quoteLines.map(line => (
                <View key={line.serviceId} style={[styles.priceRow, styles.priceRowDashed]}>
                  <Text style={styles.priceLabel} numberOfLines={1}>+ {line.name}</Text>
                  <Text style={styles.priceValue}>{formatUsdAmount(line.customerPrice)}</Text>
                </View>
              ))}
              {quote.addonsSubtotal > 0 && (
                <View style={[styles.priceRow, styles.priceRowDashed]}>
                  <Text style={styles.priceLabel} numberOfLines={1}>+ Add-ons</Text>
                  <Text style={styles.priceValue}>{formatUsdAmount(quote.addonsSubtotal)}</Text>
                </View>
              )}
              {quote.expressSurcharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{selectedPriority?.name ? `${selectedPriority.name} priority` : 'Priority surcharge'}</Text>
                  <Text style={styles.priceValue}>+{formatUsdAmount(quote.expressSurcharge)}</Text>
                </View>
              )}
              {quote.discount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, styles.discountText]}>Coupon discount</Text>
                  <Text style={[styles.priceValue, styles.discountText]}>-{formatUsdAmount(quote.discount)}</Text>
                </View>
              )}
              {effectiveQuoteGst > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{formatGstLabel(quoteGstRate)}</Text>
                  <Text style={styles.priceValue}>+{formatUsdAmount(effectiveQuoteGst)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatUsdAmount(quoteTotal)}</Text>
              </View>
            </>
          ) : quoteLoading && stateId ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#3298D4" />
              <Text style={styles.hint}>Calculating…</Text>
            </View>
          ) : (
            <>
              {selectedBaseServicesList.map(s => (
                <View key={s.id} style={[styles.priceRow, styles.priceRowDashed]}>
                  <Text style={styles.priceLabel} numberOfLines={1}>+ {s.name}</Text>
                  <Text style={styles.priceValue}>{formatUsdAmount(s.pricing?.customerPrice)}</Text>
                </View>
              ))}
              {selectedAddonServices.map(s => (
                <View key={s.id} style={[styles.priceRow, styles.priceRowDashed]}>
                  <Text style={styles.priceLabel} numberOfLines={1}>+ {s.name}</Text>
                  <Text style={styles.priceValue}>{formatUsdAmount(s.pricing?.customerPrice)}</Text>
                </View>
              ))}
              {prioritySurcharge > 0 && (
                <View style={[styles.priceRow, styles.priceRowDashed]}>
                  <Text style={styles.priceLabel} numberOfLines={1}>+ {selectedPriority?.name || 'Priority'} priority</Text>
                  <Text style={styles.priceValue}>{formatUsdAmount(prioritySurcharge)}</Text>
                </View>
              )}
              {localGst > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{formatGstLabel(GST_RATE)}</Text>
                  <Text style={styles.priceValue}>+{formatUsdAmount(localGst)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatUsdAmount(localTotal)}</Text>
              </View>
              {!stateId && (
                <Text style={styles.hint}>GST is estimated at 18% — select your state below to confirm final pricing (incl. any express surcharge).</Text>
              )}
            </>
          )}

          {(isRecurring ? selectedSubscriptionIds.length > 0 : selectedBaseServiceIds.length > 0) && (
            <>
              <Text style={styles.paymentMethodLabel}>Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                {gateways.map(g => {
                  const active = paymentMethod === g.value;
                  return (
                    <TouchableOpacity
                      key={g.value}
                      style={[styles.paymentOption, active && styles.paymentOptionActive]}
                      onPress={() => setPaymentMethod(g.value)}
                      activeOpacity={0.7}
                    >
                      <Icon name={gatewayIcon(g.value)} size={20} color={active ? '#D94625' : '#94A3B8'} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.paymentOptionText, active && styles.paymentOptionTextActive]}>{g.label}</Text>
                        {!!GATEWAY_META[g.value]?.desc && <Text style={styles.paymentOptionDesc}>{GATEWAY_META[g.value].desc}</Text>}
                      </View>
                      <View style={[styles.paymentRadio, active && styles.paymentRadioActive]}>
                        {active && <View style={styles.paymentRadioDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {selectedBaseServiceIds.length > 0 && (
            <>
              <Text style={styles.couponLabel}>Have an add-on coupon?</Text>
              <View style={styles.couponRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="E.G. CARE499"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  value={couponCode}
                  onChangeText={setCouponCode}
                />
                <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCoupon} disabled={couponApplyLoading}>
                  {couponApplyLoading ? <ActivityIndicator size="small" color="#3298D4" /> : <Text style={styles.applyBtnText}>Apply</Text>}
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.viewCouponsRow} onPress={handleViewCoupons}>
                <Icon name="local-offer" size={14} color="#D94625" />
                <Text style={styles.viewCouponsLink}>View available coupons</Text>
                <Icon name="expand-more" size={16} color="#D94625" />
              </TouchableOpacity>
            </>
          )}

          <Text style={[styles.hint, { marginTop: 4 }]}>
            Who this is for, the exact address, and any documents are collected on the next step, after payment.
          </Text>

          <TouchableOpacity
            style={[styles.submitBtn, (!isValid || submitLoading || verifyLoading || subscribeLoading) && styles.submitBtnDisabled]}
            disabled={!isValid || submitLoading || verifyLoading || subscribeLoading}
            onPress={handleSubmit}
          >
            {submitLoading || verifyLoading || subscribeLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{isRecurring ? 'Subscribe' : 'Continue to Payment'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showCouponsModal} transparent animationType="fade" onRequestClose={() => setShowCouponsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCouponsModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Available Coupons</Text>
            {walletCouponsLoading ? (
              <View style={[styles.inlineLoading, { padding: 16 }]}>
                <ActivityIndicator size="small" color="#3298D4" />
                <Text style={styles.hint}>Loading coupons…</Text>
              </View>
            ) : (
              <FlatList
                data={walletCoupons}
                keyExtractor={(item) => String(item.id ?? item.code)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => handlePickCoupon(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.couponCodeText}>{item.code}</Text>
                      {!!item.description && <Text style={styles.couponDescText}>{item.description}</Text>}
                    </View>
                    <Icon name="chevron-right" size={20} color="#3298D4" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={[styles.hint, { padding: 16 }]}>No coupons available right now.</Text>}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      <AppAlert {...alertProps} />

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
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  headerContainer: {
    backgroundColor: '#20304C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: STATUS_BAR_HEIGHT,
    paddingBottom: 10,
    gap: 12,
  },
  headerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: { paddingBottom: 60, paddingHorizontal: 20, paddingTop: 12 },
  usageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#D9462510',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D9462530',
  },
  usageBannerText: { flex: 1, fontSize: 13, color: '#D94625', lineHeight: 20 },
  bold: { fontWeight: '700' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 8, marginBottom: 16, letterSpacing: -0.3 },
  card: { 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderRadius: 24, 
    gap: 20, 
    marginBottom: 28,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  estimateCard: { 
    backgroundColor: '#FFFFFF', 
    padding: 24, 
    borderRadius: 24, 
    gap: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  priceRowDashed: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, borderStyle: 'dashed' },
  priceLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  priceValue: { ...typography.labelMedium, color: colors.textPrimary },
  discountText: { color: colors.success },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4, borderTopWidth: 2, borderTopColor: colors.surfaceSecondary },
  totalLabel: { ...typography.h4, color: colors.textPrimary },
  totalValue: { ...typography.appTitle, color: colors.textPrimary },
  fieldWrap: { gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 },
  required: { color: '#EF4444' },
  hint: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
  },
  selectBoxDisabled: { backgroundColor: '#F1F5F9', borderColor: '#F1F5F9' },
  selectText: { fontSize: 15, color: '#0F172A', flex: 1, fontWeight: '500' },
  placeholderText: { color: '#94A3B8', fontWeight: '400' },
  retryText: { fontSize: 13, color: '#EF4444', fontWeight: '600', marginTop: 4 },
  lockedLocationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
  },
  lockedLocationText: { flex: 1, fontSize: 12, color: '#475569', fontFamily: typography.labelMedium.fontFamily },
  changeLocationText: { fontSize: 13, color: '#D94625', fontFamily: typography.labelMedium.fontFamily },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  pincodeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  pincodeInput: { flex: 1 },
  lookupBtn: { height: 52, minWidth: 70, borderRadius: 14, borderWidth: 1.5, borderColor: '#3298D4', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, backgroundColor: '#EAF4FB' },
  lookupBtnText: { color: '#3298D4', ...typography.labelMedium },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    minHeight: 120,
  },

  baseServiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  baseServiceCardSelected: { borderColor: '#D94625', backgroundColor: '#D9462510' },
  baseServiceName: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  baseServiceSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  baseServicePrice: { fontSize: 15, fontWeight: '600', color: '#D94625' },
  includedPill: { backgroundColor: '#D1FAE5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  includedPillText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: '#059669' },

  addonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  addonCardSelected: { borderColor: '#D94625', backgroundColor: '#D9462510' },
  addonCheckboxSquare: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  addonCheckboxSquareChecked: { backgroundColor: '#D94625', borderColor: '#D94625' },
  addonCardName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  addonCardSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  addonCardPrice: { fontSize: 15, fontWeight: '600', color: '#D94625' },

  paymentMethodLabel: { ...typography.labelMedium, color: colors.textPrimary, marginTop: 16, marginBottom: 10 },
  paymentMethodRow: { gap: 10 },
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFFFFF' },
  paymentOptionActive: { borderColor: '#D94625', backgroundColor: '#FEF6F3' },
  paymentOptionText: { fontSize: 14, fontFamily: typography.labelLarge.fontFamily, color: '#64748B' },
  paymentOptionTextActive: { color: '#1E293B' },
  paymentOptionDesc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  paymentRadio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  paymentRadioActive: { borderColor: '#D94625' },
  paymentRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D94625' },
  couponLabel: { ...typography.labelMedium, color: colors.textPrimary, marginTop: 12 },
  couponRow: { flexDirection: 'row', gap: 12 },
  couponInput: { flex: 1, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 24, paddingHorizontal: 16, height: 48, color: colors.textPrimary, ...typography.body },
  applyBtn: { borderWidth: 1.5, borderColor: colors.primary, borderRadius: 24, paddingHorizontal: 24, justifyContent: 'center', minWidth: 80, alignItems: 'center' },
  applyBtnText: { color: colors.primary, ...typography.labelMedium },
  viewCouponsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 4 },
  viewCouponsLink: { ...typography.body, color: colors.accent, fontFamily: typography.labelMedium.fontFamily },

  couponCodeText: { ...typography.labelMedium, color: colors.textPrimary },
  couponIneligibleText: { color: colors.textPlaceholder },
  couponDescText: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  couponReasonText: { ...typography.small, color: colors.error, marginTop: 4 },

  // Required-document upload field (web-style "Choose File | No file chosen").
  docLabel: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  docDesc: { fontSize: 13, color: '#64748B', marginTop: 2, marginBottom: 4 },
  docInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
  },
  docChooseBtn: {
    backgroundColor: '#EAF4FB',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  docChooseBtnText: { color: '#20304C', fontSize: 14, fontWeight: '600' },
  docFileName: { flex: 1, paddingHorizontal: 14, fontSize: 14, color: '#94A3B8' },

  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  chooseFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chooseFileBtnDisabled: { borderColor: colors.border },
  chooseFileText: { color: colors.primary, ...typography.labelMedium },
  noFileText: { ...typography.body, color: colors.textPlaceholder },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  filePillText: { flex: 1, ...typography.body, color: colors.textPrimary },
  submitBtn: {
    backgroundColor: '#D94625',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#D94625',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: '#CBD5E1', shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: '#D9462540',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 6,
  },
  cancelBtnText: { color: '#D94625', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 24,
  },
  modalTitle: { ...typography.sectionTitle, color: colors.textPrimary, padding: 24, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalOptionText: { ...typography.jobTitle, color: colors.textPrimary },
});

export default CreateTicket;
