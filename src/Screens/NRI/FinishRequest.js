import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList, StatusBar, Platform, Alert, Image, BackHandler } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import RNBlobUtil from 'react-native-blob-util';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { selectCartItems, clearCart, clearServerCart } from '../../Redux/slices/cartSlice';
import { selectPendingTicketFinalizes, selectPendingBundleFinishes, clearPendingTicketFinalize, clearPendingBundleFinish } from '../../Redux/slices/pendingRequestsSlice';
import { onboardingUserKey } from '../../Redux/slices/onboardingSlice';
import { useTicketBooking } from '../../Hooks/useTicketBooking';
import { useBilling } from '../../Hooks/useBilling';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useProperties } from '../../Hooks/useProperties';
import { useTalukas } from '../../Hooks/useTalukas';
import CustomDateTimePicker from '../../Components/CustomDateTimePicker';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { resolveLocalCopies } from '../../Utils/localFileCopy';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_FILES = 5;
const NO_PROPERTY = 'Not applicable';
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

// Canonical "finish this paid-but-not-yet-created request" screen. Reached
// (a) immediately after a pay-first checkout succeeds, or (b) later from the
// Requests.js "Finish Request" banner after the app was backgrounded/killed
// mid-flow — either way it reads its context from the persisted
// pendingRequests slice (NOT route params), which is what makes it resumable.
// mode: 'ticket' (cart or single-service checkout) | 'bundle' (registration
// combined-cart checkout).
function FinishRequest({ route, navigation }) {
  const mode = route?.params?.mode || 'ticket';
  // A customer can have more than one paid-but-unfinalized item at once — the
  // caller (SubmitRequest/CreateTicket/OnboardingPayment, or the Requests.js
  // banner for a specific one) always passes which one this screen is for.
  // Falling back to the first entry only covers a generic resume with no id
  // (e.g. an old deep link) when exactly one is pending.
  const paymentId = route?.params?.paymentId;
  const bundleId = route?.params?.bundleId;
  const dispatch = useDispatch();
  const { showAlert, alertProps } = useAppAlert();
  const userId = useSelector(s => onboardingUserKey(s.user.user));
  const cartItems = useSelector(selectCartItems);
  const ticketFinalizes = useSelector(selectPendingTicketFinalizes);
  const bundleFinishes = useSelector(selectPendingBundleFinishes);
  const pendingTicket = (paymentId != null ? ticketFinalizes.find(t => t.paymentId === paymentId) : ticketFinalizes[0]) || null;
  const pendingBundle = (bundleId != null ? bundleFinishes.find(b => b.bundleId === bundleId) : bundleFinishes[0]) || null;
  const { properties } = useProperties();
  const { members: familyMembers, create: createFamilyMember } = useFamilyMembers();

  const {
    requiredDocuments: ticketRequiredDocuments, fetchRequiredDocuments,
    finalizeTicket: finalizeTicketAction, finalizeLoading,
  } = useTicketBooking();
  const {
    checkoutBundle, checkoutBundleLoading, checkoutBundleFailed, getCheckoutBundle,
    finishBundle, finishBundleLoading,
  } = useBilling();

  const cityName = mode === 'bundle' ? pendingBundle?.cityName : pendingTicket?.cityName;
  const { talukaNames, talukas } = useTalukas(null, cityName);

  const [form, setForm] = useState({ fullName: '', relation: '', property: NO_PROPERTY, taluka: '', address: '', notes: '' });
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const [preferredDate, setPreferredDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [documentFiles, setDocumentFiles] = useState({});
  const [files, setFiles] = useState([]);
  const [previewImage, setPreviewImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // The payment for this request is already done — going "back" must never
  // return to the payment screen (there's nothing left to pay, and the cart
  // it came from may already be mid-checkout). Land on the Services list
  // instead, same as the header back arrow above. Bundle mode has no back
  // action at all (see the header render below), so this only applies to
  // 'ticket'.
  useFocusEffect(
    useCallback(() => {
      if (mode !== 'ticket') return undefined;
      const onBackPress = () => {
        navigation.navigate('Services', { screen: 'ServicesMain' });
        return true;
      };
      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => subscription.remove();
    }, [mode, navigation])
  );

  useEffect(() => {
    if (mode === 'ticket' && pendingTicket?.serviceIds?.length) {
      fetchRequiredDocuments(pendingTicket.serviceIds);
    } else if (mode === 'bundle' && pendingBundle?.bundleId) {
      getCheckoutBundle(pendingBundle.bundleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, pendingTicket?.serviceIds?.join(','), pendingBundle?.bundleId]);

  const requiredDocuments = mode === 'bundle' ? (checkoutBundle?.requiredDocuments || []) : ticketRequiredDocuments;
  const serviceNames = mode === 'bundle' ? (pendingBundle?.serviceNames || '') : (pendingTicket?.serviceNames || '');
  const serviceList = Array.isArray(serviceNames) ? serviceNames : String(serviceNames || '').split(',').map(s => s.trim()).filter(Boolean);
  const amount = mode === 'bundle' ? null : pendingTicket?.amount;
  const currency = mode === 'bundle' ? null : pendingTicket?.currency;

  const loading = submitting || finalizeLoading || finishBundleLoading;
  const bundleLoading = mode === 'bundle' && checkoutBundleLoading && !checkoutBundle;

  const formattedPreferred = preferredDate
    ? preferredDate.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '';

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

  // Ticket mode's finalize call needs an existing family_member_id (unlike the
  // checkout-bundle finish call, which still takes raw name/relationship) —
  // reuse a matching saved member if one exists, else create one on the fly.
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
    if (!form.address.trim()) missing.push('Full Address');
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

  const handleSubmit = async () => {
    if (loading || !validate()) return;
    setSubmitting(true);
    try {
      const talukaId = talukas.find(t => t.name === form.taluka)?.id || null;
      const propertyId = properties.find(p => p.nickname === form.property)?.id || null;
      const preferred = preferredDate ? preferredDate.toISOString().slice(0, 10) : undefined;

      if (mode === 'ticket') {
        const familyMemberId = await resolveFamilyMemberId();
        await finalizeTicketAction({
          paymentId: pendingTicket.paymentId,
          familyMemberId,
          propertyId,
          talukaId,
          address: form.address.trim(),
          preferredDate: preferred,
          customerNotes: form.notes || undefined,
          files,
          documents: documentFiles,
        }).unwrap();
        dispatch(clearPendingTicketFinalize({ userId, paymentId: pendingTicket.paymentId }));
        if (pendingTicket.origin === 'cart') {
          if (cartItems.length) await dispatch(clearServerCart(cartItems)).unwrap().catch(() => {});
          dispatch(clearCart());
        }
        showAlert('Request Submitted', 'Your service request has been submitted. Track its progress under Requests.', [
          { text: 'OK', onPress: () => navigation.navigate('Requests', { screen: 'RequestsMain' }) },
        ]);
      } else {
        await finishBundle({
          bundleId: pendingBundle.bundleId,
          familyMemberName: form.fullName.trim(),
          familyMemberRelationship: form.relation.toLowerCase(),
          propertyId,
          talukaId,
          address: form.address.trim(),
          preferredDate: preferred,
          customerNotes: form.notes || undefined,
          documents: documentFiles,
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
      showAlert('Submission Failed', error?.message || 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const nothingPending = mode === 'ticket' ? !pendingTicket : !pendingBundle;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          {mode === 'ticket' && (
            <TouchableOpacity style={styles.headerBack} onPress={() => navigation.navigate('Services', { screen: 'ServicesMain' })}>
              <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.headerBackIcon} />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{mode === 'bundle' ? 'Finish Your Service Requests' : 'Finish Your Service Request'}</Text>
            <Text style={styles.headerSub}>Payment received — just a few more details</Text>
          </View>
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
        <View style={styles.paidBanner}>
          <Icon name="check-circle" size={18} color="#059669" />
          <Text style={styles.paidBannerText}>
            Payment received{amount != null ? ` (${fmt(amount, currency)})` : ''}. Just a few more details and your request is on its way.
          </Text>
        </View>

        {serviceList.length > 0 && (
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

        <View style={styles.card}>
          <View style={styles.cardHeadRow}><Icon name="place" size={16} color="#20304C" /><Text style={styles.cardTitle}>Who / Where</Text></View>

          <Text style={styles.fieldLabel}>Full Name *</Text>
          <TextInput style={styles.input} placeholder="Family member's name" placeholderTextColor="#94A3B8" value={form.fullName} onChangeText={t => setField('fullName', t)} />

          <FormSelect label="Relation" required value={form.relation} placeholder="Select..." options={RELATION_OPTIONS} onSelect={v => setField('relation', v)} />
          <FormSelect label="Property (optional)" value={form.property} placeholder="Not applicable" options={[NO_PROPERTY, ...properties.map(p => p.nickname)]} onSelect={v => setField('property', v)} />
          <FormSelect label="Taluka (optional)" value={form.taluka} placeholder="Not applicable" options={talukaNames} onSelect={v => setField('taluka', v)} />

          <Text style={styles.fieldLabel}>Full Address *</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} placeholder="House/flat no., street, landmark..." placeholderTextColor="#94A3B8" multiline value={form.address} onChangeText={t => setField('address', t)} />

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

          <Text style={styles.fieldLabel}>Additional Notes</Text>
          <TextInput style={[styles.input, styles.inputMultiline]} placeholder="Any specific requirements, access instructions, etc." placeholderTextColor="#94A3B8" multiline value={form.notes} onChangeText={t => setField('notes', t)} />

          {mode === 'ticket' && (
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
        </View>

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

        {loading ? (
          <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 18 }} />
        ) : (
          <TouchableOpacity style={styles.submitBtn} activeOpacity={0.9} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>{mode === 'bundle' ? 'Send Requests' : 'Send Request'}</Text>
            <Icon name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </ScrollView>
      )}

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
  headerTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  scrollContent: { padding: 20, paddingBottom: 40 },

  paidBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#D1FAE5', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  paidBannerText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#065F46' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 8 },

  requestedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  requestedText: { fontSize: 14, color: '#1E293B' },

  fieldLabel: { fontSize: 13, fontFamily: typography.h4.fontFamily, color: '#20304C', marginBottom: 6, marginTop: 2 },
  fieldHint: { fontSize: 11.5, color: '#94A3B8', lineHeight: 17, marginBottom: 2 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 48, color: '#1E293B', fontSize: 14, marginBottom: 14 },
  inputMultiline: { height: 88, paddingTop: 12, textAlignVertical: 'top' },

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

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 16, marginTop: 4 },
  submitBtnText: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },

  retryBox: { paddingVertical: 16, alignItems: 'center' },
  retryText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },

  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)' },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: STATUS_BAR_HEIGHT, paddingHorizontal: 20, paddingBottom: 12 },
  previewName: { flex: 1, fontSize: 14, color: '#FFFFFF', fontFamily: typography.h4.fontFamily },
  previewImage: { flex: 1, width: '100%' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 10 },
  emptyTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  primaryBtn: { backgroundColor: '#D94625', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 8 },
  primaryBtnText: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
});

export default FinishRequest;
