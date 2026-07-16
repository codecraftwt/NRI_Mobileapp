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
  const [serviceCategory, setServiceCategory] = useState(route.params?.initialCategory || '');
  const [selectedBaseServiceIds, setSelectedBaseServiceIds] = useState(route.params?.initialBaseServiceIds || []);
  const [selectedAddonIds, setSelectedAddonIds] = useState(route.params?.initialAddons || []);
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
  const { showAlert, alertProps } = useAppAlert();

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
      urgency: PRIORITY_TO_URGENCY[priority],
      couponCode: appliedCoupon?.code,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseServiceIdsKey, addonIdsKey, stateId, priority, appliedCoupon?.code]);

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
  const localTotal = localBasePrice + localAddonsSubtotal;

  const formattedDate = preferredDate
    ? preferredDate.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

  const isValid = serviceCategory && selectedBaseServiceIds.length > 0 && state && city && fullAddress.trim().length > 0;

  const handleSelectCategory = (v) => {
    setServiceCategory(v);
    setSelectedBaseServiceIds([]);
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
        Alert.alert('Payment Successful', 'Your service request has been paid and confirmed.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else if (result.checkoutUrl) {
        openStripeCheckout(result.checkoutUrl);
        Alert.alert(
          'Complete Payment',
          'Complete your payment in the browser, then come back and tap "I\'ve Paid" to confirm.',
          [
            { text: 'Pay Later', style: 'cancel', onPress: () => navigation.goBack() },
            {
              text: "I've Paid",
              onPress: () => {
                const sessionId = extractStripeSessionId(result.checkoutUrl);
                verifyPayment({ paymentId: result.paymentId, sessionId })
                  .unwrap()
                  .then(() => {
                    Alert.alert('Payment Successful', 'Your service request has been paid and confirmed.', [
                      { text: 'OK', onPress: () => navigation.goBack() },
                    ]);
                  })
                  .catch((error) => {
                    Alert.alert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
                  });
              },
            },
          ]
        );
      } else {
        Alert.alert('Payment Confirmed', result.message || 'Your service request has been paid.', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert(
        'Payment Failed',
        error?.message || 'Could not complete payment. Your request has been saved — you can pay from My Tickets.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
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
        address: fullAddress,
        urgency: PRIORITY_TO_URGENCY[priority],
        preferredDate: preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined,
        customerNotes: notes,
        files,
      }).unwrap();

      if (result.paymentRequired) {
        Alert.alert(
          'Payment Required',
          `Request ${result.ticket.ticketNumber} needs a payment of ₹${result.amountDue.toLocaleString('en-IN')} to proceed. Choose how you'd like to pay.`,
          [
            { text: 'Pay Later', style: 'cancel', onPress: () => navigation.goBack() },
            { text: 'Pay with Razorpay', onPress: () => handleGatewayPayment(result.ticket.id, 'razorpay') },
            { text: 'Pay with Stripe', onPress: () => handleGatewayPayment(result.ticket.id, 'stripe') },
          ]
        );
      } else {
        showAlert('Request Submitted', `Your request ${result.ticket.ticketNumber} has been submitted.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      Alert.alert('Submission Failed', error?.message || 'Could not submit your request. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={18} color="#5B21B6" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Submit a Service Request</Text>
        <View style={{ width: 44 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {membership && usage && (
          <View style={styles.usageBanner}>
            <Icon name="info-outline" size={16} color="#6D28D9" style={{ marginTop: 2 }} />
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
            disabled={!!route.params?.initialCategory}
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
        </View>

        <Text style={styles.sectionTitle}>Who / Where</Text>
        <View style={styles.card}>
          <SelectField
            label="For Family Member (optional)"
            value={familyMember}
            placeholder="Select family member..."
            options={[NO_FAMILY_MEMBER, ...familyMembers.map(m => m.name)]}
            onSelect={setFamilyMember}
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
            placeholder="Select city..."
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
            placeholder="Select taluka..."
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
          {selectedBaseServiceIds.length === 0 ? (
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
              {selectedBaseServicesList.map(s => (
                <View key={s.id} style={[styles.priceRow, styles.priceRowDashed]}>
                  <Text style={styles.priceLabel} numberOfLines={1}>+ {s.name}</Text>
                  <Text style={styles.priceValue}>₹{(s.pricing?.customerPrice || 0).toLocaleString('en-IN')}</Text>
                </View>
              ))}
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
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  headerContainer: {
    backgroundColor: '#FDFBF7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
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
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#1E293B',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: { paddingBottom: 60, paddingHorizontal: 20, paddingTop: 12 },
  usageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F3E8FF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  usageBannerText: { flex: 1, fontSize: 13, color: '#6D28D9', lineHeight: 20 },
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
  baseServiceCardSelected: { borderColor: '#A855F7', backgroundColor: '#FAF5FF' },
  baseServiceName: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  baseServiceSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  baseServicePrice: { fontSize: 15, fontWeight: '600', color: '#5B21B6' },
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
  addonCardSelected: { borderColor: '#A855F7', backgroundColor: '#FAF5FF' },
  addonCheckboxSquare: { width: 24, height: 24, borderRadius: 8, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  addonCheckboxSquareChecked: { backgroundColor: '#5B21B6', borderColor: '#5B21B6' },
  addonCardName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  addonCardSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  addonCardPrice: { fontSize: 15, fontWeight: '600', color: '#5B21B6' },

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
    backgroundColor: '#5B21B6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#5B21B6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { backgroundColor: '#CBD5E1', shadowOpacity: 0, elevation: 0 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelBtnText: { color: '#6D28D9', fontSize: 16, fontWeight: '700' },
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
