import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList, StatusBar, Image } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { clearCart, clearServerCart, selectCartItems } from '../../Redux/slices/cartSlice';
import { setPendingTicketFinalize, setPendingSubscriptionFinalize } from '../../Redux/slices/pendingRequestsSlice';
import { onboardingUserKey } from '../../Redux/slices/onboardingSlice';
import { useCart } from '../../Hooks/useCart';
import { useServiceSubscription } from '../../Hooks/useServiceSubscription';
import { useProperties } from '../../Hooks/useProperties';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';
import { useTalukas } from '../../Hooks/useTalukas';
import { usePriorities } from '../../Hooks/usePriorities';
import { useTicketBooking } from '../../Hooks/useTicketBooking';
import { useBilling } from '../../Hooks/useBilling';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';
import CustomDateTimePicker from '../../Components/CustomDateTimePicker';
import PendingRecurringBundleModal from '../../Components/PendingRecurringBundleModal';
import { runRazorpayPayment } from '../../Utils/paymentGateway';
import { gatewayIcon, GATEWAY_META } from '../../Hooks/usePaymentGateways';
import { useCurrencyGateways } from '../../Hooks/useCurrencyGateways';
import CurrencyToggle from '../../Components/CurrencyToggle';
import { formatAmount } from '../../Utils/currency';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { saveServiceLocation } from '../../Redux/slices/serviceLocationSlice';
import { useToast } from '../../context/ToastContext';

const GST_RATE = 0.18;
// Matches the family member API's relationship enum (same as CreateTicket).
const RELATION_OPTIONS = ['Myself', 'Parent', 'Sibling', 'Spouse', 'Child', 'Other'];
const NO_PROPERTY = 'Not applicable';

const fmt = (v) => `$${(Number(v) || 0).toFixed(2)}`;

// Labelled select opening a centered searchable list.
function FormSelect({ label, required, value, placeholder, options, disabled, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.fieldLabel}>{label}{required ? ' *' : ''}</Text>
      <TouchableOpacity
        style={[styles.selectBox, disabled && styles.selectBoxDisabled]}
        disabled={disabled}
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
      >
        <Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>{value || placeholder}</Text>
        <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.selectOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.selectSheet}>
            <Text style={styles.selectSheetTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.selectOption} onPress={() => { onSelect(item); setOpen(false); }}>
                  <Text style={styles.selectOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color="#D94625" />}
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

function SummaryRow({ label, sub, value, strong }) {
  return (
    <View style={styles.sumRow}>
      <Text style={[styles.sumLabel, strong && styles.sumLabelStrong]}>
        {label}{!!sub && <Text style={styles.sumSub}> {sub}</Text>}
      </Text>
      <Text style={[styles.sumValue, strong && styles.sumValueStrong]}>{value}</Text>
    </View>
  );
}

// Authenticated cart checkout — a member's services go out as one service
// request (ticket) they pay for here. Distinct from the guest onboarding flow,
// which also activates membership.
function SubmitRequest({ navigation }) {
  const dispatch = useDispatch();
  const { showAlert, alertProps } = useAppAlert();
  const { showToast } = useToast();
  // Signed-in cart — removing a line also hits DELETE /customer/cart/items/{id}
  // and refreshes the server count (useCart fetches it on mount).
  const {
    remove: removeCartService, checkout: checkoutCart, checkoutPayFirst, checkoutLoading,
    coupons: cartCoupons, couponsLoading: cartCouponsLoading, fetchCoupons: fetchCartCoupons,
    appliedCoupon: appliedCartCoupon, couponApplyLoading: cartCouponApplyLoading,
    applyCoupon: applyCartCoupon, clearCoupon: clearCartCoupon,
  } = useCart();
  const items = useSelector(selectCartItems);
  const savedLocation = useSelector(s => s.serviceLocation);
  const user = useSelector(s => s.user.user);
  const userId = useSelector(s => onboardingUserKey(s.user.user));
  // Available gateways come from the backend (already NRI + admin-toggle gated).
  const { currency, setCurrency, gateways } = useCurrencyGateways();
  // Populates the Property dropdown below — same source AddProperty.js writes
  // to, so a property added there shows up here without a manual refresh
  // (both read the same Redux slice).
  const { properties } = useProperties();
  // Resolves the who-for-this fields into a family_member_id — needed by
  // POST /customer/tickets/quoted/{service} (see resolveFamilyMemberId below).
  const { members: familyMembers, create: createFamilyMember } = useFamilyMembers();

  const [reqForm, setReqForm] = useState({
    fullName: '', relation: '', property: NO_PROPERTY,
    state: items[0]?.stateName || savedLocation?.stateName || '',
    city: items[0]?.cityName || savedLocation?.cityName || '',
    taluka: '',
    address: '', pincode: items[0]?.pincode || savedLocation?.pincode || '', preferredAt: '', priority: '', notes: '',
  });
  const setField = (k, v) => setReqForm(p => ({ ...p, [k]: v }));
  const [pincodeLocation, setPincodeLocation] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  useEffect(() => {
    if (gateways.length && !gateways.some(g => g.value === paymentMethod)) {
      setPaymentMethod(gateways[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateways]);
  const [couponCode, setCouponCode] = useState('');
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [goServicesOnAlertClose, setGoServicesOnAlertClose] = useState(false);
  const [submissionInProgress, setSubmissionInProgress] = useState(false);
  const submissionLockRef = useRef(false);
  // Page 1: 'cart' (selected services + estimated price). Page 2: 'form' — the
  // two-step request form ('details' → 'payment').
  const [page, setPage] = useState('cart');
  const [step, setStep] = useState('details');
  // Preferred date/time picker (past dates disabled — today onward only).
  const [preferredDate, setPreferredDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const { stateNames, states } = useStates();
  const { cityNames, cities } = useCities(reqForm.state);
  const { talukaNames, talukas } = useTalukas(null, reqForm.city);
  const { priorities } = usePriorities();
  const { loading: pincodeLoading, lookup: lookupPincode } = usePostalCodeLookup();
  const {
    quote, quoteLoading, quoteFailed, quoteError, fetchQuote,
    bookQuotedTicket, bookQuotedLoading,
    reset,
  } = useTicketBooking();
  // Generic gateway-payment verification (shared with membership/billing
  // checkouts) — already extracts a pending_recurring_bundle when present.
  // `pay` is also reused here: confirmed live that POST /customer/cart/checkout
  // does NOT itself start a gateway session — it only creates the ticket(s)
  // (and validates the recurring/PayPal restriction) and returns
  // payment_required/ticket_id/amount_due, same shape the old pre-cart ticket
  // flow used. Actually starting Stripe/Razorpay is still the existing
  // POST /customer/billing/ticket/{id}/pay call.
  const { pay: payForTicket, payLoading, verifyPayment, verifyLoading } = useBilling();
  const { createLoading: subscribeLoading, createSubscription } = useServiceSubscription();
  // Live INR preview for a pure-recurring cart: POST /customer/service-subscriptions
  // is pay-first (creates a draft Payment) — there's no separate quote-only
  // endpoint for subscriptions like /customer/tickets/quote has for one-time
  // items — so this reuses the same live-quote-via-the-real-endpoint pattern
  // CustomPlanNew.js already uses: debounce a call, cache it by fingerprint,
  // and reuse that exact payment at actual submit instead of creating a
  // second one. Only fires when INR is selected — the USD total already
  // displays correctly from the local cart-item math with no extra call.
  const [recurringQuote, setRecurringQuote] = useState(null); // { fingerprint, ...createSubscription() result }
  const [recurringQuoteLoading, setRecurringQuoteLoading] = useState(false);
  const [recurringQuoteError, setRecurringQuoteError] = useState(null);
  const lastFetchedRecurringFingerprintRef = useRef(null);
  // A recurring cart service that wasn't (fully) paid for by this checkout —
  // either because the checkout itself is pure-recurring (payment_required:
  // false, nothing to pay via a ticket) or because it rode alongside a
  // one-time gateway payment as a leftover (see checkoutCart in cartApi.js).
  const [pendingBundle, setPendingBundle] = useState(null);

  // Clear any stale booking state (quote status etc.) left over from a
  // previous request so the Submit button never sticks behind an old spinner.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only one-time items ever become a ticket — a recurring item surfaces as
  // pending_recurring_bundle after checkout instead (see cartApi.checkoutCart)
  // and the ticket-quote endpoint below has no concept of billing_mode at all
  // (it always prices as one-time), so a recurring item must never be sent
  // through it. Its price is read straight off the cart, which is already
  // bound to recurring_price via useCartPriceSync.
  const oneTimeItems = items.filter(i => !i.isRecurring);
  const recurringItems = items.filter(i => i.isRecurring);
  // True only when this checkout will hit the dedicated quote-only endpoint
  // (POST /customer/tickets/quoted/{service}, see handleSubmit below) — a
  // cart holding EXACTLY one one-time quoted service and nothing else. A
  // quoted item no longer needs a fixed price at booking (a vendor/RM
  // proposes one after the request is submitted; the customer only pays once
  // that's approved — see TicketDetail.js's "Additional Payment Requested"
  // card), but that endpoint takes a single service, so this must stay
  // false — and payment UI must stay visible — the moment a quoted item is
  // mixed with a recurring item or another priced service; those still owe
  // real money and go through the normal paid checkout below.
  const isQuotedOnlyCart = items.length === 1 && items[0].isQuoted && !items[0].isRecurring;
  // A cart that's ENTIRELY recurring is its own pay-first flow (same
  // contract as CreateTicket's single-recurring-service subscribe: only
  // service_ids/gateway/state_id/city_id up front via POST
  // /service-subscriptions, who/where collected after payment on
  // FinishRequest). A MIXED cart (one-time + recurring together) still goes
  // through the old details→payment→checkoutCart flow below, unchanged —
  // that's the only shape actually created via checkoutCart's combined
  // ticket + pending_recurring_bundle response.
  const isPureRecurring = oneTimeItems.length === 0 && recurringItems.length > 0;
  // Pay-first (booking-details → payment → FinishRequest) applies to a cart
  // that's entirely one kind or the other — plain one-time, or plain recurring.
  // EXCEPT a quoted one-time item: pay-first only works because
  // checkoutPayFirst returns a paymentId that anchors the deferred
  // finalizeTicket() call on FinishRequest — but a quoted item has no price,
  // so the backend has nothing to create a Payment against and returns
  // payment_id: null. That leaves FinishRequest with no pending ticket to
  // finish (nothingPending), so the request silently never gets created.
  // Route it through the same details→submit flow as a mixed cart instead,
  // which creates the ticket directly from checkoutCart() — no paymentId
  // round-trip required.
  const payFirstEligible = (recurringItems.length === 0 || isPureRecurring) && !oneTimeItems.some(i => i.isQuoted);
  // GET /customer/cart now returns is_base_service/is_addon/category_id
  // inline on every line (backend fix) — classify straight off the cart item.
  // extra_services must all be is_base_service; addons must all be is_addon;
  // mixing them up 422s instead of silently mispricing/dropping the service.
  // service_id itself does NOT have to be a base service — confirmed in the
  // updated /customer/tickets/quote spec: an addon-only selection is valid,
  // the first one just becomes the technical primary (same as web's cart
  // checkout) — so no catalog lookup is needed to find an "implied" base for
  // a category added via addons alone.
  const oneTimeBaseItems = oneTimeItems.filter(i => i.isBaseService);
  const oneTimeAddonItems = oneTimeItems.filter(i => i.isAddon);
  const quoteServiceId = oneTimeBaseItems.length > 0 ? oneTimeBaseItems[0].serviceId : (oneTimeAddonItems[0]?.serviceId ?? null);
  const quoteExtraServiceIds = oneTimeBaseItems.length > 0 ? oneTimeBaseItems.slice(1).map(i => i.serviceId) : [];
  const quoteAddonIds = oneTimeBaseItems.length > 0
    ? oneTimeAddonItems.map(i => i.serviceId)
    : oneTimeAddonItems.slice(1).map(i => i.serviceId);
  // price is already GST-inclusive (price = base + gstAmount); each line
  // below shows its own base, with GST/total aggregated across all of them,
  // matching the one-time estimate's amount/GST/total breakdown above.
  const recurringGstTotal = recurringItems.reduce((sum, i) => sum + Number(i.gstAmount || 0), 0);
  const recurringSubtotal = recurringItems.reduce((sum, i) => sum + (Number(i.price) || 0), 0);
  const recurringInterval = recurringItems.find(i => i.billingInterval)?.billingInterval || 'monthly';

  const priorityLabelOf = (p) => `${p.name} — ${Number(p.surcharge) > 0 ? fmt(p.surcharge) : 'Free'}`;
  const priorityLabels = priorities.map(priorityLabelOf);
  const selectedPriority = priorities.find(p => priorityLabelOf(p) === reqForm.priority) || null;
  const prioritySurcharge = Number(selectedPriority?.surcharge || 0);

  const oneTimeServiceIdsKey = oneTimeItems.map(i => i.serviceId).join(',');

  useEffect(() => {
    if (!reqForm.priority && priorities.length) {
      const def = priorities.find(p => p.isDefault) || priorities[0];
      if (def) setField('priority', priorityLabelOf(def));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorities]);

  useEffect(() => {
    const stateName = items[0]?.stateName || savedLocation?.stateName || '';
    const cityName = items[0]?.cityName || savedLocation?.cityName || '';
    const pincode = items[0]?.pincode || savedLocation?.pincode || '';
    setReqForm(prev => ({
      ...prev,
      state: prev.state || stateName,
      city: prev.city || cityName,
      pincode: prev.pincode || pincode,
    }));
  }, [items, savedLocation?.stateName, savedLocation?.cityName, savedLocation?.pincode]);

  useEffect(() => {
    const code = reqForm.pincode.trim();
    if (code.length !== 6) {
      setPincodeLocation(null);
      return;
    }

    lookupPincode(code)
      .unwrap()
      .then((result) => {
        const match = result?.results?.[0];
        if (!match) {
          setPincodeLocation(null);
          return;
        }
        const stateName = match.stateName || states.find(s => s.id === match.stateId)?.name || '';
        setPincodeLocation({
          code,
          stateName,
          cityName: match.cityName || '',
          cityId: match.cityId || null,
          talukaName: match.talukaName || '',
        });
        if (stateName) setField('state', stateName);
        if (match.cityName) setField('city', match.cityName);
        if (match.talukaName) setField('taluka', match.talukaName);
        if (stateName && match.cityName && match.cityId) {
          dispatch(saveServiceLocation({
            stateName,
            cityName: match.cityName,
            cityId: match.cityId,
            pincode: code,
          }));
        }
      })
      .catch(() => setPincodeLocation(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reqForm.pincode]);

  const loading = submissionInProgress || checkoutLoading || payLoading || verifyLoading || subscribeLoading || bookQuotedLoading;

  // Authoritative pricing from the ticket quote API (same source the cards /
  // backend use) — keeps the estimated amount, GST and total in sync with the
  // server instead of computing them locally. One-time items only (see the
  // oneTimeItems/recurringItems split above) — a recurring item never runs
  // through this endpoint.
  const quoteStateId = states.find(s => s.name === reqForm.state)?.id || null;
  const quoteCityId = cities.find(c => c.name === reqForm.city)?.id || pincodeLocation?.cityId || items[0]?.cityId || savedLocation?.cityId || null;
  const quoteUrgency = selectedPriority?.slug || 'standard';
  const quoteKey = `${oneTimeServiceIdsKey}|${quoteServiceId}|${quoteExtraServiceIds.join(',')}|${quoteAddonIds.join(',')}|${quoteStateId}|${quoteCityId}|${quoteUrgency}|${couponCode.trim()}`;
  useEffect(() => {
    if (quoteServiceId == null || !quoteStateId || !quoteCityId) return;
    fetchQuote({
      serviceId: quoteServiceId,
      extraServices: quoteExtraServiceIds,
      addons: quoteAddonIds,
      stateId: quoteStateId,
      cityId: quoteCityId,
      urgency: quoteUrgency,
      couponCode: couponCode.trim() || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  // Live INR preview for a pure-recurring cart (see recurringQuote state
  // above) — identifies which exact inputs a fetched quote belongs to, so a
  // stale one (fields edited after fetching) is never reused/charged against.
  const recurringFingerprint = `${recurringItems.map(i => i.serviceId).join(',')}|${paymentMethod}|${currency}|${quoteStateId}|${quoteCityId}|${reqForm.pincode.trim()}`;
  const fetchRecurringQuote = async (fingerprint) => {
    setRecurringQuoteLoading(true);
    setRecurringQuoteError(null);
    try {
      const result = await createSubscription({
        serviceIds: recurringItems.map(i => i.serviceId),
        gateway: paymentMethod,
        currency,
        stateId: quoteStateId,
        cityId: quoteCityId,
        pincode: reqForm.pincode.trim(),
      }).unwrap();
      lastFetchedRecurringFingerprintRef.current = fingerprint;
      setRecurringQuote({ fingerprint, ...result });
    } catch (error) {
      setRecurringQuoteError(error?.message || "Couldn't calculate the ₹ amount for this subscription.");
    } finally {
      setRecurringQuoteLoading(false);
    }
  };
  useEffect(() => {
    if (!isPureRecurring || currency !== 'INR' || recurringItems.length === 0 || !paymentMethod || !quoteStateId || !quoteCityId) return;
    if (lastFetchedRecurringFingerprintRef.current === recurringFingerprint) return;
    const timer = setTimeout(() => fetchRecurringQuote(recurringFingerprint), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPureRecurring, currency, recurringFingerprint]);

  // amount_inr is a single bundle total (no per-item/GST split from the
  // backend) — derive a GST-inclusive base/GST split at the standard 18% rate
  // (same convention as the USD estimate above), then divide the base across
  // items proportional to their USD price so multi-service subscriptions
  // still show a line each, summing back to the real converted total.
  const recurringQuoteReady = currency === 'INR' && recurringQuote?.fingerprint === recurringFingerprint && recurringQuote?.amountInr != null;
  const recurringAmountInr = recurringQuoteReady ? Number(recurringQuote.amountInr) : null;
  const recurringBaseInr = recurringAmountInr != null ? Math.round((recurringAmountInr / (1 + GST_RATE)) * 100) / 100 : null;
  const recurringGstInr = recurringAmountInr != null ? Math.round((recurringAmountInr - recurringBaseInr) * 100) / 100 : null;
  const recurringItemAmountInr = (item) => {
    if (recurringBaseInr == null || recurringSubtotal <= 0) return null;
    const itemBaseUsd = Number(item.base != null ? item.base : item.price) || 0;
    const usdBaseTotal = recurringItems.reduce((sum, i) => sum + (Number(i.base != null ? i.base : i.price) || 0), 0);
    if (usdBaseTotal <= 0) return null;
    return Math.round((recurringBaseInr * (itemBaseUsd / usdBaseTotal)) * 100) / 100;
  };

  // The quote API returns the address-specific pre-GST service amount,
  // GST amount, and GST-inclusive total. Use it directly when available; fall
  // back to splitting the one-time cart items' GST-inclusive total while the
  // quote loads. A pure-recurring cart (no one-time items) has nothing to
  // quote/charge as a ticket at all — everything below is 0, and the
  // recurring total is shown separately (see recurringSubtotal above).
  const hasQuoteTotal = Number(quote?.totalAmount || 0) > 0;
  const selectedServicesTotal = oneTimeItems.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
  const cartBaseTotal = oneTimeItems.reduce((sum, item) => sum + Number(item.base || 0), 0);
  const cartGstTotal = oneTimeItems.reduce((sum, item) => sum + Number(item.gstAmount || 0), 0);
  const estSurcharge = oneTimeItems.length === 0 ? 0 : (quote?.expressSurcharge != null ? Number(quote.expressSurcharge) : prioritySurcharge);
  const estDiscount = oneTimeItems.length === 0 ? 0 : Number(quote?.discount || 0);
  const fallbackTotal = Math.max(0, Math.round((selectedServicesTotal + estSurcharge - estDiscount) * 100) / 100);
  // customer_price/gst_amount can arrive even when total_amount doesn't (seen
  // live on a combined base+extra_services+addons quote) — resolve amount/GST
  // from the quote fields first, then derive the total from THOSE rather than
  // re-deriving from the stale per-line cart price, which no longer reflects
  // the address-specific vendor pricing the quote just returned.
  const estAmount = oneTimeItems.length === 0 ? 0 : (quote?.customerPrice != null
    ? Number(quote.customerPrice)
    : (cartBaseTotal > 0 ? cartBaseTotal : Math.round((fallbackTotal / (1 + GST_RATE)) * 100) / 100));
  const estGst = oneTimeItems.length === 0 ? 0 : (quote?.gstAmount != null
    ? Number(quote.gstAmount)
    : (cartGstTotal > 0 ? cartGstTotal : Math.max(0, Math.round((fallbackTotal - estAmount) * 100) / 100)));
  const estTotal = oneTimeItems.length === 0 ? 0 : (hasQuoteTotal
    ? Number(quote.totalAmount)
    : Math.max(0, Math.round((estAmount + estSurcharge - estDiscount + estGst) * 100) / 100));
  // /customer/tickets/quote always returns gst_amount_inr/total_amount_inr
  // alongside the USD figures (unlike the payment endpoints, this quote is
  // read-only so there's no currency to request) — use them directly when
  // INR is selected instead of the USD math above.
  const estQuoteReadyInr = oneTimeItems.length > 0 && currency === 'INR' && quote?.totalAmountInr != null;
  const estTotalInr = estQuoteReadyInr ? Number(quote.totalAmountInr) : null;
  const estGstInr = estQuoteReadyInr && quote?.gstAmountInr != null ? Number(quote.gstAmountInr) : null;
  const estAmountInr = estTotalInr != null && estGstInr != null ? Math.round((estTotalInr - estGstInr) * 100) / 100 : null;
  // A failed quote (e.g. a category's base service has no vendor coverage in
  // the selected city) must block Submit rather than fall back to a
  // locally-computed total, since /cart/checkout enforces the same rule
  // server-side anyway. Trust the LIVE quote result only — confirmed live
  // that a cart item's category_base_bookable: false does NOT reliably
  // predict quote failure: it reflects whether the category's true base
  // service (e.g. id 282) has vendor coverage, which is irrelevant once an
  // addon-only selection uses a different service as the technical primary
  // (per the /customer/tickets/quote spec) — that request can still 200 even
  // though category_base_bookable is false on every item in it.
  // A quoted item has no fixed price to quote in the first place — the ticket
  // quote call failing/being irrelevant for it isn't a real booking blocker,
  // unlike a genuine no-vendor-in-city failure on a normally-priced item.
  const quoteBlocking = !isQuotedOnlyCart && oneTimeItems.length > 0 && quoteFailed;
  const quoteErrorMessage = quoteError?.message || 'One or more selected services aren\'t available for your selected city. Please review your cart.';

  const formattedPreferred = preferredDate
    ? preferredDate.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  // POST /customer/tickets/quoted/{service} needs an existing family_member_id
  // (unlike checkoutCart, which still takes raw name/relationship) — reuse a
  // matching saved member if one exists, else create one on the fly. Same
  // pattern as FinishRequest.js's resolveFamilyMemberId.
  const resolveFamilyMemberId = async () => {
    const name = reqForm.fullName.trim();
    const relationship = reqForm.relation.toLowerCase();
    const existing = familyMembers.find(
      m => m.name.trim().toLowerCase() === name.toLowerCase() && m.relationship === relationship
    );
    if (existing) return existing.id;
    const created = await createFamilyMember({ name, relationship }).unwrap();
    return created.id;
  };

  const finishSuccess = async () => {
    if (items.length) {
      try {
        await dispatch(clearServerCart(items)).unwrap();
      } catch (e) {
        // The request/payment succeeded; still clear local persisted cart so the
        // checkout doesn't show completed services in this session.
      }
    }
    dispatch(clearCart());
    setGoServicesOnAlertClose(true);
    showAlert('Request Submitted', 'Your service request has been submitted. Track its progress under Requests.', [
      {
        text: 'Track my Request',
        onPress: () => {
          setGoServicesOnAlertClose(false);
          // Cart lives in the Services tab stack. Open the Requests tab to track,
          // then reset the Services stack back to its list root so leaving the
          // tracking screen doesn't drop the user back on this now-empty cart.
          navigation.navigate('Requests');
          navigation.popToTop();
        },
      },
    ]);
  };

  const handleAlertRequestClose = () => {
    alertProps.onRequestClose?.();
    if (goServicesOnAlertClose) {
      setGoServicesOnAlertClose(false);
      navigation.navigate('Services', { screen: 'ServicesMain' });
    }
  };

  // Validate the Who/Where fields (step 1). Returns false and shows a popup
  // listing anything missing.
  const validateDetails = () => {
    const missing = [];
    if (!reqForm.fullName.trim()) missing.push('Full Name');
    if (!reqForm.relation) missing.push('Relation');
    if (!reqForm.state) missing.push('State');
    if (!reqForm.city) missing.push('City / District');
    if (!reqForm.address.trim()) missing.push('Full Address');
    if (!reqForm.pincode.trim()) missing.push('PIN Code');
    if (!reqForm.priority) missing.push('Priority');
    if (missing.length) {
      showAlert('Missing Details', `Please fill: ${missing.join(', ')}.`);
      return false;
    }
    return true;
  };

  // A quoted item has nothing to pay for, so there's no separate payment step
  // to continue to — validate here and submit the request directly instead
  // of advancing to step 'payment'.
  const handleContinue = () => {
    if (!validateDetails()) return;
    if (isQuotedOnlyCart) { handleSubmit(); return; }
    setStep('payment');
  };

  // Pay-first path (payFirstEligible only): validates just the booking-details
  // fields, prices/pays the cart, then hands off to FinishRequest — nothing is
  // created server-side until that screen's finalize call succeeds. Both a
  // pure one-time cart and a pure recurring cart need state/city/pincode;
  // priority is a ticket-quote-only input.
  const validateBookingDetails = () => {
    const missing = [];
    if (!reqForm.state) missing.push('State');
    if (!reqForm.city) missing.push('City / District');
    if (!reqForm.pincode.trim()) missing.push('PIN Code');
    if (!isPureRecurring && !reqForm.priority) missing.push('Priority');
    if (missing.length) {
      showAlert('Missing Details', `Please fill: ${missing.join(', ')}.`);
      return false;
    }
    return true;
  };

  const handlePayFirst = async () => {
    if (loading || submissionLockRef.current) return;
    if (!validateBookingDetails()) return;
    if (!isPureRecurring && quoteBlocking) { showAlert('Not Available', quoteErrorMessage); return; }

    submissionLockRef.current = true;
    setSubmissionInProgress(true);
    try {
      const stateId = states.find(s => s.name === reqForm.state)?.id;
      const cityId = cities.find(c => c.name === reqForm.city)?.id || pincodeLocation?.cityId || items[0]?.cityId || savedLocation?.cityId || null;

      if (isPureRecurring) {
        // Same contract as CreateTicket's subscribe: only service_ids/gateway/
        // state_id/city_id up front via POST /service-subscriptions — who this
        // is for, the address, and any required documents are collected after
        // payment on FinishRequest (mode: 'subscription'). Reuse the live ₹
        // preview quote (see recurringQuote above) if it matches exactly
        // what's on screen right now — avoids creating a second draft
        // payment for the same subscription.
        const result = (recurringQuote && recurringQuote.fingerprint === recurringFingerprint)
          ? recurringQuote
          : await createSubscription({
              serviceIds: recurringItems.map(i => i.serviceId),
              gateway: paymentMethod,
              currency,
              stateId,
              cityId,
              pincode: reqForm.pincode.trim(),
            }).unwrap();

        if (result.paymentId) {
          dispatch(setPendingSubscriptionFinalize({
            userId,
            paymentId: result.paymentId,
            serviceIds: recurringItems.map(i => i.serviceId),
            serviceNames: recurringItems.map(i => i.name),
            stateId, cityId,
            stateName: reqForm.state, cityName: reqForm.city,
            amount: currency === 'INR' && result.amountInr != null ? result.amountInr : result.amount,
            currency: currency === 'INR' && result.amountInr != null ? 'INR' : result.currency,
            origin: 'cart',
          }));
        }

        if (result.checkoutUrl) {
          setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId, payFirst: true, kind: 'subscription' });
          submissionLockRef.current = false;
          setSubmissionInProgress(false);
          return;
        }
        if (result.order) {
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
        submissionLockRef.current = false;
        setSubmissionInProgress(false);
        return;
      }

      const result = await checkoutPayFirst({
        gateway: paymentMethod,
        currency,
        couponCode: couponCode.trim() || undefined,
        stateId,
        cityId,
        pincode: reqForm.pincode.trim(),
        urgency: selectedPriority?.slug || 'standard',
      }).unwrap();

      if (result.paymentId) {
        dispatch(setPendingTicketFinalize({
          userId,
          paymentId: result.paymentId,
          serviceIds: oneTimeItems.map(i => i.serviceId),
          serviceNames: oneTimeItems.map(i => i.name),
          stateId, cityId,
          stateName: reqForm.state, cityName: reqForm.city,
          amount: result.amount, currency: result.currency,
          origin: 'cart',
        }));
      }

      if (result.requiresPayment && result.checkoutUrl) {
        // Stripe — open the hosted checkout page; handleCheckoutSuccess routes
        // to FinishRequest once it redirects back with a session_id.
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId, payFirst: true });
        submissionLockRef.current = false;
        setSubmissionInProgress(false);
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
      // Either nothing was owed (requires_payment: false, e.g. wallet/free) or
      // the Razorpay payment above just cleared — either way, finish the
      // request on FinishRequest (it reads the pending state we just set).
      navigation.navigate('FinishRequest', { mode: 'ticket', paymentId: result.paymentId });
      submissionLockRef.current = false;
      setSubmissionInProgress(false);
    } catch (error) {
      const fieldErrors = error?.errors
        ? Object.entries(error.errors).flatMap(([, v]) => v).join('\n')
        : '';
      const msg = [error?.message, fieldErrors].filter(Boolean).join('\n\n')
        || (isPureRecurring ? 'Could not start your subscription. Please try again.' : 'Could not start payment. Please try again.');
      showAlert(isPureRecurring ? 'Subscription Failed' : 'Payment Failed', msg);
      submissionLockRef.current = false;
      setSubmissionInProgress(false);
    }
  };

  // A recurring cart item that's still unpaid after checkout (either the
  // whole cart was pure-recurring — nothing to pay via a ticket — or it rode
  // alongside a one-time gateway payment as a leftover) surfaces its own
  // "Complete Payment" prompt instead of the plain success alert; either way
  // it also resurfaces later via the Dashboard's pending_recurring_bundles.
  const handlePostCheckout = async (bundle) => {
    if (bundle) {
      setPendingBundle(bundle);
      submissionLockRef.current = false;
      setSubmissionInProgress(false);
    } else {
      await finishSuccess();
    }
  };

  const handleSubmit = async () => {
    if (loading || submissionLockRef.current) return;
    if (!validateDetails()) { setStep('details'); return; }
    if (quoteBlocking) { showAlert('Not Available', quoteErrorMessage); return; }

    submissionLockRef.current = true;
    setSubmissionInProgress(true);
    try {
      const stateId = states.find(s => s.name === reqForm.state)?.id;
      const cityId = cities.find(c => c.name === reqForm.city)?.id || pincodeLocation?.cityId || items[0]?.cityId || savedLocation?.cityId || null;
      const talukaId = talukas.find(t => t.name === reqForm.taluka)?.id || null;

      // A cart holding exactly one quoted service skips price/checkout
      // entirely — POST /customer/tickets/quoted/{service} creates the
      // ticket in a single step, no payment yet. A vendor proposes a price
      // after review; the customer pays it later the normal way, once
      // approved (see TicketDetail.js's "Additional Payment Requested" card).
      if (items.length === 1 && items[0].isQuoted) {
        const propertyId = properties.find(p => p.nickname === reqForm.property)?.id || null;
        const familyMemberId = await resolveFamilyMemberId();
        await bookQuotedTicket({
          serviceId: items[0].serviceId,
          stateId, cityId, talukaId, propertyId, familyMemberId,
          address: reqForm.address.trim(),
          pincode: reqForm.pincode.trim(),
          urgency: selectedPriority?.slug || 'standard',
          preferredDate: preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined,
          customerNotes: reqForm.notes || undefined,
        }).unwrap();
        await finishSuccess();
        return;
      }

      const result = await checkoutCart({
        gateway: paymentMethod,
        currency,
        couponCode: couponCode.trim() || undefined,
        familyMemberName: reqForm.fullName.trim() || undefined,
        familyMemberRelationship: reqForm.relation.trim().toLowerCase() || undefined,
        stateId, cityId, talukaId,
        address: reqForm.address.trim(),
        pincode: reqForm.pincode.trim(),
        urgency: selectedPriority?.slug || 'standard',
        preferredDate: preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined,
        customerNotes: reqForm.notes || undefined,
      }).unwrap();

      if (result.paymentRequired && result.ticketId) {
        // /cart/checkout only creates the ticket(s) and validates the
        // recurring/PayPal restriction — confirmed live it does NOT start a
        // gateway session itself (no checkout_url/order on its response).
        // Pay the created ticket the same way the pre-cart flow always did.
        const pay = await payForTicket('ticket', result.ticketId, paymentMethod, false, currency).unwrap();
        if (pay.checkoutUrl) {
          // Stripe — open the hosted checkout page; confirmed in
          // handleCheckoutSuccess once it redirects back with a session_id.
          // Carry the pending bundle (if any) through to that point.
          setCheckoutSession({ url: pay.checkoutUrl, paymentId: pay.paymentId, pendingBundle: result.pendingRecurringBundle });
          submissionLockRef.current = false;
          setSubmissionInProgress(false);
        } else if (pay.order) {
          // Razorpay — no hosted page; drive the native SDK then verify inline.
          await runRazorpayPayment({
            order: pay.order,
            paymentId: pay.paymentId,
            name: 'NRI Circle',
            description: 'Service request',
            user,
            verify: (params) => verifyPayment(params).unwrap(),
          });
          await handlePostCheckout(result.pendingRecurringBundle);
        } else {
          // Wallet covered it via the ticket-pay call itself.
          await handlePostCheckout(result.pendingRecurringBundle);
        }
      } else {
        // Nothing to pay via a gateway — either wallet covered a one-time
        // ticket during checkout itself, or the cart was pure-recurring
        // (payment_required: false, tickets: []) and the only thing left is
        // the pending bundle prompt.
        await handlePostCheckout(result.pendingRecurringBundle);
      }
    } catch (error) {
      // Surface the backend's exact reason (401 unauthenticated, 422 validation
      // / booking-rule / no-vendor-in-city / PayPal-rejects-recurring, etc.)
      // so failures are diagnosable. `errors.missing_base_service` (when a
      // service_id/extra_services entry was addon-typed) is a structured
      // object, not a string array — skip it here since error.message already
      // states the fix in human-readable form; join would otherwise render it
      // as "[object Object]".
      const fieldErrors = error?.errors
        ? Object.entries(error.errors)
          .filter(([key]) => key !== 'missing_base_service')
          .flatMap(([, v]) => v)
          .join('\n')
        : '';
      const msg = [error?.message, fieldErrors].filter(Boolean).join('\n\n')
        || 'Could not submit your request. Please try again.';
      showAlert('Submission Failed', msg);
      submissionLockRef.current = false;
      setSubmissionInProgress(false);
    }
  };

  const handleCheckoutSuccess = async (sessionId) => {
    const session = checkoutSession;
    setCheckoutSession(null);
    submissionLockRef.current = true;
    setSubmissionInProgress(true);
    try {
      if (session?.paymentId) await verifyPayment({ paymentId: session.paymentId, sessionId }).unwrap();
      if (session?.payFirst) {
        navigation.navigate('FinishRequest', {
          mode: session?.kind === 'subscription' ? 'subscription' : 'ticket',
          paymentId: session.paymentId,
        });
        submissionLockRef.current = false;
        setSubmissionInProgress(false);
        return;
      }
      await handlePostCheckout(session?.pendingBundle);
    } catch (error) {
      showAlert('Verification Failed', error?.message || 'Could not verify the payment yet. If charged, check Requests shortly.');
      submissionLockRef.current = false;
      setSubmissionInProgress(false);
    }
  };

  // Explicit validate-before-checkout feedback (POST /customer/cart/validate-coupon)
  // — the typed code is also already fed into fetchQuote above so the discount
  // shown in the estimate/order summary updates either way; this just confirms
  // the code is valid and tells the customer the savings up front.
  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    applyCartCoupon({ code: couponCode.trim(), cityId: quoteCityId })
      .unwrap()
      .then((result) => {
        showAlert('Coupon Applied', `Code ${result.code} applied — you save ${fmt(result.discount)}.`);
      })
      .catch((error) => {
        showAlert('Invalid Coupon', error?.message || 'This coupon could not be applied.');
      });
  };

  const handleRemoveCoupon = () => {
    clearCartCoupon();
    setCouponCode('');
  };

  // Editing the code after a successful apply invalidates the applied result —
  // clear it so the Apply/Remove button reflects the field again rather than
  // still offering to "Remove" a code that's no longer what's typed.
  const handleCouponTextChange = (text) => {
    if (appliedCartCoupon) clearCartCoupon();
    setCouponCode(text);
  };

  const handleViewCoupons = () => {
    setShowCouponsModal(true);
    fetchCartCoupons({ cityId: quoteCityId });
  };

  const handlePickCoupon = (coupon) => {
    if (!coupon.eligible) return;
    setCouponCode(coupon.code);
    setShowCouponsModal(false);
    applyCartCoupon({ code: coupon.code, cityId: quoteCityId })
      .unwrap()
      .then((result) => {
        showAlert('Coupon Applied', `Code ${result.code} applied — you save ${fmt(result.discount)}.`);
      })
      .catch((error) => {
        showAlert('Invalid Coupon', error?.message || 'This coupon could not be applied.');
      });
  };

  const empty = items.length === 0;
  const handleClearCart = () => {
    // Optimistic: clear the local cart immediately so the UI responds instantly;
    // the server delete syncs in the background (like the per-item remove).
    if (items.length) dispatch(clearServerCart(items));
    dispatch(clearCart());
    showToast('Cart cleared', 'success');
  };
  const confirmClearCart = () => {
    showAlert('Clear Cart', 'Remove all services from your cart?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: handleClearCart },
    ]);
  };
  const confirmRemoveItem = (item) => {
    showAlert('Remove Service', `Remove "${item.name}" from your cart?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => { removeCartService(item.serviceId); showToast('Service removed from cart', 'success'); },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBack} onPress={() => (page === 'form' ? setPage('cart') : navigation.goBack())}>
            <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.headerBackIcon} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{page === 'cart' ? 'My Cart' : 'Submit Request'}</Text>
            <Text style={styles.headerSub}>{items.length} service{items.length === 1 ? '' : 's'} selected</Text>
          </View>
          {!empty && (
            <TouchableOpacity style={styles.clearBtn} onPress={confirmClearCart}>
              <Icon name="delete-outline" size={16} color="#FFFFFF" />
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {empty ? (
        <View style={styles.emptyWrap}>
          <Icon name="shopping-cart" size={54} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No services selected</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.primaryBtnText}>Back to Services</Text>
          </TouchableOpacity>
        </View>
      ) : page === 'cart' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Page 1 — selected services + estimated price */}
          <Text style={styles.sectionLabel}>SELECTED SERVICES</Text>
          {items.map((it) => (
            <View key={it.serviceId} style={styles.itemCard}>
              <View style={styles.itemIcon}>
                {it.imageUrl ? (
                  <Image source={{ uri: it.imageUrl }} style={styles.itemIconImage} resizeMode="cover" />
                ) : (
                  <Icon name="description" size={20} color="#20304C" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                <View style={styles.itemMetaRow}>
                  <View style={styles.itemBadge}><Text style={styles.itemBadgeText}>{(it.categoryName || '').toUpperCase()}</Text></View>
                  {!!it.isRecurring && (
                    <View style={styles.recurringBadge}>
                      <Icon name="autorenew" size={11} color="#B45309" />
                      <Text style={styles.recurringBadgeText}>RECURRING</Text>
                    </View>
                  )}
                  {!!it.durationLabel && (
                    <View style={styles.itemDuration}>
                      <Icon name="schedule" size={12} color="#94A3B8" />
                      <Text style={styles.itemDurationText}>{it.durationLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <TouchableOpacity onPress={() => confirmRemoveItem(it)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="delete-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Estimated price — one-time items from the quote API; recurring
              items shown as their own subscription breakdown, never blended
              into the one-time estimate/total above (they're billed
              separately, right after submitting). */}
          <View style={styles.card}>
            <View style={styles.cardHeadRow}>
              <Text style={styles.cardTitle}>Estimated Price for Your Address</Text>
              {quoteLoading && <ActivityIndicator size="small" color="#D94625" />}
            </View>
            {isQuotedOnlyCart ? (
              <View style={styles.quoteOnlyBanner}>
                <Icon name="info-outline" size={18} color="#92400E" />
                <Text style={styles.quoteOnlyBannerText}>
                  One or more services in your cart don't have a fixed price — a vendor will propose one after you submit the request, and you'll only pay once it's confirmed.
                </Text>
              </View>
            ) : oneTimeItems.length > 0 ? (
              <>
                {/* category_base_bookable: false degrades pricing_basis to
                    "nationwide" (a reference estimate), it doesn't mean no
                    price at all — web still shows one here, so mobile must
                    too. The warning below explains why it's not final /
                    can't be booked yet; it doesn't replace the estimate. */}
                {quoteBlocking && (
                  <View style={styles.quoteErrorBox}>
                    <Icon name="error-outline" size={16} color="#B91C1C" />
                    <Text style={styles.quoteErrorText}>{quoteErrorMessage}</Text>
                  </View>
                )}
                {currency === 'INR' && !estQuoteReadyInr ? (
                  <SummaryRow
                    label={quoteError || 'Calculating ₹ amount…'}
                    value={quoteLoading ? <ActivityIndicator size="small" color="#D94625" /> : ''}
                  />
                ) : (
                  <>
                    <SummaryRow label="Estimated amount" value={currency === 'INR' ? formatAmount(estAmountInr, 'INR') : fmt(estAmount)} />
                    {currency !== 'INR' && estSurcharge > 0 && <SummaryRow label="Express surcharge" value={`+${fmt(estSurcharge)}`} />}
                    {currency !== 'INR' && estDiscount > 0 && <SummaryRow label="Discount" value={`-${fmt(estDiscount)}`} />}
                    <SummaryRow label="GST" sub="(18%)" value={currency === 'INR' ? formatAmount(estGstInr, 'INR') : fmt(estGst)} />
                    <View style={styles.divider} />
                    <SummaryRow label="Estimated Total" value={currency === 'INR' ? formatAmount(estTotalInr, 'INR') : fmt(estTotal)} strong />
                  </>
                )}
                <Text style={styles.disclaimer}>Final amount is set by the verified vendor covering your exact address.</Text>
              </>
            ) : (
              <Text style={styles.disclaimer}>No one-time services in your cart.</Text>
            )}

            {recurringItems.length > 0 && (
              <>
                <View style={styles.divider} />
                <View style={styles.recurringChip}>
                  <Icon name="autorenew" size={13} color="#B45309" />
                  <Text style={styles.recurringChipText}>Recurring Subscription ({recurringItems.length})</Text>
                </View>
                {currency === 'INR' && !recurringQuoteReady ? (
                  <SummaryRow
                    label={recurringQuoteError || 'Calculating ₹ amount…'}
                    value={recurringQuoteLoading ? <ActivityIndicator size="small" color="#D94625" /> : ''}
                  />
                ) : (
                  <>
                    {recurringItems.map((it) => (
                      <SummaryRow
                        key={it.serviceId}
                        label={it.name}
                        value={currency === 'INR' ? formatAmount(recurringItemAmountInr(it), 'INR') : fmt(it.base != null ? it.base : it.price)}
                      />
                    ))}
                    <SummaryRow label="Subscription GST" value={currency === 'INR' ? formatAmount(recurringGstInr, 'INR') : fmt(recurringGstTotal)} />
                    <SummaryRow
                      label={`Subscription Total (billed ${recurringInterval})`}
                      value={currency === 'INR' ? formatAmount(recurringAmountInr, 'INR') : fmt(recurringSubtotal)}
                      strong
                    />
                  </>
                )}
              </>
            )}
          </View>

          <TouchableOpacity style={styles.continueBtn} activeOpacity={0.9} onPress={() => { setStep('details'); setPage('form'); }}>
            <Text style={styles.continueBtnText}>Continue</Text>
            <Icon name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {payFirstEligible ? (
          <>
          {/* Pay-first: booking details + payment in one step (booking-details.png).
              Who/where + documents are collected AFTER payment, on FinishRequest. */}
          <View style={styles.card}>
            <View style={styles.cardHeadRow}><Icon name="place" size={16} color="#20304C" /><Text style={styles.cardTitle}>Where</Text></View>

            <FormSelect label="State" required value={reqForm.state} placeholder="Select state" options={stateNames} onSelect={v => { setField('state', v); setField('city', ''); setField('taluka', ''); }} />
            <FormSelect label="City / District" required value={reqForm.city} placeholder={reqForm.state ? 'Select city' : 'Select state first'} options={cityNames} disabled={!reqForm.state} onSelect={v => { setField('city', v); setField('taluka', ''); }} />

            <Text style={styles.fieldLabel}>PIN Code *</Text>
            <View style={styles.pincodeRow}>
              <TextInput
                style={[styles.input, styles.pincodeInput]}
                placeholder="e.g. 416002"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={reqForm.pincode}
                onChangeText={t => setField('pincode', t.replace(/[^0-9]/g, ''))}
              />
              {pincodeLoading && <ActivityIndicator size="small" color="#D94625" />}
            </View>
            {!!pincodeLocation?.cityName && (
              <Text style={styles.pincodeHint}>
                {pincodeLocation.cityName}{pincodeLocation.stateName ? `, ${pincodeLocation.stateName}` : ''}
              </Text>
            )}

            {!isPureRecurring && (
              <FormSelect label="Priority" required value={reqForm.priority} placeholder="Standard — Free" options={priorityLabels} onSelect={v => setField('priority', v)} />
            )}
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeadRow}><Icon name="receipt-long" size={16} color="#20304C" /><Text style={styles.cardTitle}>{isQuotedOnlyCart ? 'Request Summary' : 'Payment'}</Text></View>

            {isQuotedOnlyCart ? (
              <View style={styles.quoteOnlyBanner}>
                <Icon name="info-outline" size={18} color="#92400E" />
                <Text style={styles.quoteOnlyBannerText}>
                  One or more services in your cart don't have a fixed price. Submit your request — a vendor will propose a price, and you'll only be asked to pay once it's confirmed.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Have a coupon?</Text>
                <View style={styles.couponRow}>
                  <TextInput style={[styles.input, styles.couponInput]} placeholder="e.g. WELCOME10" placeholderTextColor="#94A3B8" autoCapitalize="characters" value={couponCode} onChangeText={handleCouponTextChange} />
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={appliedCartCoupon ? handleRemoveCoupon : handleApplyCoupon}
                    disabled={cartCouponApplyLoading}
                  >
                    {cartCouponApplyLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.applyBtnText}>{appliedCartCoupon ? 'Remove' : 'Apply'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.viewCouponsRow} onPress={handleViewCoupons}>
                  <Icon name="local-offer" size={14} color="#D94625" />
                  <Text style={styles.viewCouponsLink}>View available coupons</Text>
                  <Icon name="expand-more" size={16} color="#D94625" />
                </TouchableOpacity>

                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Currency</Text>
                <CurrencyToggle value={currency} onChange={setCurrency} />
                <Text style={styles.fieldLabel}>Payment Method</Text>
                {gateways.map(g => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.gatewayRow, paymentMethod === g.value && styles.gatewayRowActive]}
                    activeOpacity={0.8}
                    onPress={() => setPaymentMethod(g.value)}
                  >
                    <Icon name={gatewayIcon(g.value)} size={20} color={paymentMethod === g.value ? '#20304C' : '#64748B'} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gatewayName}>{g.label}</Text>
                      {!!GATEWAY_META[g.value]?.desc && <Text style={styles.gatewayDesc}>{GATEWAY_META[g.value].desc}</Text>}
                    </View>
                    <View style={[styles.radio, paymentMethod === g.value && styles.radioActive]} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            <View style={styles.divider} />
            {isPureRecurring ? (
              <>
                {currency === 'INR' && !recurringQuoteReady ? (
                  <SummaryRow
                    label={recurringQuoteError || 'Calculating ₹ amount…'}
                    value={recurringQuoteLoading ? <ActivityIndicator size="small" color="#D94625" /> : ''}
                  />
                ) : (
                  <>
                    {recurringItems.map((it) => (
                      <SummaryRow
                        key={it.serviceId}
                        label={it.name}
                        value={currency === 'INR' ? formatAmount(recurringItemAmountInr(it), 'INR') : fmt(it.base != null ? it.base : it.price)}
                      />
                    ))}
                    <SummaryRow label="Subscription GST" value={currency === 'INR' ? formatAmount(recurringGstInr, 'INR') : fmt(recurringGstTotal)} />
                  </>
                )}
                <Text style={styles.disclaimer}>Billed automatically each {recurringInterval} until you cancel.</Text>
              </>
            ) : (!isQuotedOnlyCart && oneTimeItems.length > 0) && (
              <>
                {quoteBlocking && (
                  <View style={styles.quoteErrorBox}>
                    <Icon name="error-outline" size={16} color="#B91C1C" />
                    <Text style={styles.quoteErrorText}>{quoteErrorMessage}</Text>
                  </View>
                )}
                <SummaryRow label="Services" value={String(oneTimeItems.length)} />
                {currency === 'INR' && !estQuoteReadyInr ? (
                  <SummaryRow
                    label={quoteError || 'Calculating ₹ amount…'}
                    value={quoteLoading ? <ActivityIndicator size="small" color="#D94625" /> : ''}
                  />
                ) : (
                  <>
                    <SummaryRow label="Services total" value={currency === 'INR' ? formatAmount(estAmountInr, 'INR') : fmt(estAmount)} />
                    {currency !== 'INR' && estSurcharge > 0 && <SummaryRow label="Express surcharge" value={`+${fmt(estSurcharge)}`} />}
                    {currency !== 'INR' && estDiscount > 0 && <SummaryRow label="Discount" value={`-${fmt(estDiscount)}`} />}
                    <SummaryRow label="Services GST" sub="(18%)" value={currency === 'INR' ? formatAmount(estGstInr, 'INR') : fmt(estGst)} />
                  </>
                )}
              </>
            )}
            <View style={styles.payBox}>
              <Text style={styles.payLabel}>{isQuotedOnlyCart ? 'Price' : "You'll pay"}</Text>
              <Text style={styles.payValue}>
                {isQuotedOnlyCart ? 'To be confirmed' : (
                  <>
                    {currency === 'INR'
                      ? (isPureRecurring
                          ? (recurringQuoteReady ? formatAmount(recurringAmountInr, 'INR') : '…')
                          : (estQuoteReadyInr ? formatAmount(estTotalInr, 'INR') : '…'))
                      : fmt(isPureRecurring ? recurringSubtotal : estTotal)}
                    {isPureRecurring ? `/${recurringInterval}` : ''}
                  </>
                )}
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 18 }} />
            ) : (
              <TouchableOpacity
                style={[styles.submitBtn, !isQuotedOnlyCart && ((!isPureRecurring && quoteBlocking) || (currency === 'INR' && isPureRecurring && !recurringQuoteReady) || (currency === 'INR' && !isPureRecurring && !estQuoteReadyInr)) && styles.submitBtnDisabled]}
                activeOpacity={0.9}
                onPress={handlePayFirst}
                disabled={!isQuotedOnlyCart && ((!isPureRecurring && quoteBlocking) || (currency === 'INR' && isPureRecurring && !recurringQuoteReady) || (currency === 'INR' && !isPureRecurring && !estQuoteReadyInr))}
              >
                <Text style={styles.submitBtnText}>{isQuotedOnlyCart ? 'Submit Request' : 'Continue to Payment'}</Text>
                <Icon name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
          </>
          ) : (
          <>
          {/* Mixed cart (one-time + recurring together) — old details→payment
              flow, unchanged; the recurring item still surfaces as a
              pending_recurring_bundle to complete separately after checkout. */}
          {/* Step indicator */}
          <View style={styles.stepper}>
            <View style={styles.stepRow}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                {step === 'payment'
                  ? <Icon name="check" size={16} color="#FFFFFF" />
                  : <Text style={styles.stepNumActive}>1</Text>}
              </View>
              <View style={[styles.stepLine, step === 'payment' && styles.stepLineActive]} />
              <View style={[styles.stepCircle, step === 'payment' && styles.stepCircleActive]}>
                <Text style={[styles.stepNum, step === 'payment' && styles.stepNumActive]}>2</Text>
              </View>
            </View>
            <View style={styles.stepLabels}>
              <Text style={[styles.stepLabel, styles.stepLabelActive]}>Details & Documents</Text>
              <Text style={[styles.stepLabel, styles.stepLabelRight, step === 'payment' && styles.stepLabelActive]}>Payment</Text>
            </View>
          </View>

          {step === 'details' && (
          <>
          {/* Who / Where */}
          <View style={styles.card}>
            <View style={styles.cardHeadRow}><Icon name="place" size={16} color="#20304C" /><Text style={styles.cardTitle}>Who / Where</Text></View>

            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput style={styles.input} placeholder="Family member's name" placeholderTextColor="#94A3B8" value={reqForm.fullName} onChangeText={t => setField('fullName', t)} />

            <FormSelect label="Relation" required value={reqForm.relation} placeholder="Select..." options={RELATION_OPTIONS} onSelect={v => setField('relation', v)} />
            <FormSelect label="Property (optional)" value={reqForm.property} placeholder="Not applicable" options={[NO_PROPERTY, ...properties.map(p => p.nickname)]} onSelect={v => setField('property', v)} />
            <FormSelect label="State" required value={reqForm.state} placeholder="Select state" options={stateNames} onSelect={v => { setField('state', v); setField('city', ''); setField('taluka', ''); }} />
            <FormSelect label="City / District" required value={reqForm.city} placeholder={reqForm.state ? 'Select city' : 'Select state first'} options={cityNames} disabled={!reqForm.state} onSelect={v => { setField('city', v); setField('taluka', ''); }} />
            <FormSelect label="Taluka" value={reqForm.taluka} placeholder={reqForm.city ? 'Select taluka' : 'Select city first'} options={talukaNames} disabled={!reqForm.city} onSelect={v => setField('taluka', v)} />

            <Text style={styles.fieldLabel}>Full Address *</Text>
            <TextInput style={[styles.input, styles.inputMultiline]} placeholder="House/flat no., street, landmark..." placeholderTextColor="#94A3B8" multiline value={reqForm.address} onChangeText={t => setField('address', t)} />

            <Text style={styles.fieldLabel}>PIN Code *</Text>
            <View style={styles.pincodeRow}>
              <TextInput
                style={[styles.input, styles.pincodeInput]}
                placeholder="e.g. 416002"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={6}
                value={reqForm.pincode}
                onChangeText={t => setField('pincode', t.replace(/[^0-9]/g, ''))}
              />
              {pincodeLoading && <ActivityIndicator size="small" color="#D94625" />}
            </View>
            {!!pincodeLocation?.cityName && (
              <Text style={styles.pincodeHint}>
                {pincodeLocation.cityName}{pincodeLocation.stateName ? `, ${pincodeLocation.stateName}` : ''}
              </Text>
            )}

            <Text style={styles.fieldLabel}>Preferred Date & Time</Text>
            <TouchableOpacity style={[styles.selectBox, { marginBottom: 14 }]} activeOpacity={0.7} onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.selectText, !formattedPreferred && styles.selectPlaceholder]}>
                {formattedPreferred || 'dd-mm-yyyy --:--'}
              </Text>
              <Icon name="event" size={18} color="#64748B" />
            </TouchableOpacity>
            <CustomDateTimePicker
              visible={showDatePicker}
              mode="datetime"
              value={preferredDate}
              minimumDate={new Date()}
              title="Preferred Date & Time"
              onConfirm={(date) => { setPreferredDate(date); setShowDatePicker(false); }}
              onCancel={() => setShowDatePicker(false)}
            />

            <FormSelect label="Priority" required value={reqForm.priority} placeholder="Standard — Free" options={priorityLabels} onSelect={v => setField('priority', v)} />

            <Text style={styles.fieldLabel}>Additional Notes</Text>
            <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Any specific requirements, access instructions, etc." placeholderTextColor="#94A3B8" multiline value={reqForm.notes} onChangeText={t => setField('notes', t)} />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 18 }} />
          ) : (
            <TouchableOpacity style={styles.continueBtn} activeOpacity={0.9} onPress={handleContinue}>
              <Text style={styles.continueBtnText}>{isQuotedOnlyCart ? 'Submit Request' : 'Continue to Payment'}</Text>
              <Icon name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
          </>
          )}

          {step === 'payment' && (
          <>
          <TouchableOpacity style={styles.backToDetails} activeOpacity={0.7} onPress={() => setStep('details')}>
            <Icon name="arrow-back" size={16} color="#20304C" />
            <Text style={styles.backToDetailsText}>Back to details</Text>
          </TouchableOpacity>

          {/* Payment */}
          <View style={styles.card}>
            <View style={styles.cardHeadRow}><Icon name="receipt-long" size={16} color="#20304C" /><Text style={styles.cardTitle}>{isQuotedOnlyCart ? 'Request Summary' : 'Payment'}</Text></View>

            {isQuotedOnlyCart ? (
              <View style={styles.quoteOnlyBanner}>
                <Icon name="info-outline" size={18} color="#92400E" />
                <Text style={styles.quoteOnlyBannerText}>
                  One or more services in your cart don't have a fixed price. Submit your request — a vendor will propose a price, and you'll only be asked to pay once it's confirmed.
                </Text>
              </View>
            ) : (
              <>
                <Text style={styles.fieldLabel}>Have a coupon?</Text>
                <View style={styles.couponRow}>
                  <TextInput style={[styles.input, styles.couponInput]} placeholder="e.g. WELCOME10" placeholderTextColor="#94A3B8" autoCapitalize="characters" value={couponCode} onChangeText={handleCouponTextChange} />
                  <TouchableOpacity
                    style={styles.applyBtn}
                    onPress={appliedCartCoupon ? handleRemoveCoupon : handleApplyCoupon}
                    disabled={cartCouponApplyLoading}
                  >
                    {cartCouponApplyLoading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.applyBtnText}>{appliedCartCoupon ? 'Remove' : 'Apply'}</Text>
                    )}
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.viewCouponsRow} onPress={handleViewCoupons}>
                  <Icon name="local-offer" size={14} color="#D94625" />
                  <Text style={styles.viewCouponsLink}>View available coupons</Text>
                  <Icon name="expand-more" size={16} color="#D94625" />
                </TouchableOpacity>

                <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Currency</Text>
                <CurrencyToggle value={currency} onChange={setCurrency} />
                <Text style={styles.fieldLabel}>Payment Method</Text>
                {gateways.map(g => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.gatewayRow, paymentMethod === g.value && styles.gatewayRowActive]}
                    activeOpacity={0.8}
                    onPress={() => setPaymentMethod(g.value)}
                  >
                    <Icon name={gatewayIcon(g.value)} size={20} color={paymentMethod === g.value ? '#20304C' : '#64748B'} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gatewayName}>{g.label}</Text>
                      {!!GATEWAY_META[g.value]?.desc && <Text style={styles.gatewayDesc}>{GATEWAY_META[g.value].desc}</Text>}
                    </View>
                    <View style={[styles.radio, paymentMethod === g.value && styles.radioActive]} />
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Order summary — one-time items from the quote API; recurring
                items are billed separately, not part of this payment. */}
            <View style={styles.divider} />
            {oneTimeItems.length > 0 ? (
              <>
                {quoteBlocking && (
                  <View style={styles.quoteErrorBox}>
                    <Icon name="error-outline" size={16} color="#B91C1C" />
                    <Text style={styles.quoteErrorText}>{quoteErrorMessage}</Text>
                  </View>
                )}
                <SummaryRow label="Services" value={String(oneTimeItems.length)} />
                {currency === 'INR' && !estQuoteReadyInr ? (
                  <SummaryRow
                    label={quoteError || 'Calculating ₹ amount…'}
                    value={quoteLoading ? <ActivityIndicator size="small" color="#D94625" /> : ''}
                  />
                ) : (
                  <>
                    <SummaryRow label="Services total" value={currency === 'INR' ? formatAmount(estAmountInr, 'INR') : fmt(estAmount)} />
                    {currency !== 'INR' && estSurcharge > 0 && <SummaryRow label="Express surcharge" value={`+${fmt(estSurcharge)}`} />}
                    {currency !== 'INR' && estDiscount > 0 && <SummaryRow label="Discount" value={`-${fmt(estDiscount)}`} />}
                    <SummaryRow label="Services GST" sub="(18%)" value={currency === 'INR' ? formatAmount(estGstInr, 'INR') : fmt(estGst)} />
                  </>
                )}
              </>
            ) : (
              <Text style={styles.disclaimer}>
                No one-time services in this request — your recurring service(s) are set up
                after you tap Submit, via a separate subscription payment.
              </Text>
            )}
            <View style={styles.payBox}>
              <Text style={styles.payLabel}>{isQuotedOnlyCart ? 'Price' : "You'll pay"}</Text>
              <Text style={styles.payValue}>
                {isQuotedOnlyCart ? 'To be confirmed' : (
                  currency === 'INR' && oneTimeItems.length > 0
                    ? (estQuoteReadyInr ? formatAmount(estTotalInr, 'INR') : '…')
                    : fmt(oneTimeItems.length > 0 ? estTotal : recurringSubtotal)
                )}
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 18 }} />
            ) : (
              <TouchableOpacity
                style={[styles.submitBtn, !isQuotedOnlyCart && (quoteBlocking || (currency === 'INR' && oneTimeItems.length > 0 && !estQuoteReadyInr)) && styles.submitBtnDisabled]}
                activeOpacity={0.9}
                onPress={handleSubmit}
                disabled={!isQuotedOnlyCart && (quoteBlocking || (currency === 'INR' && oneTimeItems.length > 0 && !estQuoteReadyInr))}
              >
                <Text style={styles.submitBtnText}>Submit Request</Text>
                <Icon name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}

          </View>
          </>
          )}
          </>
          )}
        </ScrollView>
      )}

      <StripeCheckoutModal
        visible={!!checkoutSession}
        checkoutUrl={checkoutSession?.url}
        onSuccess={handleCheckoutSuccess}
        onCancel={() => setCheckoutSession(null)}
        title="Secure Payment"
      />

      <PendingRecurringBundleModal
        visible={!!pendingBundle}
        bundle={pendingBundle}
        onClose={() => { setPendingBundle(null); finishSuccess(); }}
        onSuccess={() => { setPendingBundle(null); finishSuccess(); }}
      />

      <Modal visible={showCouponsModal} transparent animationType="fade" onRequestClose={() => setShowCouponsModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCouponsModal(false)}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Available Coupons</Text>
            {cartCouponsLoading ? (
              <View style={styles.modalLoadingBox}>
                <ActivityIndicator size="small" color="#D94625" />
                <Text style={styles.disclaimer}>Loading coupons…</Text>
              </View>
            ) : (
              <FlatList
                data={cartCoupons}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => handlePickCoupon(item)}
                    disabled={!item.eligible}
                  >
                    <View style={styles.modalOptionTextWrap}>
                      <Text style={[styles.couponCodeText, !item.eligible && styles.couponIneligibleText]}>
                        {item.code}{item.valueLabel ? ` · ${item.valueLabel}` : ''}
                      </Text>
                      {!!item.description && <Text style={styles.couponDescText}>{item.description}</Text>}
                      {!item.eligible && !!item.reason && <Text style={styles.couponReasonText}>{item.reason}</Text>}
                    </View>
                    {item.eligible && <Icon name="chevron-right" size={20} color="#20304C" />}
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.modalEmptyText}>No coupons available right now.</Text>}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <AppAlert {...alertProps} onRequestClose={handleAlertRequestClose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  headerCard: { backgroundColor: '#20304C', paddingTop: STATUS_BAR_HEIGHT - 8, paddingBottom: 18, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBack: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  // Nudge the iOS chevron so it sits optically centered (matches Header).
  headerBackIcon: { marginLeft: 6 },
  headerTitle: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  clearBtnText: { fontSize: 12, color: '#FFFFFF', fontFamily: typography.labelMedium.fontFamily },

  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily, marginBottom: 12 },

  stepper: { marginBottom: 20, marginTop: 4 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' },
  stepCircleActive: { backgroundColor: '#D94625' },
  stepNum: { fontSize: 13, fontFamily: typography.h4.fontFamily, color: '#94A3B8' },
  stepNumActive: { fontSize: 13, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginHorizontal: 8 },
  stepLineActive: { backgroundColor: '#D94625' },
  stepLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  stepLabel: { fontSize: 11.5, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily, maxWidth: '48%' },
  stepLabelRight: { textAlign: 'right' },
  stepLabelActive: { color: '#20304C', fontFamily: typography.h4.fontFamily },
  continueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 16, marginTop: 16 },
  continueBtnText: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
  backToDetails: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4, marginBottom: 4 },
  backToDetailsText: { fontSize: 13, color: '#20304C', fontFamily: typography.h4.fontFamily },

  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FB', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  itemIconImage: { width: '100%', height: '100%' },
  itemName: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A', marginBottom: 6 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemBadge: { backgroundColor: '#EEF2FB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  itemBadgeText: { fontSize: 9, letterSpacing: 0.5, color: '#20304C', fontFamily: typography.labelMedium.fontFamily },
  recurringBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEF3C7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  recurringBadgeText: { fontSize: 9, letterSpacing: 0.5, color: '#B45309', fontFamily: typography.labelMedium.fontFamily },
  recurringChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', marginBottom: 10 },
  recurringChipText: { fontSize: 11.5, color: '#B45309', fontFamily: typography.labelMedium.fontFamily },
  itemDuration: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  itemDurationText: { fontSize: 11, color: '#94A3B8' },
  itemPrice: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#D94625' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  fieldLabel: { fontSize: 13, fontFamily: typography.h4.fontFamily, color: '#20304C', marginBottom: 6, marginTop: 2 },
  fieldHint: { fontSize: 11.5, color: '#94A3B8', lineHeight: 17, marginBottom: 2 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 48, color: '#1E293B', fontSize: 14, marginBottom: 14 },
  inputMultiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },
  pincodeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pincodeInput: { flex: 1 },
  pincodeHint: { fontSize: 12, color: '#10B981', marginTop: -8, marginBottom: 12 },

  selectBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 48 },
  selectBoxDisabled: { opacity: 0.5 },
  selectText: { flex: 1, fontSize: 14, color: '#0F172A' },
  selectPlaceholder: { color: '#94A3B8' },
  selectOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  selectSheet: { backgroundColor: '#FFFFFF', borderRadius: 20, maxHeight: '60%', paddingVertical: 16 },
  selectSheetTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A', paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  selectOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  selectOptionText: { fontSize: 14, color: '#0F172A' },
  selectEmpty: { fontSize: 13, color: '#94A3B8', textAlign: 'center', padding: 20 },

  couponRow: { flexDirection: 'row', gap: 10 },
  couponInput: { flex: 1, marginBottom: 0 },
  applyBtn: { backgroundColor: '#20304C', borderRadius: 12, paddingHorizontal: 20, height: 48, justifyContent: 'center', alignItems: 'center', minWidth: 80 },
  applyBtnText: { color: '#FFFFFF', fontFamily: typography.h4.fontFamily, fontSize: 13 },
  viewCouponsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 10 },
  viewCouponsLink: { fontSize: 13, fontFamily: typography.h4.fontFamily, color: '#D94625' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '65%', paddingBottom: 24, paddingTop: 12 },
  modalTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalOptionTextWrap: { flex: 1 },
  modalEmptyText: { fontSize: 13, color: '#94A3B8', padding: 24, textAlign: 'center' },
  couponCodeText: { fontSize: 14, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  couponIneligibleText: { color: '#9CA3AF' },
  couponDescText: { fontSize: 12, color: '#64748B', marginTop: 4 },
  couponReasonText: { fontSize: 11.5, color: '#EF4444', marginTop: 4 },

  gatewayRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 12, padding: 14, marginBottom: 10 },
  gatewayRowActive: { borderColor: '#20304C', backgroundColor: '#EEF2FB' },
  gatewayName: { fontSize: 14, fontFamily: typography.h4.fontFamily, color: '#1E293B' },
  gatewayDesc: { fontSize: 11.5, color: '#94A3B8', marginTop: 2 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: '#CBD5E1' },
  radioActive: { borderColor: '#20304C', backgroundColor: '#20304C' },

  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  sumLabel: { fontSize: 14, color: '#64748B' },
  sumLabelStrong: { color: '#0F172A', fontFamily: typography.h4.fontFamily },
  sumSub: { fontSize: 12, color: '#94A3B8' },
  sumValue: { fontSize: 14, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily },
  sumValueStrong: { fontFamily: typography.h4.fontFamily },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },
  disclaimer: { fontSize: 11, lineHeight: 16, color: '#94A3B8', marginTop: 10 },
  quoteErrorBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FEF2F2', borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', padding: 12 },
  quoteErrorText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#B91C1C' },
  quoteOnlyBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF9C3', borderRadius: 12, padding: 14 },
  quoteOnlyBannerText: { flex: 1, fontSize: 13, lineHeight: 19, color: '#78350F' },

  payBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EEF2FB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 12 },
  payLabel: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  payValue: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#20304C' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 16, marginTop: 16 },
  submitBtnDisabled: { backgroundColor: '#F3A28F' },
  submitBtnText: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },

  footRow: { marginTop: 16, gap: 8 },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footText: { fontSize: 12, color: '#64748B' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  primaryBtn: { backgroundColor: '#D94625', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  primaryBtnText: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
});

export default SubmitRequest;
