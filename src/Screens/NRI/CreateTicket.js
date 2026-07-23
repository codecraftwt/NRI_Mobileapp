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
  Platform,
  PermissionsAndroid,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useStates } from '../../Hooks/useStates';
import { useDistricts } from '../../Hooks/useDistricts';
import { useTalukas } from '../../Hooks/useTalukas';
import { useServiceCategories } from '../../Hooks/useServiceCategories';
import { usePriorities } from '../../Hooks/usePriorities';
import { useServicesByCategory } from '../../Hooks/useServicesByCategory';
import { useServiceGroups } from '../../Hooks/useServiceGroups';
import { useServiceSubscription } from '../../Hooks/useServiceSubscription';
import { useTicketBooking } from '../../Hooks/useTicketBooking';
import { useMembership } from '../../Hooks/useMembership';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useProperties } from '../../Hooks/useProperties';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const NO_PROPERTY = 'Not applicable';
const ONE_TIME = 'One-Time Request';
const RECURRING = 'Recurring Subscription';
const REQUEST_TYPES = [ONE_TIME, RECURRING];
// Standard GST rate used for the instant local estimate (shown before a state
// is picked). The server quote returns the authoritative gst_rate/gst_amount
// once state_id is available and takes over from this estimate.
const GST_RATE = 0.18;
// International gateways offered for ticket/subscription checkout.
const PAYMENT_METHODS = [
  { key: 'stripe', label: 'Stripe', desc: 'Credit / Debit Card', icon: 'credit-card' },
  { key: 'paypal', label: 'PayPal', desc: 'Pay with your PayPal account', icon: 'account-balance-wallet' },
];

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
// Matches the family member API's `relationship` enum (parent/sibling/spouse/child/other).
const RELATION_OPTIONS = ['Parent', 'Sibling', 'Spouse', 'Child', 'Other'];

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

// A single required-document field: label + description + a web-style
// "Choose File / No file chosen" row, plus a preview pill once a file is
// picked. Used for the recurring-subscription Required Documents section.
function DocumentUploadField({ document, file, onChoose, onRemove }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.docLabel}>
        {document.name}
        {document.required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {!!document.description && <Text style={styles.docDesc}>{document.description}</Text>}

      <View style={styles.docInputRow}>
        <TouchableOpacity style={styles.docChooseBtn} onPress={onChoose} activeOpacity={0.7}>
          <Text style={styles.docChooseBtnText}>Choose File</Text>
        </TouchableOpacity>
        <Text style={styles.docFileName} numberOfLines={1}>
          {file ? file.name : 'No file chosen'}
        </Text>
      </View>

      {!!file && (
        <View style={styles.filePill}>
          <Icon name={file.type?.includes('pdf') ? 'picture-as-pdf' : 'image'} size={14} color="#3298D4" />
          <Text style={styles.filePillText} numberOfLines={1}>{file.name}</Text>
          <TouchableOpacity onPress={onRemove} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function CreateTicket({ route, navigation }) {
  const [requestType, setRequestType] = useState(route.params?.requestType === 'recurring' ? RECURRING : ONE_TIME);
  const [serviceCategory, setServiceCategory] = useState(route.params?.initialCategory || '');
  const [selectedBaseServiceIds, setSelectedBaseServiceIds] = useState(route.params?.initialBaseServiceIds || []);
  const [selectedAddonIds, setSelectedAddonIds] = useState(route.params?.initialAddons || []);
  const [selectedSubscriptionIds, setSelectedSubscriptionIds] = useState(route.params?.initialSubscriptionServiceIds || []);
  const [documentFiles, setDocumentFiles] = useState({}); // { [requiredDocId]: file }
  const isRecurring = requestType === RECURRING;
  // The selected one-time priority tier's slug (posted as `urgency`). Defaults
  // to 'standard' so quotes work before the /priorities list loads; corrected
  // to the API's default tier once available.
  const [prioritySlug, setPrioritySlug] = useState('standard');
  const [fullName, setFullName] = useState('');
  const [relation, setRelation] = useState('');
  const [property, setProperty] = useState(NO_PROPERTY);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [taluka, setTaluka] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredDate, setPreferredDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);
  const [files, setFiles] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [showCouponsModal, setShowCouponsModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('stripe'); // 'stripe' | 'paypal'
  // While the hosted-checkout WebView (Stripe/PayPal) is open:
  // { url, paymentId?, kind, successTitle, successMessage }
  const [checkoutSession, setCheckoutSession] = useState(null);
  const { showAlert, alertProps } = useAppAlert();

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  // The districts endpoint is what actually returns city-level data for this
  // backend (same fix as AddFamilyMember.js) — there's no separate District
  // picker in this form, so its results are surfaced directly as "City".
  const { districts: cities, districtNames: cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useDistricts(state);
  const { talukas, talukaNames, loading: loadingTalukas, failed: talukasFailed, retry: retryTalukas } = useTalukas(city, '');
  const { categoryNames, loading: loadingCategories, failed: categoriesFailed, retry: retryCategories } = useServiceCategories();
  const { priorities, loading: prioritiesLoading, failed: prioritiesFailed, retry: retryPriorities } = usePriorities();
  const { members: familyMembers, create: createFamilyMember } = useFamilyMembers();
  const { properties } = useProperties();
  const { loading: loadingPincodeLookup, lookup: lookupPincode } = usePostalCodeLookup();
  const { membership, usage } = useMembership();
  const user = useSelector(s => s.user.user);
  const {
    services: baseServices,
    loading: loadingBaseServices,
    failed: baseServicesFailed,
    retry: retryBaseServices,
  } = useServicesByCategory(serviceCategory, state, { type: 'base' });
  const {
    services: addonServices,
    loading: loadingAddonServices,
    failed: addonServicesFailed,
    retry: retryAddonServices,
  } = useServicesByCategory(serviceCategory, state, { type: 'addon' });

  // Recurring services for the subscription flow (Service.allows_recurring).
  const { recurring: recurringServices, loading: loadingRecurring } = useServiceGroups(serviceCategory, state);
  const {
    requiredDocuments: subRequiredDocuments,
    fetchRequiredDocuments: fetchSubRequiredDocuments,
    clearRequiredDocuments: clearSubRequiredDocuments,
    createLoading: subscribeLoading,
    createSubscription,
    reset: resetSubscription,
  } = useServiceSubscription();

  const {
    quote,
    quoteLoading,
    fetchQuote,
    coupons,
    couponsLoading,
    fetchCoupons,
    appliedCoupon,
    couponApplyLoading,
    applyCoupon,
    clearCoupon,
    requiredDocuments: ticketRequiredDocuments,
    fetchRequiredDocuments: fetchTicketRequiredDocs,
    clearRequiredDocuments: clearTicketRequiredDocs,
    submitLoading,
    submitTicket,
    payLoading,
    payForTicket,
    verifyLoading,
    verifyPayment,
    reset: resetBooking,
  } = useTicketBooking();

  // Required documents come from a different endpoint per mode: the
  // subscription flow for recurring, the ticket flow for one-time. Both feed
  // the same `documentFiles` state and the same Required Documents UI below.
  const requiredDocuments = isRecurring ? subRequiredDocuments : ticketRequiredDocuments;

  const stateId = state ? states.find(s => s.name === state)?.id : null;
  const cityId = city ? cities.find(c => c.name === city)?.id : null;
  const talukaId = taluka ? talukas.find(t => t.name === taluka)?.id : null;
  const propertyId = property !== NO_PROPERTY ? properties.find(p => p.nickname === property)?.id : null;
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


  // The emergency tier isn't offered for services that don't allow it.
  const emergencyAllowed = !selectedService || selectedService.allowsEmergency;
  const availablePriorities = priorities.filter(p => emergencyAllowed || p.slug !== 'emergency');

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
    if (selectedBaseServiceIds.length === 0 || !stateId) return;
    fetchQuote({
      serviceId: selectedBaseServiceIds[0],
      extraServices: selectedBaseServiceIds.slice(1),
      addons: selectedAddonIds,
      stateId,
      urgency: prioritySlug || 'standard',
      couponCode: appliedCoupon?.code,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseServiceIdsKey, addonIdsKey, stateId, prioritySlug, appliedCoupon?.code]);

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

  // Service line items for the server-quote view. Some quotes come back with an
  // empty `lines` array (only totals + GST), which would hide the service
  // price — fall back to the selected base services so price + GST always show.
  const quoteLines = quote?.lines?.length
    ? quote.lines
    : selectedBaseServicesList.map(s => ({ serviceId: s.id, name: s.name, customerPrice: s.pricing?.customerPrice || 0 }));

  // --- Recurring subscription selection ---
  const selectedSubscriptionServices = recurringServices.filter(s => selectedSubscriptionIds.includes(s.id));
  const subscriptionMonthlyTotal = selectedSubscriptionServices.reduce((sum, s) => sum + (s.pricing?.customerPrice || 0), 0);
  const subscriptionIdsKey = selectedSubscriptionIds.join(',');

  // Which documents the current subscription selection requires — refreshed
  // whenever the selected recurring services change (empty = none required).
  useEffect(() => {
    if (!isRecurring || selectedSubscriptionIds.length === 0) {
      clearSubRequiredDocuments();
      return;
    }
    fetchSubRequiredDocuments(selectedSubscriptionIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecurring, subscriptionIdsKey]);

  // Which documents the current one-time selection requires — refreshed
  // whenever the selected base services change (empty = none required).
  useEffect(() => {
    if (isRecurring || selectedBaseServiceIds.length === 0) {
      clearTicketRequiredDocs();
      return;
    }
    fetchTicketRequiredDocs(selectedBaseServiceIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecurring, baseServiceIdsKey]);

  const formattedDate = preferredDate
    ? preferredDate.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const missingRequiredDoc = requiredDocuments.some(d => d.required && !documentFiles[d.id]);

  const isValid = isRecurring
    ? (serviceCategory && selectedSubscriptionIds.length > 0
        && fullName.trim().length > 0 && relation && state
        && fullAddress.trim().length > 0 && !missingRequiredDoc)
    : (serviceCategory && selectedBaseServiceIds.length > 0 && !!prioritySlug
        && fullName.trim().length > 0 && relation && state
        && fullAddress.trim().length > 0 && pincode.trim().length > 0
        && !missingRequiredDoc);

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
        if (match.talukaName) setTaluka(match.talukaName);
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
    setDocumentFiles({});
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
    setDocumentFiles({});
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
    applyCoupon({ code: couponCode.trim(), addons: selectedAddonIds, stateId })
      .unwrap()
      .then((result) => {
        Alert.alert('Coupon Applied', `Code ${result.code} applied — you save ${formatUsdAmount(result.discount)}.`);
      })
      .catch((error) => {
        Alert.alert('Invalid Coupon', error?.message || 'This coupon could not be applied.');
      });
  };

  const handleViewCoupons = () => {
    fetchCoupons({ addons: selectedAddonIds, stateId });
    setShowCouponsModal(true);
  };

  const handlePickCoupon = (coupon) => {
    if (!coupon.eligible) return;
    setCouponCode(coupon.code);
    setShowCouponsModal(false);
    applyCoupon({ code: coupon.code, addons: selectedAddonIds, stateId })
      .unwrap()
      .then((result) => {
        Alert.alert('Coupon Applied', `Code ${result.code} applied — you save ${formatUsdAmount(result.discount)}.`);
      })
      .catch((error) => {
        Alert.alert('Invalid Coupon', error?.message || 'This coupon could not be applied.');
      });
  };

  const requestFilePermission = async () => {
    if (Platform.OS !== 'android') return true;
    const permission = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;

    const result = await PermissionsAndroid.request(permission, {
      title: 'Allow Photo & Document Access',
      message: 'NRI Circle needs access to your photos and documents so you can attach them to a service request.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Required',
        'Photo & document access is blocked. Please enable it from app settings to attach files.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
    } else {
      Alert.alert('Permission Denied', 'Photo & document access is required to attach files.');
    }
    return false;
  };

  const handleChooseFiles = async () => {
    if (files.length >= MAX_FILES) {
      Alert.alert('Limit Reached', `You can attach up to ${MAX_FILES} files.`);
      return;
    }

    const allowed = await requestFilePermission();
    if (!allowed) return;

    try {
      const results = await pick({
        type: [docTypes.images, docTypes.pdf],
        allowMultiSelection: true,
        copyTo: 'cachesDirectory',
      });

      const remainingSlots = MAX_FILES - files.length;
      const tooMany = results.length > remainingSlots;
      const candidates = results.slice(0, remainingSlots);

      const oversized = candidates.filter(f => f.size && f.size > MAX_FILE_SIZE_BYTES);
      const accepted = candidates.filter(f => !f.size || f.size <= MAX_FILE_SIZE_BYTES);

      if (accepted.length > 0) {
        setFiles(prev => [
          ...prev,
          ...accepted.map(f => ({ name: f.name, uri: f.fileCopyUri || f.uri, type: f.type, size: f.size })),
        ]);
      }

      if (oversized.length > 0) {
        Alert.alert('File Too Large', `${oversized.length} file(s) were skipped because they exceed 5 MB.`);
      } else if (tooMany) {
        Alert.alert('Limit Reached', `Only the first ${remainingSlots} file(s) were added (max ${MAX_FILES} total).`);
      }
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', 'Could not select the file(s). Please try again.');
    }
  };

  const handleRemoveFile = (uri) => {
    setFiles(prev => prev.filter(f => f.uri !== uri));
  };

  // Single-file picker for a specific required subscription document.
  const handleChooseDocument = async (docId) => {
    const allowed = await requestFilePermission();
    if (!allowed) return;
    try {
      const results = await pick({
        type: [docTypes.images, docTypes.pdf],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });
      const picked = results[0];
      if (!picked) return;
      if (picked.size && picked.size > MAX_FILE_SIZE_BYTES) {
        Alert.alert('File Too Large', 'Please choose a file under 5 MB.');
        return;
      }
      setDocumentFiles(prev => ({
        ...prev,
        [docId]: { name: picked.name, uri: picked.fileCopyUri || picked.uri, type: picked.type, size: picked.size },
      }));
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', 'Could not select the file. Please try again.');
    }
  };

  const handleRemoveDocument = (docId) => {
    setDocumentFiles(prev => {
      const next = { ...prev };
      delete next[docId];
      return next;
    });
  };

  // Android's native picker has no combined "datetime" mode — a single
  // `mode="datetime"` component crashes there ("Cannot read property
  // 'dismiss' of undefined") because it tries to chain two native pickers
  // internally without properly wiring up dismissal. iOS's spinner display
  // does support "datetime" in one step, so only Android needs the
  // date-then-time flow.
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
    if (event.type === 'dismissed' || !selected || !pendingDate) {
      setPendingDate(null);
      return;
    }
    const combined = new Date(pendingDate);
    combined.setHours(selected.getHours(), selected.getMinutes());
    setPreferredDate(combined);
    setPendingDate(null);
  };

  // After a successful booking/payment, land on the main Services page (the
  // Services tab's list), not just the previous screen.
  const goToServices = () => navigation.navigate('Services', { screen: 'ServicesMain' });

  const handleGatewayPayment = async (ticketId, gateway) => {
    try {
      const result = await payForTicket({ ticketId, gateway }).unwrap();

      if (result.checkoutUrl) {
        // Stripe / PayPal hosted checkout — open in the in-app WebView; verified
        // in handleCheckoutSuccess once it redirects back with a session_id.
        setCheckoutSession({
          url: result.checkoutUrl,
          paymentId: result.paymentId,
          kind: 'ticket',
          successTitle: 'Payment Successful',
          successMessage: 'Your service request has been paid and confirmed.',
        });
      } else {
        showAlert('Payment Confirmed', result.message || 'Your service request has been paid.', [
          { text: 'OK', onPress: goToServices },
        ]);
      }
    } catch (error) {
      showAlert(
        'Payment Failed',
        error?.message || 'Could not complete payment. Your request has been saved — you can pay from My Tickets.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  // Called once the hosted-checkout WebView (Stripe/PayPal) redirects back with
  // a session_id. Tickets carry a payment_id we confirm via /payments/verify;
  // subscriptions are activated server-side by webhook, so there's nothing to
  // verify client-side — we just acknowledge and leave.
  const handleCheckoutSuccess = async (sessionId) => {
    const session = checkoutSession;
    setCheckoutSession(null);
    const onOk = () => {
      if (session?.kind === 'subscription') resetSubscription();
      goToServices();
    };
    try {
      if (session?.paymentId) {
        await verifyPayment({ paymentId: session.paymentId, sessionId }).unwrap();
      }
      showAlert(session?.successTitle || 'Payment Successful', session?.successMessage || 'Your payment has been confirmed.', [
        { text: 'OK', onPress: onOk },
      ]);
    } catch (error) {
      showAlert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
    }
  };

  const handleCheckoutCancel = () => setCheckoutSession(null);

  // The ticket API only accepts an existing family_member_id, not raw
  // name/relation — reuse a matching saved member if one exists (avoids
  // creating a duplicate on repeat submissions for the same person),
  // otherwise create one on the fly from what was typed here.
  const resolveFamilyMemberId = async () => {
    const name = fullName.trim();
    const relationship = relation.toLowerCase();
    const existing = familyMembers.find(
      m => m.name.trim().toLowerCase() === name.toLowerCase() && m.relationship === relationship
    );
    if (existing) return existing.id;
    const created = await createFamilyMember({ name, relationship }).unwrap();
    return created.id;
  };

  const submitSubscription = async (gateway) => {
    if (!isValid) return;
    try {
      const familyMemberId = await resolveFamilyMemberId();
      const address = pincode.trim() ? `${fullAddress.trim()} - ${pincode.trim()}` : fullAddress.trim();
      const result = await createSubscription({
        serviceIds: selectedSubscriptionIds,
        gateway,
        familyMemberId,
        propertyId,
        stateId,
        cityId,
        talukaId,
        address,
        customerNotes: notes,
        documents: documentFiles,
      }).unwrap();

      if (result.checkoutUrl) {
        // Open the hosted checkout (Stripe/PayPal) in the in-app WebView. The
        // subscription is activated server-side by webhook on completion, so
        // there's no client-side payment_id to verify here.
        setCheckoutSession({
          url: result.checkoutUrl,
          kind: 'subscription',
          successTitle: 'Subscription Created',
          successMessage: 'Your recurring subscription is now being activated.',
        });
      } else {
        showAlert('Subscription Created', result.message || 'Your recurring subscription has been created.', [
          { text: 'OK', onPress: () => { resetSubscription(); goToServices(); } },
        ]);
      }
    } catch (error) {
      showAlert('Subscription Failed', error?.message || 'Could not create your subscription. Please try again.');
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
      const familyMemberId = await resolveFamilyMemberId();
      // No dedicated pincode field on the ticket API — fold it into the
      // free-text address the way a written Indian address would include it.
      const address = pincode.trim() ? `${fullAddress.trim()} - ${pincode.trim()}` : fullAddress.trim();
      const result = await submitTicket({
        serviceId: selectedBaseServiceIds[0],
        extraServices: selectedBaseServiceIds.slice(1),
        addons: selectedAddonIds,
        couponCode: appliedCoupon?.code,
        familyMemberId,
        propertyId,
        stateId,
        cityId,
        talukaId,
        address,
        urgency: prioritySlug || 'standard',
        preferredDate: preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined,
        customerNotes: notes,
        files,
        documents: documentFiles,
      }).unwrap();

      if (result.paymentRequired) {
        // The payment method was already chosen on the form — go straight to
        // that gateway's checkout instead of asking again.
        handleGatewayPayment(result.ticket.id, paymentMethod);
      } else {
        showAlert('Request Submitted', `Your request ${result.ticket.ticketNumber} has been submitted.`, [
          { text: 'OK', onPress: goToServices },
        ]);
      }
    } catch (error) {
      showAlert('Submission Failed', error?.message || 'Could not submit your request. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={18} color="#20304C" style={{ marginLeft: 6 }} />
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

        {/* Only render when documents are actually required — services with no
            required documents show nothing at all (no loader, no empty text). */}
        {requiredDocuments.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Required Documents</Text>
            <View style={styles.card}>
              {requiredDocuments.map(doc => (
                <DocumentUploadField
                  key={doc.id}
                  document={doc}
                  file={documentFiles[doc.id]}
                  onChoose={() => handleChooseDocument(doc.id)}
                  onRemove={() => handleRemoveDocument(doc.id)}
                />
              ))}
              <Text style={styles.hint}>JPG, PNG or PDF, max 5 MB each.</Text>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Who / Where</Text>
        <View style={styles.card}>
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Full Name<Text style={styles.required}> *</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="Who is this request for?"
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          <SelectField
            label="Relation"
            required
            value={relation}
            placeholder="Select..."
            options={RELATION_OPTIONS}
            onSelect={setRelation}
          />
          <SelectField
            label="Property (optional)"
            value={property}
            placeholder="Select property..."
            options={[NO_PROPERTY, ...properties.map(p => p.nickname)]}
            onSelect={setProperty}
          />
          <SelectField
            label="State"
            required
            value={state}
            placeholder="Select state..."
            options={stateNames}
            onSelect={(v) => {
              setState(v);
              setCity('');
              setTaluka('');
            }}
            loading={loadingStates}
          />
          {statesFailed && (
            <TouchableOpacity onPress={retryStates}>
              <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <SelectField
            label="City / District"
            value={city}
            placeholder="Select state first..."
            options={cityNames}
            disabled={!state}
            loading={loadingCities}
            onSelect={(v) => {
              setCity(v);
              setTaluka('');
            }}
          />
          {citiesFailed && (
            <TouchableOpacity onPress={retryCities}>
              <Text style={styles.retryText}>Couldn't load cities. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <SelectField
            label="Taluka"
            value={taluka}
            placeholder="Select city first..."
            options={talukaNames}
            disabled={!city}
            loading={loadingTalukas}
            onSelect={setTaluka}
          />
          {talukasFailed && (
            <TouchableOpacity onPress={retryTalukas}>
              <Text style={styles.retryText}>Couldn't load talukas. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Full Address<Text style={styles.required}> *</Text></Text>
            <TextInput
              style={styles.textArea}
              placeholder="House/flat no., street, landmark..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={fullAddress}
              onChangeText={setFullAddress}
            />
          </View>

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

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Preferred Date & Time</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setShowDatePicker(true)}>
              <Text style={[styles.selectText, !formattedDate && styles.placeholderText]}>
                {formattedDate || 'dd-mm-yyyy --:--'}
              </Text>
              <Icon name="event" size={18} color="#666" />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={preferredDate || new Date()}
                mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
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
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Additional Notes</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Any specific requirements, access instructions, etc."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Photos / Documents <Text style={styles.hint}>(optional, up to {MAX_FILES})</Text></Text>
            <View style={styles.fileRow}>
              <TouchableOpacity
                style={[styles.chooseFileBtn, files.length >= MAX_FILES && styles.chooseFileBtnDisabled]}
                disabled={files.length >= MAX_FILES}
                onPress={handleChooseFiles}
              >
                <Icon name="attach-file" size={16} color={files.length >= MAX_FILES ? '#9CA3AF' : '#3298D4'} />
                <Text style={[styles.chooseFileText, files.length >= MAX_FILES && { color: '#9CA3AF' }]}>Choose Files</Text>
              </TouchableOpacity>
              {files.length === 0 && <Text style={styles.noFileText}>No file chosen</Text>}
            </View>

            {files.map(f => (
              <View key={f.uri} style={styles.filePill}>
                <Icon name={f.type?.includes('pdf') ? 'picture-as-pdf' : 'image'} size={14} color="#3298D4" />
                <Text style={styles.filePillText} numberOfLines={1}>{f.name}</Text>
                <TouchableOpacity onPress={() => handleRemoveFile(f.uri)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.hint}>JPG, PNG or PDF, max 5 MB each.</Text>
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
              {quote.gstAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{formatGstLabel(quote.gstRate)}</Text>
                  <Text style={styles.priceValue}>+{formatUsdAmount(quote.gstAmount)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatUsdAmount(quote.totalAmount)}</Text>
              </View>
            </>
          ) : quoteLoading && stateId ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#3298D4" />
              <Text style={styles.hint}>Calculating…</Text>
            </View>
          ) : selectedAddonServices.length > 0 || localBasePrice > 0 || prioritySurcharge > 0 ? (
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
          ) : (
            <Text style={styles.hint}>Choose add-ons to see pricing.</Text>
          )}

          {(isRecurring ? selectedSubscriptionIds.length > 0 : selectedBaseServiceIds.length > 0) && (
            <>
              <Text style={styles.paymentMethodLabel}>Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                {PAYMENT_METHODS.map(m => {
                  const active = paymentMethod === m.key;
                  return (
                    <TouchableOpacity
                      key={m.key}
                      style={[styles.paymentOption, active && styles.paymentOptionActive]}
                      onPress={() => setPaymentMethod(m.key)}
                      activeOpacity={0.7}
                    >
                      <Icon name={m.icon} size={20} color={active ? '#D94625' : '#94A3B8'} />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.paymentOptionText, active && styles.paymentOptionTextActive]}>{m.label}</Text>
                        <Text style={styles.paymentOptionDesc}>{m.desc}</Text>
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
            {isRecurring
              ? 'Your subscription activates once payment is confirmed.'
              : 'Final amount is confirmed after your request is reviewed.'}
          </Text>

          <TouchableOpacity
            style={[styles.submitBtn, (!isValid || submitLoading || payLoading || verifyLoading || subscribeLoading) && styles.submitBtnDisabled]}
            disabled={!isValid || submitLoading || payLoading || verifyLoading || subscribeLoading}
            onPress={handleSubmit}
          >
            {submitLoading || payLoading || verifyLoading || subscribeLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>{isRecurring ? 'Subscribe' : 'Submit Request'}</Text>
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
            {couponsLoading ? (
              <View style={[styles.inlineLoading, { padding: 16 }]}>
                <ActivityIndicator size="small" color="#3298D4" />
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
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.couponCodeText, !item.eligible && styles.couponIneligibleText]}>
                        {item.code} · {item.valueLabel}
                      </Text>
                      {!!item.description && <Text style={styles.couponDescText}>{item.description}</Text>}
                      {!item.eligible && !!item.reason && <Text style={styles.couponReasonText}>{item.reason}</Text>}
                    </View>
                    {item.eligible && <Icon name="chevron-right" size={20} color="#3298D4" />}
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
    paddingTop: 40,
    paddingBottom: 16,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    marginTop: 12,
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
