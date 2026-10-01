import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList, StatusBar, Alert, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { selectCartItems, clearCart, clearServerCart } from '../../Redux/slices/cartSlice';
import {
  selectPendingTicketFinalizes, selectPendingBundleFinishes, selectPendingSubscriptionFinalizes, selectPendingQuotedRequests,
  clearPendingTicketFinalize, clearPendingBundleFinish, clearPendingSubscriptionFinalize, clearPendingQuotedRequest,
} from '../../Redux/slices/pendingRequestsSlice';
import { onboardingUserKey } from '../../Redux/slices/onboardingSlice';
import { useTicketBooking } from '../../Hooks/useTicketBooking';
import { useBilling } from '../../Hooks/useBilling';
import { useServiceSubscription } from '../../Hooks/useServiceSubscription';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';
import { useTalukas } from '../../Hooks/useTalukas';
import { usePriorities } from '../../Hooks/usePriorities';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';
import { useMembership } from '../../Hooks/useMembership';
import { saveServiceLocation } from '../../Redux/slices/serviceLocationSlice';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { resolveLocalCopies } from '../../Utils/localFileCopy';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const RELATION_OPTIONS = ['Myself', 'Parent', 'Sibling', 'Spouse', 'Child', 'Other'];

const fmt = (amount, currency) => {
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${(Number(amount) || 0).toFixed(2)}`;
};

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

// Canonical "finish this paid-but-not-yet-created request" screen. Reached
// (a) immediately after a pay-first checkout succeeds, or (b) later from the
// Requests.js "Finish Request" banner after the app was backgrounded/killed
// mid-flow — either way it reads its context from the persisted
// pendingRequests slice (NOT route params), which is what makes it resumable.
// mode: 'ticket' (cart or single-service checkout) | 'bundle' (registration
// combined-cart checkout) | 'subscription' (recurring service subscription)
// | 'quoted' (quote-only service — nothing paid, POST .../tickets/quoted/{id}).
function FinishRequest({ route, navigation }) {
  const mode = route?.params?.mode || 'ticket';
  const returnTo = route?.params?.returnTo;
  // A customer can have more than one paid-but-unfinalized item at once — the
  // caller (SubmitRequest/CreateTicket/OnboardingPayment, or the Requests.js
  // banner for a specific one) always passes which one this screen is for.
  // Falling back to the first entry only covers a generic resume with no id
  // (e.g. an old deep link) when exactly one is pending.
  const paymentId = route?.params?.paymentId;
  const bundleId = route?.params?.bundleId;
  const serviceId = route?.params?.serviceId;
  const dispatch = useDispatch();
  const { showAlert, alertProps } = useAppAlert();
  const userId = useSelector(s => onboardingUserKey(s.user.user));
  const cartItems = useSelector(selectCartItems);
  const savedLocation = useSelector(s => s.serviceLocation);
  const ticketFinalizes = useSelector(selectPendingTicketFinalizes);
  const bundleFinishes = useSelector(selectPendingBundleFinishes);
  const subscriptionFinalizes = useSelector(selectPendingSubscriptionFinalizes);
  const quotedRequests = useSelector(selectPendingQuotedRequests);
  const pendingTicket = (paymentId != null ? ticketFinalizes.find(t => t.paymentId === paymentId) : ticketFinalizes[0]) || null;
  const pendingBundle = (bundleId != null ? bundleFinishes.find(b => b.bundleId === bundleId) : bundleFinishes[0]) || null;
  const pendingSubscription = (paymentId != null ? subscriptionFinalizes.find(s => s.paymentId === paymentId) : subscriptionFinalizes[0]) || null;
  const pendingQuoted = (serviceId != null ? quotedRequests.find(q => q.serviceId === serviceId) : quotedRequests[0]) || null;
  const { members: familyMembers, create: createFamilyMember } = useFamilyMembers();

  const {
    finalizeTicket: finalizeTicketAction, finalizeLoading,
    bookQuotedTicket, bookQuotedLoading,
  } = useTicketBooking();
  const {
    checkoutBundle, checkoutBundleLoading, checkoutBundleFailed, getCheckoutBundle,
    finishBundle, finishBundleLoading,
  } = useBilling();
  const {
    finalizeSubscription: finalizeSubscriptionAction, finalizeLoading: finalizeSubscriptionLoading,
  } = useServiceSubscription();

  const [form, setForm] = useState({
    fullName: pendingQuoted?.fullName || '',
    relation: pendingQuoted?.relation || '',
    taluka: pendingQuoted?.talukaName || '',
    address: pendingQuoted?.address || '',
    notes: pendingQuoted?.notes || '',
    state: pendingQuoted?.stateName || savedLocation?.stateName || '',
    city: pendingQuoted?.cityName || savedLocation?.cityName || '',
    pincode: pendingQuoted?.pincode || savedLocation?.pincode || '',
    priority: '',
  });
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const cityName = mode === 'bundle' ? pendingBundle?.cityName
    : mode === 'subscription' ? pendingSubscription?.cityName
    : mode === 'quoted' ? (form.city || pendingQuoted?.cityName)
    : pendingTicket?.cityName;

  const { stateNames, states } = useStates();
  const { cityNames, cities } = useCities(form.state);
  const { talukaNames, talukas } = useTalukas(null, cityName);
  const { priorities } = usePriorities();
  const { loading: pincodeLoading, lookup: lookupPincode } = usePostalCodeLookup();
  const [pincodeLocation, setPincodeLocation] = useState(null);

  const priorityLabelOf = (p) => `${p.name} — ${Number(p.surcharge) > 0 ? `$${Number(p.surcharge).toFixed(2)}` : 'Free'}`;
  const priorityLabels = priorities.map(priorityLabelOf);
  const selectedPriority = priorities.find(p => priorityLabelOf(p) === form.priority) || null;

  useEffect(() => {
    if (!form.priority && priorities.length) {
      const def = priorities.find(p => p.isDefault) || priorities[0];
      if (def) setField('priority', priorityLabelOf(def));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorities]);

  useEffect(() => {
    const code = form.pincode ? form.pincode.trim() : '';
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
  }, [form.pincode]);

  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const goBackTarget = useCallback(() => {
    if (returnTo === 'Requests') {
      navigation.navigate('Requests', { screen: 'RequestsMain' });
      return;
    }
    navigation.navigate('Services', { screen: 'ServicesMain' });
  }, [navigation, returnTo]);

  // Handle clearing a pending quoted request
  const handleClearQuoted = () => {
    showAlert('Clear Request', 'Discard this pending request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          if (pendingQuoted?.serviceId) {
            dispatch(clearPendingQuotedRequest({ userId, serviceId: pendingQuoted.serviceId }));
          }
          goBackTarget();
        },
      },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      if (mode === 'bundle') return undefined;
      const onBackPress = () => {
        goBackTarget();
        return true;
      };
      const backSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backSubscription.remove();
    }, [goBackTarget, mode])
  );

  useEffect(() => {
    if (mode === 'bundle' && pendingBundle?.bundleId) {
      getCheckoutBundle(pendingBundle.bundleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pendingBundle?.bundleId]);

  const serviceNames = mode === 'bundle' ? (pendingBundle?.serviceNames || '')
    : mode === 'subscription' ? (pendingSubscription?.serviceNames || '')
    : mode === 'quoted' ? (pendingQuoted?.serviceName || '')
    : (pendingTicket?.serviceNames || '');
  const serviceList = Array.isArray(serviceNames) ? serviceNames : String(serviceNames || '').split(',').map(s => s.trim()).filter(Boolean);

  const loading = submitting || finalizeLoading || finishBundleLoading || finalizeSubscriptionLoading || bookQuotedLoading;
  const bundleLoading = mode === 'bundle' && checkoutBundleLoading && !checkoutBundle;

  const handleChooseFiles = async () => {
    if (files.length >= MAX_FILES) { Alert.alert('Limit Reached', `You can attach up to ${MAX_FILES} files.`); return; }
    try {
      const results = await pick({ type: [docTypes.images, docTypes.pdf], allowMultiSelection: true });
      const remainingSlots = MAX_FILES - files.length;
      const candidates = results.slice(0, remainingSlots);
      const accepted = candidates.filter(f => !f.size || f.size <= MAX_FILE_SIZE_BYTES);
      const oversized = candidates.filter(f => f.size && f.size > MAX_FILE_SIZE_BYTES);
      if (accepted.length > 0) {
        const localized = await resolveLocalCopies(accepted);
        setFiles(prev => [...prev, ...localized.map(f => ({ name: f.name, uri: f.uri, type: f.type, size: f.size }))]);
      }
      if (oversized.length > 0) Alert.alert('File Too Large', `${oversized.length} file(s) were skipped because they exceed 5 MB.`);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', 'Could not select the file(s). Please try again.');
    }
  };
  const handleRemoveFile = (uri) => setFiles(prev => prev.filter(f => f.uri !== uri));

  const resolveFamilyMemberId = async () => {
    const name = form.fullName.trim();
    const relationship = form.relation.toLowerCase();
    const existing = familyMembers.find(
      m => m.name.trim().toLowerCase() === name.toLowerCase() && m.relationship === relationship
    );
    if (existing) return existing.id;
    const created = await createFamilyMember({ name, relationship }).unwrap();
    return created.id;
  };

  const validate = () => {
    const missing = [];
    if (!form.fullName.trim()) missing.push('Full Name');
    if (!form.relation) missing.push('Relation');
    if (mode === 'quoted') {
      if (!form.state) missing.push('State');
      if (!form.city) missing.push('City / District');
      if (!form.address.trim()) missing.push('Full Address');
      if (!form.pincode.trim()) missing.push('PIN Code');
    } else {
      if (!form.address.trim()) missing.push('Full Address');
    }
    if (missing.length) {
      showAlert('Missing Details', `Please fill: ${missing.join(', ')}.`);
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (loading || !validate()) return;
    setSubmitting(true);
    try {
      const talukaId = talukas.find(t => t.name === form.taluka)?.id || null;

      if (mode === 'ticket') {
        const familyMemberId = await resolveFamilyMemberId();
        await finalizeTicketAction({
          paymentId: pendingTicket.paymentId,
          familyMemberId,
          talukaId,
          address: form.address.trim(),
          customerNotes: form.notes || undefined,
          files,
        }).unwrap();
        dispatch(clearPendingTicketFinalize({ userId, paymentId: pendingTicket.paymentId }));
        if (pendingTicket.origin === 'cart') {
          if (cartItems.length) await dispatch(clearServerCart(cartItems)).unwrap().catch(() => {});
          dispatch(clearCart());
        }
        showAlert('Request Submitted', 'Your service request has been submitted. Track its progress under Requests.', [
          { text: 'OK', onPress: () => navigation.navigate('Requests', { screen: 'RequestsMain' }) },
        ]);
      } else if (mode === 'subscription') {
        const familyMemberId = await resolveFamilyMemberId();
        await finalizeSubscriptionAction({
          paymentId: pendingSubscription.paymentId,
          familyMemberId,
          talukaId,
          address: form.address.trim(),
          customerNotes: form.notes || undefined,
        }).unwrap();
        dispatch(clearPendingSubscriptionFinalize({ userId, paymentId: pendingSubscription.paymentId }));
        if (pendingSubscription.origin === 'cart') {
          if (cartItems.length) await dispatch(clearServerCart(cartItems)).unwrap().catch(() => {});
          dispatch(clearCart());
        }
        showAlert('Subscription Activated', 'Your recurring subscription is now active. Track it under Billing & Payments.', [
          { text: 'OK', onPress: () => navigation.navigate('Requests', { screen: 'RequestsMain' }) },
        ]);
      } else if (mode === 'quoted') {
        const stateId = states.find(s => s.name === form.state)?.id || null;
        const cityId = cities.find(c => c.name === form.city)?.id || null;
        const familyMemberId = await resolveFamilyMemberId();
        await bookQuotedTicket({
          serviceId: pendingQuoted.serviceId,
          stateId, cityId, talukaId, familyMemberId,
          address: form.address.trim(),
          pincode: form.pincode?.trim() || undefined,
          urgency: selectedPriority?.slug || 'standard',
          customerNotes: form.notes || undefined,
          files,
        }).unwrap();
        dispatch(clearPendingQuotedRequest({ userId, serviceId: pendingQuoted.serviceId }));

        const remaining = quotedRequests.filter(q => q.serviceId !== pendingQuoted.serviceId);
        showAlert(
          'Request Submitted',
          remaining.length > 0
            ? `Your request has been submitted. ${remaining.length} more quoted service${remaining.length > 1 ? 's are' : ' is'} waiting under "Finish Request" in your Requests tab.`
            : 'Your service request has been submitted. Track its progress under Requests.',
          [{ text: 'OK', onPress: () => navigation.navigate('Requests', { screen: 'RequestsMain' }) }]
        );
      } else {
        await finishBundle({
          bundleId: pendingBundle.bundleId,
          familyMemberName: form.fullName.trim(),
          familyMemberRelationship: form.relation.toLowerCase(),
          talukaId,
          address: form.address.trim(),
          customerNotes: form.notes || undefined,
        }).unwrap();
        dispatch(clearPendingBundleFinish({ userId, bundleId: pendingBundle.bundleId }));
        navigation.replace('OnboardingWelcome', {
          plan: route?.params?.plan,
          hasServiceRequests: true,
          pendingRecurringBundle: route?.params?.pendingRecurringBundle,
          customPlanTicket: route?.params?.customPlanTicket,
        });
      }
    } catch (error) {
      if (error?.requiresMembership || error?.errors?.requires_membership || (error?.status === 403 && String(error?.message).toLowerCase().includes('membership'))) {
        showAlert(
          'Active Membership Required',
          error?.message || 'An active membership is required to book services. Please purchase a membership first.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Choose Plan', onPress: () => navigation.navigate('MembershipCheckout', { mode: 'new' }) },
          ]
        );
        return;
      }
      showAlert('Submission Failed', error?.message || 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const nothingPending = mode === 'ticket' ? !pendingTicket
    : mode === 'subscription' ? !pendingSubscription
    : mode === 'quoted' ? !pendingQuoted
    : !pendingBundle;

  const headerTitle = mode === 'bundle' ? 'Finish Your Service Requests'
    : mode === 'subscription' ? 'Finish Your Subscription'
    : mode === 'quoted' ? 'Submit Request'
    : 'Finish Your Service Request';

  const headerSub = mode === 'quoted' ? '1 service selected'
    : mode === 'bundle' ? 'Payment received — just a few more details'
    : mode === 'subscription' ? 'Payment received — just a few more details'
    : 'Payment received — just a few more details';

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          {mode !== 'bundle' && (
            <TouchableOpacity style={styles.headerBack} onPress={goBackTarget}>
              <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.headerBackIcon} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSub}>{headerSub}</Text>
          </View>
          {mode === 'quoted' && pendingQuoted && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearQuoted}>
              <Icon name="delete-outline" size={16} color="#FFFFFF" />
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {nothingPending ? (
        <View style={styles.emptyWrap}>
          <Icon name="check-circle-outline" size={54} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Nothing to finish right now</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Requests', { screen: 'RequestsMain' })}>
            <Text style={styles.primaryBtnText}>Go to Requests</Text>
          </TouchableOpacity>
        </View>
      ) : bundleLoading ? (
        <View style={[styles.emptyWrap, { flex: 1, justifyContent: 'center' }]}>
          <ActivityIndicator size="large" color="#D94625" />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {mode !== 'quoted' && (
          <View style={styles.paidBanner}>
            <Icon name="check-circle" size={18} color="#059669" />
            <Text style={styles.paidBannerText}>
              Payment received. Just a few more details and your request is on its way.
            </Text>
          </View>
        )}

        {serviceList.length > 0 && mode !== 'quoted' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>What you're requesting</Text>
            {serviceList.map((name) => (
              <View key={name} style={styles.requestedRow}>
                <Icon name="check" size={16} color="#059669" />
                <Text style={styles.requestedText}>{name}</Text>
              </View>
            ))}
          </View>
        )}

        {checkoutBundleFailed && mode === 'bundle' && (
          <TouchableOpacity style={styles.retryBox} onPress={() => getCheckoutBundle(pendingBundle.bundleId)}>
            <Text style={styles.retryText}>Couldn't load your request details. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* Who / Where Form matching SubmitRequest screenshot */}
        <View style={styles.card}>
          <View style={styles.cardHeadRow}>
            <Icon name="place" size={16} color="#20304C" />
            <Text style={styles.cardTitle}>Who / Where</Text>
          </View>

          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Family member's name"
            placeholderTextColor="#94A3B8"
            value={form.fullName}
            onChangeText={t => setField('fullName', t)}
          />

          <FormSelect
            label="Relation"
            required
            value={form.relation}
            placeholder="Select..."
            options={RELATION_OPTIONS}
            onSelect={v => setField('relation', v)}
          />

          {mode === 'quoted' && (
            <>
              <FormSelect
                label="State"
                required
                value={form.state}
                placeholder="Select state"
                options={stateNames}
                onSelect={v => { setField('state', v); setField('city', ''); setField('taluka', ''); }}
              />

              <FormSelect
                label="City / District"
                required
                value={form.city}
                placeholder={form.state ? 'Select city' : 'Select state first'}
                options={cityNames}
                disabled={!form.state}
                onSelect={v => { setField('city', v); setField('taluka', ''); }}
              />
            </>
          )}

          <FormSelect
            label="Taluka"
            value={form.taluka}
            placeholder={form.city ? 'Select taluka' : (mode === 'quoted' ? 'Select city first' : 'Not applicable')}
            options={talukaNames}
            disabled={mode === 'quoted' && !form.city}
            onSelect={v => setField('taluka', v)}
          />

          <Text style={styles.fieldLabel}>Full Address *</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="House/flat no., street, landmark..."
            placeholderTextColor="#94A3B8"
            multiline
            value={form.address}
            onChangeText={t => setField('address', t)}
          />

          {mode === 'quoted' && (
            <>
              <Text style={styles.fieldLabel}>PIN Code *</Text>
              <View style={styles.pincodeRow}>
                <TextInput
                  style={[styles.input, styles.pincodeInput]}
                  placeholder="e.g. 416002"
                  placeholderTextColor="#94A3B8"
                  keyboardType="number-pad"
                  maxLength={6}
                  value={form.pincode}
                  onChangeText={t => setField('pincode', t.replace(/[^0-9]/g, ''))}
                />
                {pincodeLoading && <ActivityIndicator size="small" color="#D94625" />}
              </View>
              {!!pincodeLocation?.cityName && (
                <Text style={styles.pincodeHint}>
                  {pincodeLocation.cityName}{pincodeLocation.stateName ? `, ${pincodeLocation.stateName}` : ''}
                </Text>
              )}

              <FormSelect
                label="Priority"
                required
                value={form.priority}
                placeholder="Standard — Free"
                options={priorityLabels}
                onSelect={v => setField('priority', v)}
              />
            </>
          )}

          {(mode === 'ticket' || mode === 'quoted') && (
            <>
              <Text style={styles.fieldLabel}>Photos / Documents <Text style={styles.fieldHint}>(optional, up to {MAX_FILES})</Text></Text>
              <View style={styles.docInputRow}>
                <TouchableOpacity style={styles.docChooseBtn} onPress={handleChooseFiles} activeOpacity={0.7}>
                  <Icon name="attach-file" size={16} color="#20304C" />
                  <Text style={styles.docChooseBtnText}>Choose Files</Text>
                </TouchableOpacity>
                {files.length === 0 && <Text style={styles.docFileName}>No file chosen</Text>}
              </View>
              {files.map(f => (
                <View key={f.uri} style={styles.filePill}>
                  <Icon name={f.type?.includes('pdf') ? 'picture-as-pdf' : 'image'} size={14} color="#20304C" />
                  <Text style={styles.filePillText} numberOfLines={1}>{f.name}</Text>
                  <TouchableOpacity onPress={() => handleRemoveFile(f.uri)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
              ))}
              <Text style={styles.fieldHint}>JPG, PNG or PDF, max 5 MB each.</Text>
            </>
          )}

          <Text style={styles.fieldLabel}>Additional Notes</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="Any specific requirements, access instructions, etc."
            placeholderTextColor="#94A3B8"
            multiline
            value={form.notes}
            onChangeText={t => setField('notes', t)}
          />
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 18 }} />
        ) : (
          <TouchableOpacity style={styles.submitBtn} activeOpacity={0.9} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>
              {mode === 'bundle' ? 'Send Requests' : mode === 'subscription' ? 'Activate Subscription' : 'Submit Request'}
            </Text>
            <Icon name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </ScrollView>
      )}

      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  headerCard: { backgroundColor: '#20304C', paddingTop: STATUS_BAR_HEIGHT - 8, paddingBottom: 18, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBack: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerBackIcon: { marginLeft: 6 },
  headerTitle: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  clearBtnText: { fontSize: 12, color: '#FFFFFF', fontFamily: typography.labelMedium.fontFamily },

  scrollContent: { padding: 20, paddingBottom: 40 },

  paidBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  paidBannerText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#065F46' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  requestedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  requestedText: { fontSize: 14, color: '#1E293B' },

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

  docInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  docChooseBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 44, backgroundColor: '#F8FAFC' },
  docChooseBtnText: { fontSize: 13, fontFamily: typography.h4.fontFamily, color: '#20304C' },
  docFileName: { flex: 1, fontSize: 12.5, color: '#94A3B8' },
  filePill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginTop: 8 },
  filePillText: { flex: 1, fontSize: 12.5, color: '#1E293B' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 16, marginTop: 4 },
  submitBtnText: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginTop: 16, marginBottom: 20, textAlign: 'center' },
  primaryBtn: { backgroundColor: '#D94625', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#FFFFFF', fontFamily: typography.h4.fontFamily, fontSize: 15 },
  retryBox: { backgroundColor: '#FEE2E2', borderRadius: 12, padding: 14, marginBottom: 16 },
  retryText: { color: '#DC2626', fontSize: 13, textAlign: 'center' },
});

export default FinishRequest;
