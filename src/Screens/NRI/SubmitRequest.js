import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList, StatusBar, Platform, Alert, Image } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { clearCart, clearServerCart, selectCartItems } from '../../Redux/slices/cartSlice';
import { useCart } from '../../Hooks/useCart';
import { useProperties } from '../../Hooks/useProperties';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';
import { useTalukas } from '../../Hooks/useTalukas';
import { usePriorities } from '../../Hooks/usePriorities';
import { useTicketBooking } from '../../Hooks/useTicketBooking';
import { useBilling } from '../../Hooks/useBilling';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';
import PendingRecurringBundleModal from '../../Components/PendingRecurringBundleModal';
import { runRazorpayPayment } from '../../Utils/paymentGateway';
import { usePaymentGateways, gatewayIcon, GATEWAY_META } from '../../Hooks/usePaymentGateways';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { setServiceLocation } from '../../Redux/slices/serviceLocationSlice';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { resolveLocalCopies } from '../../Utils/localFileCopy';
import { useToast } from '../../context/ToastContext';

const GST_RATE = 0.18;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
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

function DocumentUploadField({ document, file, onChoose, onRemove, onView }) {
  return (
    <View style={{ marginTop: 14 }}>
      <Text style={styles.fieldLabel}>{document.name}{document.required ? ' *' : ''}</Text>
      {!!document.description && <Text style={styles.fieldHint}>{document.description}</Text>}
      <View style={styles.docInputRow}>
        <TouchableOpacity style={styles.docChooseBtn} onPress={onChoose} activeOpacity={0.7}>
          <Icon name="attach-file" size={16} color="#20304C" />
          <Text style={styles.docChooseBtnText}>{file ? 'Replace' : 'Choose File'}</Text>
        </TouchableOpacity>
        <Text style={styles.docFileName} numberOfLines={1}>{file ? file.name : 'No file chosen'}</Text>
      </View>
      {!!file && (
        <View style={styles.filePill}>
          <Icon name={file.type?.includes('pdf') ? 'picture-as-pdf' : 'image'} size={14} color="#20304C" />
          <Text style={styles.filePillText} numberOfLines={1}>{file.name}</Text>
          <TouchableOpacity onPress={onView} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.filePillView}>
            <Icon name="visibility" size={16} color="#20304C" />
            <Text style={styles.filePillViewText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}
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
    remove: removeCartService, checkout: checkoutCart, checkoutLoading,
    coupons: cartCoupons, couponsLoading: cartCouponsLoading, fetchCoupons: fetchCartCoupons,
    appliedCoupon: appliedCartCoupon, couponApplyLoading: cartCouponApplyLoading,
    applyCoupon: applyCartCoupon, clearCoupon: clearCartCoupon,
  } = useCart();
  const items = useSelector(selectCartItems);
  const savedLocation = useSelector(s => s.serviceLocation);
  const user = useSelector(s => s.user.user);
  // Available gateways come from the backend (already NRI + admin-toggle gated).
  const { gateways } = usePaymentGateways();
  // Populates the Property dropdown below — same source AddProperty.js writes
  // to, so a property added there shows up here without a manual refresh
  // (both read the same Redux slice).
  const { properties } = useProperties();

  const [reqForm, setReqForm] = useState({
    fullName: '', relation: '', property: NO_PROPERTY,
    state: items[0]?.stateName || savedLocation?.stateName || '',
    city: items[0]?.cityName || savedLocation?.cityName || '',
    taluka: '',
    address: '', pincode: items[0]?.pincode || savedLocation?.pincode || '', preferredAt: '', priority: '', notes: '',
  });
  const setField = (k, v) => setReqForm(p => ({ ...p, [k]: v }));
  const [documentFiles, setDocumentFiles] = useState({});
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
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);

  const { stateNames, states } = useStates();
  const { cityNames, cities } = useCities(reqForm.state);
  const { talukaNames, talukas } = useTalukas(null, reqForm.city);
  const { priorities } = usePriorities();
  const { loading: pincodeLoading, lookup: lookupPincode } = usePostalCodeLookup();
  const {
    requiredDocuments, fetchRequiredDocuments,
    quote, quoteLoading, quoteFailed, quoteError, fetchQuote,
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
  // ALL cart items, not just one-time ones — confirmed live (same as
  // OnboardingPayment.js) that /cart/checkout 422s ("The document.N field is
  // required") for a recurring service's required document even though its
  // ticket isn't created here; there's no other document-upload step for it
  // before the deferred subscribe-recurring payment, so it has to be
  // collected now.
  const cartServiceIdsKey = items.map(i => i.serviceId).join(',');
  useEffect(() => {
    if (items.length) fetchRequiredDocuments(items.map(i => i.serviceId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartServiceIdsKey]);

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
          dispatch(setServiceLocation({
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

  const loading = submissionInProgress || checkoutLoading || payLoading || verifyLoading;

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
  const quoteBlocking = oneTimeItems.length > 0 && quoteFailed;
  const quoteErrorMessage = quoteError?.message || 'One or more selected services aren\'t available for your selected city. Please review your cart.';

  const handleChooseDocument = async (docId) => {
    try {
      const results = await pick({ type: [docTypes.images, docTypes.pdf], allowMultiSelection: false });
      const picked = results[0];
      if (!picked) return;
      if (picked.size && picked.size > MAX_FILE_SIZE_BYTES) { Alert.alert('File Too Large', 'Please choose a file under 5 MB.'); return; }
      const [local] = await resolveLocalCopies([picked]);
      setDocumentFiles(prev => ({ ...prev, [docId]: { name: picked.name, uri: local.uri, type: picked.type, size: picked.size } }));
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', 'Could not select the file. Please try again.');
    }
  };
  const handleRemoveDocument = (docId) => setDocumentFiles(prev => { const n = { ...prev }; delete n[docId]; return n; });

  // Preferred date/time. Android needs date-then-time chaining; iOS does both
  // in one spinner. Past dates are blocked via minimumDate on the picker.
  const handleDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    if (Platform.OS === 'android') {
      setPendingDate(selected);
      setShowTimePicker(true);
    } else {
      setPreferredDate(selected);
    }
  };
  const handleTimeChange = (event, selected) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !selected || !pendingDate) { setPendingDate(null); return; }
    const combined = new Date(pendingDate);
    combined.setHours(selected.getHours(), selected.getMinutes());
    setPreferredDate(combined);
    setPendingDate(null);
  };
  const formattedPreferred = preferredDate
    ? preferredDate.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  // View an uploaded document: images preview in-app; PDFs/others open in the
  // device's document viewer.
  const [previewImage, setPreviewImage] = useState(null);
  const handleViewDocument = (file) => {
    if (!file?.uri) return;
    const isImage = (file.type || '').startsWith('image') || /\.(png|jpe?g|gif|webp|heic)$/i.test(file.name || '');
    if (isImage) { setPreviewImage(file); return; }
    const path = decodeURIComponent(file.uri.replace(/^file:\/\//, ''));
    const opening = Platform.OS === 'ios'
      ? RNBlobUtil.ios.previewDocument(path)
      : RNBlobUtil.android.actionViewIntent(path, file.type || 'application/pdf');
    Promise.resolve(opening).catch(() => Alert.alert('Cannot open', 'No app is available to preview this document.'));
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

  // Validate the Who/Where fields + required documents (step 1). Returns false
  // and shows a popup listing anything missing.
  const validateDetails = () => {
    const missing = [];
    if (!reqForm.fullName.trim()) missing.push('Full Name');
    if (!reqForm.relation) missing.push('Relation');
    if (!reqForm.state) missing.push('State');
    if (!reqForm.city) missing.push('City / District');
    if (!reqForm.address.trim()) missing.push('Full Address');
    if (!reqForm.pincode.trim()) missing.push('PIN Code');
    if (!reqForm.priority) missing.push('Priority');
    const missingDocs = requiredDocuments.filter(d => d.required && !documentFiles[d.id]).map(d => d.name);
    if (missing.length || missingDocs.length) {
      const parts = [];
      if (missing.length) parts.push(`Please fill: ${missing.join(', ')}.`);
      if (missingDocs.length) parts.push(`Please upload: ${missingDocs.join(', ')}.`);
      showAlert('Missing Details', parts.join('\n\n'));
      return false;
    }
    return true;
  };

  const handleContinue = () => { if (validateDetails()) setStep('payment'); };

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

      const result = await checkoutCart({
        gateway: paymentMethod,
        couponCode: couponCode.trim() || undefined,
        familyMemberName: reqForm.fullName.trim() || undefined,
        familyMemberRelationship: reqForm.relation.trim().toLowerCase() || undefined,
        stateId, cityId, talukaId,
        address: reqForm.address.trim(),
        pincode: reqForm.pincode.trim(),
        urgency: selectedPriority?.slug || 'standard',
        preferredDate: preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined,
        customerNotes: reqForm.notes || undefined,
        documents: documentFiles,
      }).unwrap();

      if (result.paymentRequired && result.ticketId) {
        // /cart/checkout only creates the ticket(s) and validates the
        // recurring/PayPal restriction — confirmed live it does NOT start a
        // gateway session itself (no checkout_url/order on its response).
        // Pay the created ticket the same way the pre-cart flow always did.
        const pay = await payForTicket('ticket', result.ticketId, paymentMethod).unwrap();
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
            {oneTimeItems.length > 0 ? (
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
                <SummaryRow label="Estimated amount" value={fmt(estAmount)} />
                {estSurcharge > 0 && <SummaryRow label="Express surcharge" value={`+${fmt(estSurcharge)}`} />}
                {estDiscount > 0 && <SummaryRow label="Discount" value={`-${fmt(estDiscount)}`} />}
                <SummaryRow label="GST" sub="(18%)" value={fmt(estGst)} />
                <View style={styles.divider} />
                <SummaryRow label="Estimated Total" value={fmt(estTotal)} strong />
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
                {recurringItems.map((it) => (
                  <SummaryRow key={it.serviceId} label={it.name} value={fmt(it.base != null ? it.base : it.price)} />
                ))}
                <SummaryRow label="Subscription GST" value={fmt(recurringGstTotal)} />
                <SummaryRow label={`Subscription Total (billed ${recurringInterval})`} value={fmt(recurringSubtotal)} strong />
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
          {/* Page 2 — two-step request form */}
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
            {showDatePicker && (
              <DateTimePicker
                value={preferredDate || new Date()}
                mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                minimumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={pendingDate || preferredDate || new Date()}
                mode="time"
                display="default"
                onChange={handleTimeChange}
              />
            )}

            <FormSelect label="Priority" required value={reqForm.priority} placeholder="Standard — Free" options={priorityLabels} onSelect={v => setField('priority', v)} />

            <Text style={styles.fieldLabel}>Additional Notes</Text>
            <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Any specific requirements, access instructions, etc." placeholderTextColor="#94A3B8" multiline value={reqForm.notes} onChangeText={t => setField('notes', t)} />
          </View>

          {/* Required documents */}
          {requiredDocuments.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardHeadRow}><Icon name="folder-open" size={16} color="#20304C" /><Text style={styles.cardTitle}>Required Documents</Text></View>
              {requiredDocuments.map(doc => (
                <DocumentUploadField
                  key={String(doc.id)}
                  document={doc}
                  file={documentFiles[doc.id]}
                  onChoose={() => handleChooseDocument(doc.id)}
                  onRemove={() => handleRemoveDocument(doc.id)}
                  onView={() => handleViewDocument(documentFiles[doc.id])}
                />
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.continueBtn} activeOpacity={0.9} onPress={handleContinue}>
            <Text style={styles.continueBtnText}>Continue to Payment</Text>
            <Icon name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
          </>
          )}

          {step === 'payment' && (
          <>
          <TouchableOpacity style={styles.backToDetails} activeOpacity={0.7} onPress={() => setStep('details')}>
            <Icon name="arrow-back" size={16} color="#20304C" />
            <Text style={styles.backToDetailsText}>Back to details & documents</Text>
          </TouchableOpacity>

          {/* Payment */}
          <View style={styles.card}>
            <View style={styles.cardHeadRow}><Icon name="receipt-long" size={16} color="#20304C" /><Text style={styles.cardTitle}>Payment</Text></View>

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

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Payment Method</Text>
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
                <SummaryRow label="Services total" value={fmt(estAmount)} />
                {estSurcharge > 0 && <SummaryRow label="Express surcharge" value={`+${fmt(estSurcharge)}`} />}
                {estDiscount > 0 && <SummaryRow label="Discount" value={`-${fmt(estDiscount)}`} />}
                <SummaryRow label="Services GST" sub="(18%)" value={fmt(estGst)} />
              </>
            ) : (
              <Text style={styles.disclaimer}>
                No one-time services in this request — your recurring service(s) are set up
                after you tap Submit, via a separate subscription payment.
              </Text>
            )}
            <View style={styles.payBox}>
              <Text style={styles.payLabel}>You'll pay</Text>
              <Text style={styles.payValue}>{fmt(oneTimeItems.length > 0 ? estTotal : recurringSubtotal)}</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 18 }} />
            ) : (
              <TouchableOpacity
                style={[styles.submitBtn, quoteBlocking && styles.submitBtnDisabled]}
                activeOpacity={0.9}
                onPress={handleSubmit}
                disabled={quoteBlocking}
              >
                <Text style={styles.submitBtnText}>Submit Request</Text>
                <Icon name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}

          </View>
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

      {/* In-app image preview */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.previewOverlay}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewName} numberOfLines={1}>{previewImage?.name}</Text>
            <TouchableOpacity onPress={() => setPreviewImage(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          {!!previewImage && <Image source={{ uri: previewImage.uri }} style={styles.previewImage} resizeMode="contain" />}
        </View>
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

  docInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  docChooseBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 44, backgroundColor: '#F8FAFC' },
  docChooseBtnText: { fontSize: 13, fontFamily: typography.h4.fontFamily, color: '#20304C' },
  docFileName: { flex: 1, fontSize: 12.5, color: '#94A3B8' },
  filePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  filePillText: { flex: 1, fontSize: 12.5, color: '#1E293B' },
  filePillView: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  filePillViewText: { fontSize: 12, color: '#20304C', fontFamily: typography.h4.fontFamily },

  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: STATUS_BAR_HEIGHT, paddingHorizontal: 20, paddingBottom: 12 },
  previewName: { flex: 1, fontSize: 14, color: '#FFFFFF', fontFamily: typography.h4.fontFamily },
  previewImage: { flex: 1, width: '100%' },

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
