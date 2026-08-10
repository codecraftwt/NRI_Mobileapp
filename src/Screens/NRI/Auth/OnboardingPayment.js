import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, Dimensions, Platform, PermissionsAndroid, Linking, Alert, Image } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNBlobUtil from 'react-native-blob-util';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { resolveLocalCopies } from '../../../Utils/localFileCopy';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import StripeCheckoutModal from '../../../Components/StripeCheckoutModal';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { updateProfile, updateMembership } from '../../../Redux/slices/userSlice';
import { addInvoice } from '../../../Redux/slices/walletSlice';
import { clearCart, selectCartItems, selectCartSubtotal } from '../../../Redux/slices/cartSlice';
import { fetchTicketRequiredDocuments, submitTicket } from '../../../Redux/slices/ticketBookingSlice';
import { addCartItem } from '../../../Api/cartApi';
import { useCartPriceSync } from '../../../Hooks/useCartPriceSync';
import apiClient from '../../../Api/client';
import { useFamilyMembers } from '../../../Hooks/useFamilyMembers';
import { usePlans } from '../../../Hooks/usePlans';
import { useMembershipCheckout } from '../../../Hooks/useMembershipCheckout';
import { useStates } from '../../../Hooks/useStates';
import { useCities } from '../../../Hooks/useCities';
import { useTalukas } from '../../../Hooks/useTalukas';
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
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

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

// A single required-document row with a "Choose File" picker + preview pill.
function DocumentUploadField({ document, file, onChoose, onRemove, onView }) {
  return (
    <View style={styles.docUploadWrap}>
      <Text style={styles.fieldLabel}>
        {document.name}{document.required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {!!document.description && <Text style={styles.fieldHint}>{document.description}</Text>}
      <View style={styles.docInputRow}>
        <TouchableOpacity style={styles.docChooseBtn} onPress={onChoose} activeOpacity={0.7}>
          <Icon name="attach-file" size={16} color={C.primary} />
          <Text style={styles.docChooseBtnText}>{file ? 'Replace' : 'Choose File'}</Text>
        </TouchableOpacity>
        <Text style={styles.docFileName} numberOfLines={1}>{file ? file.name : 'No file chosen'}</Text>
      </View>
      {!!file && (
        <View style={styles.filePill}>
          <Icon name={file.type?.includes('pdf') ? 'picture-as-pdf' : 'image'} size={14} color={C.primary} />
          <Text style={styles.filePillText} numberOfLines={1}>{file.name}</Text>
          <TouchableOpacity onPress={onView} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.filePillView}>
            <Icon name="visibility" size={16} color={C.primary} />
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

// Relations offered for a cart service request (who the service is for).
// Matches the family member API's `relationship` enum — same list the ticket
// booking form (CreateTicket) offers.
const RELATION_OPTIONS = ['Parent', 'Sibling', 'Spouse', 'Child', 'Other'];

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
  const { profile } = route.params || {};
  const dispatch = useDispatch();
  const { regularPlans, loading: plansLoading, failed: plansFailed, retry: retryPlans } = usePlans();
  const plan = regularPlans.find(p => p.isPopular) || regularPlans[0] || null;
  const {
    coupons, couponsLoading, fetchCoupons,
    couponResult, couponLoading, validateCoupon, clearCoupon,
    checkoutLoading, checkout, verifyLoading, verifyPayment,
  } = useMembershipCheckout();

  // Cart-driven purchase path. When the user reached this step from the cart
  // (or a direct service purchase), Step 2 also collects the service-request
  // details and bills the selected services alongside the membership. With an
  // empty cart this is a plain membership registration — unchanged.
  const cartItems = useSelector(selectCartItems);
  const servicesSubtotal = useSelector(selectCartSubtotal);
  const savedLocation = useSelector(s => s.serviceLocation);
  const fromCart = cartItems.length > 0;

  const [planCouponCode, setPlanCouponCode] = useState('');
  const paymentMethod = 'stripe';
  const [submitting, setSubmitting] = useState(false);
  // Two-step sub-flow for the cart path: 'details' (who/where + documents) then
  // 'summary' (order summary + payment). Plain membership skips straight to summary.
  const [step, setStep] = useState('details');
  const [documentFiles, setDocumentFiles] = useState({}); // { [requiredDocId]: file }
  // Preferred date/time picker state.
  const [preferredDate, setPreferredDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);

  // "Who / Where — for your cart's service requests" form. Location prefilled
  // from the first cart item (the city the services were priced for).
  const firstItem = cartItems[0] || {};
  const [reqForm, setReqForm] = useState({
    // Left blank on purpose — this is the NRI's family member (who the service
    // is for), not the account holder, so it must be entered manually.
    fullName: '',
    relation: '',
    property: 'Not applicable',
    state: firstItem.stateName || savedLocation?.stateName || '',
    city: firstItem.cityName || savedLocation?.cityName || '',
    taluka: '',
    address: '',
    // Prefill the PIN code the guest picked when choosing services (carried on
    // the cart item), so they don't re-enter it after registering.
    pincode: firstItem.pincode || savedLocation?.pincode || '',
    preferredAt: '',
    priority: '',
    notes: '',
  });
  const setField = (key, val) => setReqForm(prev => ({ ...prev, [key]: val }));

  const { stateNames, states } = useStates();
  const { cityNames, cities } = useCities(reqForm.state);
  const { talukaNames, talukas } = useTalukas(null, reqForm.city);
  const { members: familyMembers, create: createFamilyMember } = useFamilyMembers();
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

  // Required documents for the selected (cart) services — displayed on this
  // step so the customer knows what to prepare. Fetched from the same endpoint
  // the ticket booking form uses. (User is authenticated by this step.)
  const requiredDocuments = useSelector(state => state.ticketBooking.requiredDocuments);
  const cartServiceIdsKey = cartItems.map(i => i.serviceId).join(',');
  useEffect(() => {
    if (fromCart) {
      dispatch(fetchTicketRequiredDocuments(cartItems.map(i => i.serviceId)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCart, cartServiceIdsKey]);

  // Re-bind the EXACT vendor price for every cart service from the live
  // GET /services?city_id=<id> response, so the Order Summary and Amount Payable
  // shown here match what the backend charges (only runs for the cart flow).
  useCartPriceSync(fromCart);
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  // { url, paymentId } while the hosted Stripe checkout WebView is open.
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [customAlert, setCustomAlert] = useState({ visible: false, title: '', message: '', type: 'info' });

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
  const amountPayable = membershipPayable + (fromCart ? servicesPayable : 0);

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
        showAlert('Coupon Applied', `Code ${result.code} applied`, 'success');
      })
      .catch((error) => {
        showAlert('Invalid Coupon', error?.message || 'This coupon could not be applied.', 'error');
      });
  };

  const loading = submitting || checkoutLoading || verifyLoading;

  // Required-document upload (Android needs media/storage permission first).
  const requestFilePermission = async () => {
    if (Platform.OS !== 'android') return true;
    const permission = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    if (await PermissionsAndroid.check(permission)) return true;
    const result = await PermissionsAndroid.request(permission, {
      title: 'Allow Photo & Document Access',
      message: 'NRI Circle needs access to your photos and documents so you can attach them.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert('Permission Required', 'Enable photo & document access from app settings to attach files.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]);
    }
    return false;
  };

  const handleChooseDocument = async (docId) => {
    if (!(await requestFilePermission())) return;
    try {
      const results = await pick({ type: [docTypes.images, docTypes.pdf], allowMultiSelection: false });
      const picked = results[0];
      if (!picked) return;
      if (picked.size && picked.size > MAX_FILE_SIZE_BYTES) {
        Alert.alert('File Too Large', 'Please choose a file under 5 MB.');
        return;
      }
      const [local] = await resolveLocalCopies([picked]);
      setDocumentFiles(prev => ({ ...prev, [docId]: { name: picked.name, uri: local.uri, type: picked.type, size: picked.size } }));
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', 'Could not select the file. Please try again.');
    }
  };

  const handleRemoveDocument = (docId) => {
    setDocumentFiles(prev => { const next = { ...prev }; delete next[docId]; return next; });
  };

  // View an uploaded document: images preview in-app; PDFs/others open in the
  // device document viewer.
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

  // Preferred date/time. Android can't do a one-step datetime picker, so pick
  // the date first then chain the time picker; iOS does both in one spinner.
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

  // The ticket API only accepts an existing family_member_id, not raw
  // name/relation — reuse a matching saved member if one exists, otherwise
  // create one from what was entered on the Who/Where form.
  const resolveFamilyMemberId = async () => {
    const name = reqForm.fullName.trim();
    const relationship = reqForm.relation.toLowerCase();
    if (!name || !relationship) return undefined;
    const existing = familyMembers.find(
      m => m.name.trim().toLowerCase() === name.toLowerCase() && m.relationship === relationship
    );
    if (existing) return existing.id;
    const created = await createFamilyMember({ name, relationship }).unwrap();
    return created.id;
  };

  // Once payment is done, turn each cart service into an actual service request
  // (POST /customer/tickets) using the Who/Where form details, so it shows up
  // in the customer's Requests tab on the dashboard. Reuses the same booking
  // API the in-app CreateTicket screen uses.
  const submitCartServiceRequests = async () => {
    const stateId = states.find(s => s.name === reqForm.state)?.id;
    const cityId = cities.find(c => c.name === reqForm.city)?.id || cartItems[0]?.cityId || savedLocation?.cityId || null;
    const talukaId = talukas.find(t => t.name === reqForm.taluka)?.id || null;
    const address = reqForm.pincode.trim()
      ? `${reqForm.address.trim()} - ${reqForm.pincode.trim()}`
      : reqForm.address.trim();
    const familyMemberId = await resolveFamilyMemberId();
    const urgency = selectedPriority?.slug || 'standard';
    const preferred = preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined;

    // Each selected service becomes its own request (mirrors the web + the
    // "each service becomes its own request" note on the form).
    for (const item of cartItems) {
      await dispatch(submitTicket({
        serviceId: item.serviceId,
        familyMemberId,
        stateId,
        cityId,
        talukaId,
        address,
        urgency,
        preferredDate: preferred,
        customerNotes: reqForm.notes || undefined,
        documents: documentFiles,
      })).unwrap();
    }
  };

  // Activates the membership locally, creates the cart's service requests, then
  // moves on to the welcome screen once the gateway payment is confirmed.
  const finishUp = async () => {
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

    // The backend now automatically creates the service requests via CartCheckoutService 
    // when the combined Stripe session is paid successfully. We only need to clear the local cart.
    if (fromCart) {
      dispatch(clearCart());
    }

    // Tell the welcome screen whether service requests were created, so it can
    // send the user to the Requests (tracking) tab instead of the dashboard.
    navigation.replace('OnboardingWelcome', { plan, hasServiceRequests: fromCart });
  };

  const handlePay = async () => {
    if (!plan) {
      showAlert('No Plan Selected', 'Please go back and choose a membership plan.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      if (fromCart) {
        // Sync Redux cart to backend before checkout so they ride along with membership
        for (const item of cartItems) {
          try {
            await addCartItem(item.serviceId);
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
        combinedCart: fromCart,
        familyMemberName: reqForm.fullName?.trim() || undefined,
        familyMemberRelationship: reqForm.relation?.trim().toLowerCase() || undefined,
        stateId: states.find(s => s.name === reqForm.state)?.id || undefined,
        cityId: cities.find(c => c.name === reqForm.city)?.id || (fromCart ? (cartItems[0]?.cityId || savedLocation?.cityId) : undefined) || undefined,
        talukaId: talukas.find(t => t.name === reqForm.taluka)?.id || undefined,
        address: reqForm.address?.trim() || undefined,
        pincode: reqForm.pincode?.trim() || undefined,
        urgency: selectedPriority?.slug || 'standard',
        preferredDate: preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined,
        customerNotes: reqForm.notes || undefined,
        documents: documentFiles,
      }).unwrap();

      if (result.checkoutUrl) {
        // Stripe returns a hosted checkout_url. Open it in an
        // in-app WebView; the payment is confirmed in handleCheckoutSuccess
        // once the gateway redirects back to the success_url with a session_id
        // (see StripeCheckoutModal).
        setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId });
      } else {
        // Wallet credits / free plan covered the full amount — nothing to pay.
        await finishUp();
      }
    } catch (error) {
      showAlert('Payment Failed', error?.message || 'Could not complete checkout. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // The hosted Stripe page redirected back with a session_id — confirm
  // it with the backend, which is what actually activates the membership.
  const handleCheckoutSuccess = async (sessionId) => {
    const paymentId = checkoutSession?.paymentId;
    setCheckoutSession(null);
    setSubmitting(true);
    try {
      await verifyPayment({ paymentId, sessionId }).unwrap();
      await finishUp();
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

  // Validate the required Who/Where fields + required documents before moving
  // to payment; show a popup listing anything still missing.
  const handleContinueToPayment = () => {
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
      showAlert('Missing Details', parts.join('\n\n'), 'error');
      return;
    }
    setStep('summary');
  };

  // Cart path splits Step 2 into: details (who/where + documents) → summary
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
              <Text style={[styles.subStepText, showDetails && styles.subStepTextActive]}>1 · Details & Documents</Text>
            </View>
            <View style={[styles.subStep, showSummary && styles.subStepActive]}>
              <Text style={[styles.subStepText, showSummary && styles.subStepTextActive]}>2 · Order & Payment</Text>
            </View>
          </View>
        )}

        {showDetails && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="place" size={16} color={C.primary} />
              <Text style={styles.cardHeaderText}>Who / Where — for your cart's service requests</Text>
            </View>

            <Text style={styles.fieldLabel}>Full Name *</Text>
            <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#94A3B8" value={reqForm.fullName} onChangeText={t => setField('fullName', t)} />

            <FormSelect label="Relation" required value={reqForm.relation} placeholder="Select..." options={RELATION_OPTIONS} onSelect={v => setField('relation', v)} />

            <FormSelect label="Property (optional)" value={reqForm.property} placeholder="Not applicable" options={['Not applicable']} onSelect={v => setField('property', v)} />

            <FormSelect label="State" required value={reqForm.state} placeholder="Select state" options={stateNames} onSelect={v => { setField('state', v); setField('city', ''); setField('taluka', ''); }} />

            <FormSelect label="City / District" required value={reqForm.city} placeholder={reqForm.state ? 'Select city' : 'Select state first'} options={cityNames} disabled={!reqForm.state} onSelect={v => { setField('city', v); setField('taluka', ''); }} />

            <FormSelect label="Taluka" value={reqForm.taluka} placeholder={reqForm.city ? 'Select taluka' : 'Select city first'} options={talukaNames} disabled={!reqForm.city} onSelect={v => setField('taluka', v)} />

            <Text style={styles.fieldLabel}>Full Address *</Text>
            <TextInput style={[styles.input, styles.inputMultiline]} placeholder="House/flat no., street, landmark..." placeholderTextColor="#94A3B8" multiline value={reqForm.address} onChangeText={t => setField('address', t)} />

            <Text style={styles.fieldLabel}>PIN Code *</Text>
            <TextInput style={styles.input} placeholder="e.g. 416002" placeholderTextColor="#94A3B8" keyboardType="number-pad" value={reqForm.pincode} onChangeText={t => setField('pincode', t)} />

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

            <Text style={styles.fieldHint}>Each service becomes its own request, priced from real vendor rates for this address — updated live as you fill this in.</Text>
          </View>
        )}

        {showDetails && requiredDocuments.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="folder-open" size={16} color={C.primary} />
              <Text style={styles.cardHeaderText}>Required Documents</Text>
            </View>
            <Text style={styles.gatewayIntro}>Upload the documents needed for your selected services.</Text>
            {requiredDocuments.map((doc) => (
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

        {showDetails && (
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinueToPayment} activeOpacity={0.9}>
            <Text style={styles.continueBtnText}>Continue to Payment</Text>
            <Icon name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {showSummary && fromCart && (
          <TouchableOpacity style={styles.backToDetails} onPress={() => setStep('details')} activeOpacity={0.7}>
            <Icon name="arrow-back" size={16} color={C.primary} />
            <Text style={styles.backToDetailsText}>Back to details & documents</Text>
          </TouchableOpacity>
        )}

        {showSummary && (plansLoading ? (
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
                <Text style={styles.rowLabel}>{fromCart ? 'Membership GST (18%)' : 'GST (18%)'}</Text>
                <Text style={styles.rowValue}>{formatUsd(gstAmount)}</Text>
              </View>

              {fromCart && (
                <>
                  <View style={styles.row}>
                    <Text style={[styles.rowLabel, styles.rowLabelStrong]}>Membership Total</Text>
                    <Text style={[styles.rowValue, styles.rowValueStrong]}>{formatUsd(membershipPayable)}</Text>
                  </View>

                  <View style={styles.divider} />
                  <View style={styles.servicesChip}>
                    <Icon name="shopping-cart" size={13} color={C.accent} />
                    <Text style={styles.servicesChipText}>Services ({cartItems.length})</Text>
                  </View>
                  {cartItems.map((it) => (
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

              <View style={styles.divider} />
              <View style={styles.row}>
                <Text style={styles.amountPayableLabel}>Amount Payable</Text>
                <Text style={styles.amountPayableValue}>{formatUsd(amountPayable)}</Text>
              </View>
              {fromCart && (
                <Text style={styles.combinedNote}>
                  Included in the amount payable above — services are paid together with your
                  membership in this one payment.
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
              <Text style={styles.gatewayIntro}>Pay securely with card:</Text>

              <TouchableOpacity style={[styles.gatewayRow, styles.gatewayRowActive]} activeOpacity={0.8}>
                <Icon name="credit-card" size={22} color={paymentMethod === 'stripe' ? C.primary : '#64748B'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.gatewayName}>Card (Stripe)</Text>
                  <Text style={styles.gatewayDesc}>Accepts major cards (Visa, Mastercard, Amex)</Text>
                </View>
                <View style={[styles.radio, paymentMethod === 'stripe' && styles.radioActive]} />
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

      <StripeCheckoutModal
        visible={!!checkoutSession}
        checkoutUrl={checkoutSession?.url}
        onSuccess={handleCheckoutSuccess}
        onCancel={handleCheckoutCancel}
        title="Secure Payment"
      />

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
