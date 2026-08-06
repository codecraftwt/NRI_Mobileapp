import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList, StatusBar, Platform, PermissionsAndroid, Linking, Alert, Image } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { clearCart, clearServerCart, selectCartItems, selectCartSubtotal } from '../../Redux/slices/cartSlice';
import { useCart } from '../../Hooks/useCart';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';
import { useTalukas } from '../../Hooks/useTalukas';
import { usePriorities } from '../../Hooks/usePriorities';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useTicketBooking } from '../../Hooks/useTicketBooking';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { setServiceLocation } from '../../Redux/slices/serviceLocationSlice';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { resolveLocalCopies } from '../../Utils/localFileCopy';
import { useToast } from '../../context/ToastContext';

const GST_RATE = 0.18;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
// Matches the family member API's relationship enum (same as CreateTicket).
const RELATION_OPTIONS = ['Parent', 'Sibling', 'Spouse', 'Child', 'Other'];

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
  const { remove: removeCartService } = useCart();
  const items = useSelector(selectCartItems);
  const servicesSubtotal = useSelector(selectCartSubtotal);
  const savedLocation = useSelector(s => s.serviceLocation);

  const [reqForm, setReqForm] = useState({
    fullName: '', relation: '', property: 'Not applicable',
    state: items[0]?.stateName || savedLocation?.stateName || '',
    city: items[0]?.cityName || savedLocation?.cityName || '',
    taluka: '',
    address: '', pincode: items[0]?.pincode || savedLocation?.pincode || '', preferredAt: '', priority: '', notes: '',
  });
  const setField = (k, v) => setReqForm(p => ({ ...p, [k]: v }));
  const [documentFiles, setDocumentFiles] = useState({});
  const [pincodeLocation, setPincodeLocation] = useState(null);
  const paymentMethod = 'stripe';
  const [couponCode, setCouponCode] = useState('');
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
  const { members: familyMembers, create: createFamilyMember } = useFamilyMembers();
  const { loading: pincodeLoading, lookup: lookupPincode } = usePostalCodeLookup();
  const {
    requiredDocuments, fetchRequiredDocuments,
    quote, quoteLoading, fetchQuote,
    submitTicket, submitLoading, payForTicket, payLoading, verifyPayment, verifyLoading, reset,
  } = useTicketBooking();

  // Clear any stale booking state (submit/pay/verify status) left over from a
  // previous request so the Submit button never sticks behind an old spinner.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const priorityLabelOf = (p) => `${p.name} — ${Number(p.surcharge) > 0 ? fmt(p.surcharge) : 'Free'}`;
  const priorityLabels = priorities.map(priorityLabelOf);
  const selectedPriority = priorities.find(p => priorityLabelOf(p) === reqForm.priority) || null;
  const prioritySurcharge = Number(selectedPriority?.surcharge || 0);

  const serviceIdsKey = items.map(i => i.serviceId).join(',');
  useEffect(() => {
    if (items.length) fetchRequiredDocuments(items.map(i => i.serviceId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceIdsKey]);

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

  const loading = submissionInProgress || submitLoading || payLoading || verifyLoading;

  // Authoritative pricing from the ticket quote API (same source the cards /
  // backend use) — keeps the estimated amount, GST and total in sync with the
  // server instead of computing them locally.
  const quoteStateId = states.find(s => s.name === reqForm.state)?.id || null;
  const quoteCityId = cities.find(c => c.name === reqForm.city)?.id || pincodeLocation?.cityId || items[0]?.cityId || savedLocation?.cityId || null;
  const quoteUrgency = selectedPriority?.slug || 'standard';
  const quoteKey = `${serviceIdsKey}|${quoteStateId}|${quoteCityId}|${quoteUrgency}|${couponCode.trim()}`;
  useEffect(() => {
    if (!items.length || !quoteCityId) return;
    fetchQuote({
      serviceId: items[0].serviceId,
      extraServices: items.slice(1).map(i => i.serviceId),
      stateId: quoteStateId,
      cityId: quoteCityId,
      urgency: quoteUrgency,
      couponCode: couponCode.trim() || undefined,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  // The quote API returns the address-specific pre-GST service amount,
  // GST amount, and GST-inclusive total. Use it directly when available; fall
  // back to splitting the cart's GST-inclusive total while the quote loads.
  const hasQuoteTotal = Number(quote?.totalAmount || 0) > 0;
  const selectedServicesTotal = servicesSubtotal;
  const cartBaseTotal = items.reduce((sum, item) => sum + Number(item.base || 0), 0);
  const cartGstTotal = items.reduce((sum, item) => sum + Number(item.gstAmount || 0), 0);
  const estSurcharge = quote?.expressSurcharge != null ? Number(quote.expressSurcharge) : prioritySurcharge;
  const estDiscount = Number(quote?.discount || 0);
  const fallbackTotal = Math.max(0, Math.round((selectedServicesTotal + estSurcharge - estDiscount) * 100) / 100);
  const estTotal = hasQuoteTotal ? Number(quote.totalAmount) : fallbackTotal;
  const estAmount = quote?.customerPrice != null
    ? Number(quote.customerPrice)
    : (cartBaseTotal > 0 ? cartBaseTotal : Math.round((estTotal / (1 + GST_RATE)) * 100) / 100);
  const estGst = quote?.gstAmount != null
    ? Number(quote.gstAmount)
    : (cartGstTotal > 0 ? cartGstTotal : Math.max(0, Math.round((estTotal - estAmount) * 100) / 100));

  // Document upload
  const requestFilePermission = async () => {
    if (Platform.OS !== 'android') return true;
    const permission = Platform.Version >= 33 ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    if (await PermissionsAndroid.check(permission)) return true;
    const result = await PermissionsAndroid.request(permission, {
      title: 'Allow Photo & Document Access',
      message: 'NRI Circle needs access to attach documents to your request.',
      buttonPositive: 'Allow', buttonNegative: 'Deny',
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

  const resolveFamilyMemberId = async () => {
    const name = reqForm.fullName.trim();
    const relationship = reqForm.relation.toLowerCase();
    if (!name || !relationship) return undefined;
    const existing = familyMembers.find(m => m.name.trim().toLowerCase() === name.toLowerCase() && m.relationship === relationship);
    if (existing) return existing.id;
    // Non-fatal: if creating the family member fails, still submit the request
    // (POST /customer/tickets) without a family_member_id rather than aborting.
    try {
      const created = await createFamilyMember({ name, relationship }).unwrap();
      return created.id;
    } catch (e) {
      return undefined;
    }
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
          navigation.navigate('Requests');
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

  const handleSubmit = async () => {
    if (loading || submissionLockRef.current) return;
    if (!validateDetails()) { setStep('details'); return; }

    submissionLockRef.current = true;
    setSubmissionInProgress(true);
    try {
      const stateId = states.find(s => s.name === reqForm.state)?.id;
      const cityId = cities.find(c => c.name === reqForm.city)?.id || pincodeLocation?.cityId || items[0]?.cityId || savedLocation?.cityId || null;
      const talukaId = talukas.find(t => t.name === reqForm.taluka)?.id || null;
      const address = reqForm.pincode.trim() ? `${reqForm.address.trim()} - ${reqForm.pincode.trim()}` : reqForm.address.trim();
      const familyMemberId = await resolveFamilyMemberId();

      // All cart services go into ONE request: first = base, rest = extras.
      const result = await submitTicket({
        serviceId: items[0].serviceId,
        extraServices: items.slice(1).map(i => i.serviceId),
        couponCode: couponCode.trim() || undefined,
        familyMemberId, stateId, cityId, talukaId, address,
        urgency: selectedPriority?.slug || 'standard',
        preferredDate: preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined,
        customerNotes: reqForm.notes || undefined,
        documents: documentFiles,
      }).unwrap();

      if (result.paymentRequired && result.ticket?.id) {
        const pay = await payForTicket({ ticketId: result.ticket.id, gateway: paymentMethod }).unwrap();
        if (pay.checkoutUrl) {
          setCheckoutSession({ url: pay.checkoutUrl, paymentId: pay.paymentId });
          submissionLockRef.current = false;
          setSubmissionInProgress(false);
        } else {
          await finishSuccess();
        }
      } else {
        await finishSuccess();
      }
    } catch (error) {
      // Surface the backend's exact reason (401 unauthenticated, 422 validation
      // / booking-rule / no-vendor-in-city, etc.) so failures are diagnosable.
      const fieldErrors = error?.errors ? Object.values(error.errors).flat().join('\n') : '';
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
      await finishSuccess();
    } catch (error) {
      showAlert('Verification Failed', error?.message || 'Could not verify the payment yet. If charged, check Requests shortly.');
      submissionLockRef.current = false;
      setSubmissionInProgress(false);
    }
  };

  const empty = items.length === 0;
  const handleClearCart = () => {
    // Optimistic: clear the local cart immediately so the UI responds instantly;
    // the server delete syncs in the background (like the per-item remove).
    if (items.length) dispatch(clearServerCart(items));
    dispatch(clearCart());
    showToast('Cart cleared', 'success');
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
            <Text style={styles.headerTitle}>Submit Request</Text>
            <Text style={styles.headerSub}>{items.length} service{items.length === 1 ? '' : 's'} selected</Text>
          </View>
          {!empty && (
            <TouchableOpacity style={styles.clearBtn} onPress={handleClearCart}>
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
            <Text style={styles.primaryBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      ) : page === 'cart' ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Page 1 — selected services + estimated price */}
          <Text style={styles.sectionLabel}>SELECTED SERVICES</Text>
          {items.map((it) => (
            <View key={it.serviceId} style={styles.itemCard}>
              <View style={styles.itemIcon}><Icon name="description" size={20} color="#20304C" /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                <View style={styles.itemMetaRow}>
                  <View style={styles.itemBadge}><Text style={styles.itemBadgeText}>{(it.categoryName || '').toUpperCase()}</Text></View>
                  {!!it.durationLabel && (
                    <View style={styles.itemDuration}>
                      <Icon name="schedule" size={12} color="#94A3B8" />
                      <Text style={styles.itemDurationText}>{it.durationLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <TouchableOpacity onPress={() => { removeCartService(it.serviceId); showToast('Service removed from cart', 'success'); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="delete-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Estimated price — shown with selected services (from the quote API) */}
          <View style={styles.card}>
            <View style={styles.cardHeadRow}>
              <Text style={styles.cardTitle}>Estimated Price for Your Address</Text>
              {quoteLoading && <ActivityIndicator size="small" color="#D94625" />}
            </View>
            <SummaryRow label="Estimated amount" value={fmt(estAmount)} />
            {estSurcharge > 0 && <SummaryRow label="Express surcharge" value={`+${fmt(estSurcharge)}`} />}
            {estDiscount > 0 && <SummaryRow label="Discount" value={`-${fmt(estDiscount)}`} />}
            <SummaryRow label="GST" sub="(18%)" value={fmt(estGst)} />
            <View style={styles.divider} />
            <SummaryRow label="Estimated Total" value={fmt(estTotal)} strong />
            <Text style={styles.disclaimer}>Final amount is set by the verified vendor covering your exact address.</Text>
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
            <FormSelect label="Property (optional)" value={reqForm.property} placeholder="Not applicable" options={['Not applicable']} onSelect={v => setField('property', v)} />
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
            <TextInput style={styles.input} placeholder="e.g. WELCOME10" placeholderTextColor="#94A3B8" autoCapitalize="characters" value={couponCode} onChangeText={setCouponCode} />

            <Text style={styles.fieldLabel}>Payment Method</Text>
            <TouchableOpacity style={[styles.gatewayRow, styles.gatewayRowActive]} activeOpacity={0.8}>
              <Icon name="credit-card" size={20} color={paymentMethod === 'stripe' ? '#20304C' : '#64748B'} />
              <View style={{ flex: 1 }}><Text style={styles.gatewayName}>Card (Stripe)</Text><Text style={styles.gatewayDesc}>Visa, Mastercard, Amex, Apple & Google Pay</Text></View>
              <View style={[styles.radio, paymentMethod === 'stripe' && styles.radioActive]} />
            </TouchableOpacity>

            {/* Order summary — from the quote API */}
            <View style={styles.divider} />
            <SummaryRow label="Services" value={String(items.length)} />
            <SummaryRow label="Services total" value={fmt(estAmount)} />
            {estSurcharge > 0 && <SummaryRow label="Express surcharge" value={`+${fmt(estSurcharge)}`} />}
            {estDiscount > 0 && <SummaryRow label="Discount" value={`-${fmt(estDiscount)}`} />}
            <SummaryRow label="Services GST" sub="(18%)" value={fmt(estGst)} />
            <View style={styles.payBox}>
              <Text style={styles.payLabel}>You'll pay</Text>
              <Text style={styles.payValue}>{fmt(estTotal)}</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 18 }} />
            ) : (
              <TouchableOpacity style={styles.submitBtn} activeOpacity={0.9} onPress={handleSubmit}>
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
  itemIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FB', justifyContent: 'center', alignItems: 'center' },
  itemName: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A', marginBottom: 6 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemBadge: { backgroundColor: '#EEF2FB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  itemBadgeText: { fontSize: 9, letterSpacing: 0.5, color: '#20304C', fontFamily: typography.labelMedium.fontFamily },
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

  payBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#EEF2FB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 12 },
  payLabel: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  payValue: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#20304C' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 16, marginTop: 16 },
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
