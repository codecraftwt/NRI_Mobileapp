import React, { useState, useEffect, useRef } from 'react';
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
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useStates } from '../../Hooks/useStates';
import { useDistricts } from '../../Hooks/useDistricts';
import { useTalukas } from '../../Hooks/useTalukas';
import { useServiceCategories } from '../../Hooks/useServiceCategories';
import { useServicesByCategory } from '../../Hooks/useServicesByCategory';
import { useTicketBooking } from '../../Hooks/useTicketBooking';
import { useMembership } from '../../Hooks/useMembership';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useProperties } from '../../Hooks/useProperties';
import { openRazorpayCheckout, openStripeCheckout, extractStripeSessionId } from '../../Utils/paymentGateway';

const MAX_FILES = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const NO_FAMILY_MEMBER = 'Myself / Not applicable';
const NO_PROPERTY = 'Not applicable';
const PRIORITY_OPTIONS = ['Standard', 'Express', 'Emergency'];
const PRIORITY_TO_URGENCY = { Standard: 'standard', Express: 'express', Emergency: 'emergency' };

function SelectField({ label, required, value, placeholder, options, disabled, loading, onSelect, onClose }) {
  const [open, setOpen] = useState(false);

  // Opening/closing this Modal makes Android relayout the screen behind it
  // (the app runs with windowSoftInputMode="adjustResize"), which resets the
  // outer ScrollView's scroll offset to the top — jarring when picking
  // State (or any field) mid-scroll. `onClose` lets the parent restore the
  // scroll position it had before this picker opened.
  const close = () => {
    setOpen(false);
    onClose?.();
  };

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

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={close}>
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
                    close();
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

// Bottom sheet for the Submit Request result flow (Payment Required, Request
// Submitted, Payment Successful/Failed, etc.) — styled like Profile.js's
// "Update Profile Photo" sheet (slide up, rounded top corners, handle bar)
// rather than a plain native Alert.
function SubmitResultSheet({ visible, title, message, buttons, onRequestClose, onButtonPress }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onRequestClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onRequestClose}>
        <TouchableOpacity activeOpacity={1} style={styles.resultSheet} onPress={() => {}}>
          <View style={styles.resultSheetHandle} />
          {!!title && <Text style={styles.resultSheetTitle}>{title}</Text>}
          {!!message && <Text style={styles.resultSheetMessage}>{message}</Text>}
          <View style={styles.resultSheetButtons}>
            {(buttons || []).map((btn, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.resultSheetBtn,
                  btn.style === 'cancel' && styles.resultSheetBtnCancel,
                  btn.style === 'destructive' && styles.resultSheetBtnDestructive,
                ]}
                activeOpacity={0.75}
                onPress={() => onButtonPress(btn)}
              >
                <Text
                  style={[
                    styles.resultSheetBtnText,
                    btn.style === 'cancel' && styles.resultSheetBtnTextCancel,
                    btn.style === 'destructive' && styles.resultSheetBtnTextDestructive,
                  ]}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function CreateTicket({ navigation }) {
  const [serviceCategory, setServiceCategory] = useState('');
  const [selectedBaseServiceId, setSelectedBaseServiceId] = useState(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [priority, setPriority] = useState('Standard');
  const [familyMember, setFamilyMember] = useState(NO_FAMILY_MEMBER);
  const [property, setProperty] = useState(NO_PROPERTY);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [taluka, setTaluka] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [preferredDate, setPreferredDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [files, setFiles] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [showCouponsModal, setShowCouponsModal] = useState(false);

  const scrollRef = useRef(null);
  const scrollYRef = useRef(0);
  const restoreScroll = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: scrollYRef.current, animated: false });
    });
  };

  const [resultSheet, setResultSheet] = useState(null);
  const showResult = (title, message, buttons) => {
    setResultSheet({ title, message, buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }] });
  };
  const closeResultSheet = () => setResultSheet(null);
  const handleResultButtonPress = (btn) => {
    closeResultSheet();
    btn.onPress?.();
  };

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  // The districts endpoint is what actually returns city-level data for this
  // backend (same fix as AddFamilyMember.js) — there's no separate District
  // picker in this form, so its results are surfaced directly as "City".
  const { districts: cities, districtNames: cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useDistricts(state);
  const { talukas, talukaNames, loading: loadingTalukas, failed: talukasFailed, retry: retryTalukas } = useTalukas(city, '');
  const { categoryNames, loading: loadingCategories, failed: categoriesFailed, retry: retryCategories } = useServiceCategories();
  const { members: familyMembers } = useFamilyMembers();
  const { properties } = useProperties();
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
    submitLoading,
    submitTicket,
    payLoading,
    payForTicket,
    verifyLoading,
    verifyPayment,
    reset: resetBooking,
  } = useTicketBooking();

  const stateId = state ? states.find(s => s.name === state)?.id : null;
  const cityId = city ? cities.find(c => c.name === city)?.id : null;
  const talukaId = taluka ? talukas.find(t => t.name === taluka)?.id : null;
  const familyMemberId = familyMember !== NO_FAMILY_MEMBER ? familyMembers.find(m => m.name === familyMember)?.id : null;
  const propertyId = property !== NO_PROPERTY ? properties.find(p => p.nickname === property)?.id : null;
  const selectedService = baseServices.find(s => s.id === selectedBaseServiceId) || null;

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
  // user can still tap a different card when a category offers more than one.
  useEffect(() => {
    if (!selectedBaseServiceId && baseServices.length > 0) {
      setSelectedBaseServiceId(baseServices[0].id);
    }
  }, [baseServices, selectedBaseServiceId]);

  // Reset an Emergency selection that's no longer valid for the chosen service.
  useEffect(() => {
    if (priority === 'Emergency' && selectedService && !selectedService.allowsEmergency) {
      setPriority('Standard');
    }
  }, [selectedService, priority]);

  const priorityOptions = selectedService && !selectedService.allowsEmergency
    ? ['Standard', 'Express']
    : PRIORITY_OPTIONS;

  const addonIdsKey = selectedAddonIds.join(',');

  // Re-quote from the server any time the booking selection changes —
  // pricing (plan overage, express surcharge, coupon discount) is computed
  // server-side, not re-derived here.
  useEffect(() => {
    if (!selectedBaseServiceId || !stateId) return;
    fetchQuote({
      serviceId: selectedBaseServiceId,
      extraServices: [],
      addons: selectedAddonIds,
      stateId,
      urgency: PRIORITY_TO_URGENCY[priority],
      couponCode: appliedCoupon?.code,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBaseServiceId, addonIdsKey, stateId, priority, appliedCoupon?.code]);

  // The server quote needs a state (the API 422s without state_id), which
  // sits further down the form than the add-on checkboxes. So the panel
  // doesn't sit blank while the user is still picking add-ons, compute an
  // instant local estimate from the already-fetched addon prices — the
  // authoritative `quote` (handles plan overage/express surcharge/coupon)
  // takes over as soon as it's available.
  const selectedAddonServices = addonServices.filter(s => selectedAddonIds.includes(s.id));
  const localAddonsSubtotal = selectedAddonServices.reduce((sum, s) => sum + (s.pricing?.customerPrice || 0), 0);
  const localBasePrice = selectedService?.pricing?.customerPrice || 0;
  const localTotal = localBasePrice + localAddonsSubtotal;

  const formattedDate = preferredDate
    ? preferredDate.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const isValid = serviceCategory && selectedBaseServiceId && state && city && fullAddress.trim().length > 0;

  const handleSelectCategory = (v) => {
    setServiceCategory(v);
    setSelectedBaseServiceId(null);
    setSelectedAddonIds([]);
    setCouponCode('');
    clearCoupon();
    resetBooking();
  };

  const toggleAddon = (id) => {
    setSelectedAddonIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) return;
    applyCoupon({ code: couponCode.trim(), addons: selectedAddonIds, stateId })
      .unwrap()
      .then((result) => {
        Alert.alert('Coupon Applied', `Code ${result.code} applied — you save ₹${result.discount.toLocaleString('en-IN')}.`);
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
        Alert.alert('Coupon Applied', `Code ${result.code} applied — you save ₹${result.discount.toLocaleString('en-IN')}.`);
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

  // The ticket is already created server-side by the time any of these
  // outcomes fire (submitTicket() below does a single atomic POST that
  // creates it regardless of payment status) — declining/failing payment
  // never deletes it, it just stays unpaid. Landing on its detail page
  // (instead of just goBack()) is what actually proves that to the user;
  // goBack() alone dumps them back on whatever screen opened this form with
  // no visible confirmation, which reads as "the request wasn't added."
  const goToTicket = (ticketId) => navigation.replace('TicketDetail', { ticketId });

  const handleGatewayPayment = async (ticketId, gateway) => {
    try {
      const result = await payForTicket({ ticketId, gateway }).unwrap();

      if (result.order) {
        const rzpResult = await openRazorpayCheckout({
          order: result.order,
          name: 'NRI Circle',
          description: `${selectedService?.name || 'Service Request'} Payment`,
          user,
        });
        await verifyPayment({
          paymentId: result.paymentId,
          razorpayOrderId: rzpResult.razorpayOrderId,
          razorpayPaymentId: rzpResult.razorpayPaymentId,
          razorpaySignature: rzpResult.razorpaySignature,
        }).unwrap();
        showResult('Payment Successful', 'Your service request has been paid and confirmed.', [
          { text: 'View Request', onPress: () => goToTicket(ticketId) },
        ]);
      } else if (result.checkoutUrl) {
        openStripeCheckout(result.checkoutUrl);
        showResult(
          'Complete Payment',
          'Complete your payment in the browser, then come back and tap "I\'ve Paid" to confirm.',
          [
            { text: 'Pay Later', style: 'cancel', onPress: () => goToTicket(ticketId) },
            {
              text: "I've Paid",
              onPress: () => {
                const sessionId = extractStripeSessionId(result.checkoutUrl);
                verifyPayment({ paymentId: result.paymentId, sessionId })
                  .unwrap()
                  .then(() => {
                    showResult('Payment Successful', 'Your service request has been paid and confirmed.', [
                      { text: 'View Request', onPress: () => goToTicket(ticketId) },
                    ]);
                  })
                  .catch((error) => {
                    showResult(
                      'Verification Failed',
                      error?.message || 'Could not verify this payment yet. Please try again in a moment.',
                      [{ text: 'View Request', onPress: () => goToTicket(ticketId) }]
                    );
                  });
              },
            },
          ]
        );
      } else {
        showResult('Payment Confirmed', result.message || 'Your service request has been paid.', [
          { text: 'View Request', onPress: () => goToTicket(ticketId) },
        ]);
      }
    } catch (error) {
      showResult(
        'Payment Failed',
        error?.message || 'Could not complete payment. Your request has been saved — you can pay from My Tickets.',
        [{ text: 'View Request', onPress: () => goToTicket(ticketId) }]
      );
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      const result = await submitTicket({
        serviceId: selectedBaseServiceId,
        extraServices: [],
        addons: selectedAddonIds,
        couponCode: appliedCoupon?.code,
        familyMemberId,
        propertyId,
        stateId,
        cityId,
        talukaId,
        address: fullAddress,
        urgency: PRIORITY_TO_URGENCY[priority],
        preferredDate: preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined,
        customerNotes: notes,
        files,
      }).unwrap();

      if (result.paymentRequired) {
        showResult(
          'Payment Required',
          `Request ${result.ticket.ticketNumber} needs a payment of ₹${result.amountDue.toLocaleString('en-IN')} to proceed. Choose how you'd like to pay.`,
          [
            { text: 'Pay Later', style: 'cancel', onPress: () => goToTicket(result.ticket.id) },
            { text: 'Pay with Razorpay', onPress: () => handleGatewayPayment(result.ticket.id, 'razorpay') },
            { text: 'Pay with Stripe', onPress: () => handleGatewayPayment(result.ticket.id, 'stripe') },
          ]
        );
      } else {
        showResult('Request Submitted', `Your request ${result.ticket.ticketNumber} has been submitted.`, [
          { text: 'View Request', onPress: () => goToTicket(result.ticket.id) },
        ]);
      }
    } catch (error) {
      showResult('Submission Failed', error?.message || 'Could not submit your request. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Submit a Service Request" showBack />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => { scrollYRef.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
      >
        {membership && usage && (
          <View style={styles.usageBanner}>
            <Icon name="info-outline" size={16} color="#3298D4" />
            <Text style={styles.usageBannerText}>
              You have used <Text style={styles.bold}>{usage.requestsUsed ?? 0}{serviceRequestsLimit != null ? ` of ${serviceRequestsLimit}` : ''}</Text> service requests included in your {membership.planName} plan this month.
              {' '}Parent-care visits used: <Text style={styles.bold}>{usage.visitsUsed ?? 0}{parentCareVisitsLimit != null ? ` of ${parentCareVisitsLimit}` : ''}</Text>.
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>What do you need?</Text>
        <View style={styles.card}>
          <SelectField
            label="Service Category"
            required
            value={serviceCategory}
            placeholder="Select a category..."
            options={categoryNames}
            loading={loadingCategories}
            onSelect={handleSelectCategory}
            onClose={restoreScroll}
          />
          {categoriesFailed && (
            <TouchableOpacity onPress={retryCategories}>
              <Text style={styles.retryText}>Couldn't load categories. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <SelectField
            label="Priority"
            required
            value={priority}
            placeholder="Select priority..."
            options={priorityOptions}
            onSelect={setPriority}
            onClose={restoreScroll}
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
              <View style={{ gap: 8 }}>
                {baseServices.map(s => {
                  const included = !s.pricing || s.pricing.customerPrice === 0;
                  const isSelected = selectedBaseServiceId === s.id;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.serviceRow, isSelected && styles.serviceRowSelected]}
                      onPress={() => setSelectedBaseServiceId(s.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.serviceName}>{s.name}</Text>
                        {!!s.pricing?.turnaroundLabel && <Text style={styles.serviceSub}>{s.pricing.turnaroundLabel}</Text>}
                      </View>
                      {included ? (
                        <View style={styles.includedPill}>
                          <Text style={styles.includedPillText}>Included</Text>
                        </View>
                      ) : (
                        <Text style={styles.servicePrice}>{s.pricing.displayPrice}</Text>
                      )}
                    </TouchableOpacity>
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

          {serviceCategory && (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Optional Add-ons</Text>
              {loadingAddonServices ? (
                <View style={styles.inlineLoading}>
                  <ActivityIndicator size="small" color="#3298D4" />
                  <Text style={styles.hint}>Loading add-ons…</Text>
                </View>
              ) : addonServices.length === 0 ? (
                <Text style={styles.hint}>No add-ons available for this category.</Text>
              ) : (
                <View style={{ gap: 8 }}>
                  {addonServices.map(s => {
                    const isChecked = selectedAddonIds.includes(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[styles.addonRow, isChecked && styles.addonRowSelected]}
                        onPress={() => toggleAddon(s.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.addonCheckbox, isChecked && styles.addonCheckboxChecked]}>
                          {isChecked && <Icon name="check" size={13} color="white" />}
                        </View>
                        <Text style={styles.addonName} numberOfLines={2}>{s.name}</Text>
                        <Text style={styles.servicePrice}>{s.pricing?.displayPrice}</Text>
                      </TouchableOpacity>
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
        </View>

        <Text style={styles.sectionTitle}>Who / Where</Text>
        <View style={styles.card}>
          <SelectField
            label="For Family Member (optional)"
            value={familyMember}
            placeholder="Select family member..."
            options={[NO_FAMILY_MEMBER, ...familyMembers.map(m => m.name)]}
            onSelect={setFamilyMember}
            onClose={restoreScroll}
          />
          <SelectField
            label="Property (optional)"
            value={property}
            placeholder="Select property..."
            options={[NO_PROPERTY, ...properties.map(p => p.nickname)]}
            onSelect={setProperty}
            onClose={restoreScroll}
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
            onClose={restoreScroll}
          />
          {statesFailed && (
            <TouchableOpacity onPress={retryStates}>
              <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <SelectField
            label="City / District"
            required
            value={city}
            placeholder="Select city..."
            options={cityNames}
            disabled={!state}
            loading={loadingCities}
            onSelect={(v) => {
              setCity(v);
              setTaluka('');
            }}
            onClose={restoreScroll}
          />
          {citiesFailed && (
            <TouchableOpacity onPress={retryCities}>
              <Text style={styles.retryText}>Couldn't load cities. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <SelectField
            label="Taluka"
            value={taluka}
            placeholder="Select taluka..."
            options={talukaNames}
            disabled={!city}
            loading={loadingTalukas}
            onSelect={setTaluka}
            onClose={restoreScroll}
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
                mode="datetime"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selected) => {
                  setShowDatePicker(false);
                  if (selected) setPreferredDate(selected);
                }}
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
          <Text style={styles.sectionTitle}>Estimated Charges</Text>
          {!selectedBaseServiceId ? (
            <Text style={styles.hint}>Choose a service to see pricing.</Text>
          ) : quote && stateId ? (
            <>
              {quote.lines.map(line => (
                <View key={line.serviceId} style={[styles.priceRow, styles.priceRowDashed]}>
                  <Text style={styles.priceLabel} numberOfLines={1}>+ {line.name}</Text>
                  <Text style={styles.priceValue}>₹{line.customerPrice.toLocaleString('en-IN')}</Text>
                </View>
              ))}
              {quote.expressSurcharge > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Express surcharge</Text>
                  <Text style={styles.priceValue}>+₹{quote.expressSurcharge.toLocaleString('en-IN')}</Text>
                </View>
              )}
              {quote.discount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, styles.discountText]}>Coupon discount</Text>
                  <Text style={[styles.priceValue, styles.discountText]}>-₹{quote.discount.toLocaleString('en-IN')}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{quote.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
            </>
          ) : quoteLoading && stateId ? (
            <View style={styles.inlineLoading}>
              <ActivityIndicator size="small" color="#3298D4" />
              <Text style={styles.hint}>Calculating…</Text>
            </View>
          ) : selectedAddonServices.length > 0 || localBasePrice > 0 ? (
            <>
              {localBasePrice > 0 && (
                <View style={[styles.priceRow, styles.priceRowDashed]}>
                  <Text style={styles.priceLabel} numberOfLines={1}>+ {selectedService.name}</Text>
                  <Text style={styles.priceValue}>₹{localBasePrice.toLocaleString('en-IN')}</Text>
                </View>
              )}
              {selectedAddonServices.map(s => (
                <View key={s.id} style={[styles.priceRow, styles.priceRowDashed]}>
                  <Text style={styles.priceLabel} numberOfLines={1}>+ {s.name}</Text>
                  <Text style={styles.priceValue}>₹{(s.pricing?.customerPrice || 0).toLocaleString('en-IN')}</Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{localTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              {!stateId && (
                <Text style={styles.hint}>Select your state below to confirm final pricing (incl. any express surcharge).</Text>
              )}
            </>
          ) : (
            <Text style={styles.hint}>Choose add-ons to see pricing.</Text>
          )}

          {!!selectedBaseServiceId && (
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
                <Icon name="local-offer" size={14} color="#7C3AED" />
                <Text style={styles.viewCouponsLink}>View available coupons</Text>
                <Icon name="expand-more" size={16} color="#7C3AED" />
              </TouchableOpacity>
            </>
          )}

          <Text style={[styles.hint, { marginTop: 4 }]}>Final amount is confirmed after your request is reviewed.</Text>

          <TouchableOpacity
            style={[styles.submitBtn, (!isValid || submitLoading || payLoading || verifyLoading) && styles.submitBtnDisabled]}
            disabled={!isValid || submitLoading || payLoading || verifyLoading}
            onPress={handleSubmit}
          >
            {submitLoading || payLoading || verifyLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Submit Request</Text>
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

      <SubmitResultSheet
        visible={!!resultSheet}
        title={resultSheet?.title}
        message={resultSheet?.message}
        buttons={resultSheet?.buttons}
        onRequestClose={closeResultSheet}
        onButtonPress={handleResultButtonPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 60, paddingHorizontal: 16, paddingTop: 12 },
  usageBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#E5F1FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  usageBannerText: { flex: 1, ...typography.small, color: '#3298D4', lineHeight: 20 },
  bold: { fontFamily: typography.labelMedium.fontFamily },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary, marginTop: 8, marginBottom: 12 },
  card: { 
    backgroundColor: colors.surface, 
    padding: 20, 
    borderRadius: 16, 
    gap: 16, 
    marginBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  estimateCard: { 
    backgroundColor: colors.surface, 
    padding: 20, 
    borderRadius: 16, 
    gap: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  priceRowDashed: { paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border, borderStyle: 'dashed' },
  priceLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  priceValue: { ...typography.labelMedium, color: colors.textPrimary },
  discountText: { color: colors.success },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4, borderTopWidth: 2, borderTopColor: colors.surfaceSecondary },
  totalLabel: { ...typography.h4, color: colors.textPrimary },
  totalValue: { ...typography.appTitle, color: colors.textPrimary },
  fieldWrap: { gap: 6 },
  label: { ...typography.labelMedium, color: colors.textPrimary },
  required: { color: colors.error },
  hint: { ...typography.small, color: colors.textPlaceholder },
  inlineLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surfaceMuted,
  },
  selectBoxDisabled: { backgroundColor: colors.surfaceSecondary },
  selectText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  placeholderText: { color: colors.textPlaceholder },
  retryText: { ...typography.small, color: colors.error, fontFamily: typography.labelMedium.fontFamily },
  textArea: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceMuted,
    textAlignVertical: 'top',
    minHeight: 100,
  },

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surfaceMuted,
  },
  serviceRowSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceHighlight },
  serviceName: { ...typography.labelMedium, color: colors.textPrimary },
  serviceSub: { ...typography.small, color: colors.textSecondary, marginTop: 4 },
  servicePrice: { ...typography.labelMedium, color: colors.textPrimary },
  includedPill: { backgroundColor: colors.successBackground, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  includedPillText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: colors.success },

  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: colors.surfaceMuted,
  },
  addonRowSelected: { borderColor: colors.primary, backgroundColor: colors.surfaceHighlight },
  addonCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  addonCheckboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  addonName: { flex: 1, ...typography.body, color: colors.textPrimary, fontFamily: typography.labelMedium.fontFamily },

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
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  submitBtnDisabled: { backgroundColor: '#FCD3B3' },
  submitBtnText: { color: '#fff', ...typography.labelLarge },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelBtnText: { color: colors.primary, ...typography.labelLarge },
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

  resultSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  resultSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  resultSheetTitle: { ...typography.h3, color: colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  resultSheetMessage: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  resultSheetButtons: { gap: 10 },
  resultSheetBtn: { borderRadius: 24, paddingVertical: 14, alignItems: 'center', backgroundColor: colors.accent },
  resultSheetBtnCancel: { backgroundColor: colors.surfaceSecondary },
  resultSheetBtnDestructive: { backgroundColor: colors.error },
  resultSheetBtnText: { ...typography.labelLarge, color: colors.onAccent },
  resultSheetBtnTextCancel: { color: colors.textPrimary },
  resultSheetBtnTextDestructive: { color: '#FFFFFF' },
});

export default CreateTicket;
