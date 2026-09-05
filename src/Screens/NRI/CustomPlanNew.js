import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import StripeCheckoutModal from '../../Components/StripeCheckoutModal';
import { useCustomPlans } from '../../Hooks/useCustomPlans';
import { useBilling } from '../../Hooks/useBilling';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';
import { usePaymentGateways, gatewayIcon, GATEWAY_META } from '../../Hooks/usePaymentGateways';
import { runRazorpayPayment } from '../../Utils/paymentGateway';
import { getServices } from '../../Api/catalogApi';
import { typography } from '../../theme/typography';

function formatFeeAmount(amount, currency) {
  if (amount == null) return '';
  const symbol = currency === 'INR' ? '₹' : '$';
  return `${symbol}${Number(amount).toFixed(2)}`;
}

// Centered picker dialog with search — same pattern as ProfileAddress.js.
function PickerSheet({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SelectField({ label, value, placeholder, options, disabled, loading, onSelect, style, required }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const displayOptions = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;

  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      <TouchableOpacity
        style={[styles.selectBox, (disabled || loading) && styles.selectBoxDisabled]}
        disabled={disabled || loading}
        onPress={() => { setQuery(''); setOpen(true); }}
        activeOpacity={0.7}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#D94625" />
            <Text style={[styles.selectText, styles.placeholderText, { marginLeft: 8 }]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>
              {value || placeholder}
            </Text>
            <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
          </>
        )}
      </TouchableOpacity>

      <PickerSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.searchWrap}>
          <Icon name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.searchClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={displayOptions}
          keyExtractor={(item, index) => `${item}-${index}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => { onSelect(item); setOpen(false); }}
            >
              <Text style={[styles.modalOptionText, item === value && styles.modalOptionTextActive]}>{item}</Text>
              {item === value && <Icon name="check-circle" size={20} color="#D94625" />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No matches found.</Text>}
        />
      </PickerSheet>
    </View>
  );
}

// The "describe your request" form (custom-plan.png). Always attaches the
// shared quoted "Custom Task" catalog service (resolved below, same one
// OnboardingPayment.js's guest flow uses) so every submission goes through
// the fee-bearing branch of POST /customer/custom-plans (requires_payment /
// requires_membership) rather than the free "no service_id" branch — state/city
// still travel alongside it for vendor availability. The form always pays
// before the ticket is raised.
function CustomPlanNew({ navigation }) {
  const { create, createLoading, resetCreate } = useCustomPlans();
  const { verifyPayment: verifyBillingPayment } = useBilling();
  const { gateways, loading: gatewaysLoading } = usePaymentGateways();
  const user = useSelector(s => s.user.user);
  const { showAlert, alertProps } = useAppAlert();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [city, setCity] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  // Opening-fee checkout, when the API comes back with requires_payment
  // instead of a ticket (see handleSubmit below).
  const [checkoutSession, setCheckoutSession] = useState(null); // { url, paymentId }
  const [payingRazorpay, setPayingRazorpay] = useState(false);
  // True while re-polling verify() after a pendingCustomPlan webhook race.
  const [pollingPayment, setPollingPayment] = useState(false);
  // The shared quoted "Custom Task" catalog service — attaching its id is what
  // puts this request through the fee-bearing branch of POST
  // /customer/custom-plans (same service OnboardingPayment.js's guest flow
  // uses). Without a service_id the API creates the ticket for free, which is
  // NOT what this screen wants — every request here must carry the fee.
  const [customTaskServiceId, setCustomTaskServiceId] = useState(null);
  const [resolvingService, setResolvingService] = useState(true);
  // Live fee preview — POST /customer/custom-plans is the only endpoint that
  // returns the actual amount, so calling it IS the quote (it also saves the
  // draft server-side, per its own response message). Fetched once per
  // distinct set of field values (see `fingerprint` below) and reused at
  // submit time instead of calling create() a second time.
  const [quote, setQuote] = useState(null); // { fingerprint, ...create() result }
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const lastFetchedFingerprintRef = useRef(null);

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const { cities, cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useCities(stateVal);

  useEffect(() => {
    if (gateways.length && !gateways.some(g => g.value === paymentMethod)) {
      setPaymentMethod(gateways[0].value);
    }
  }, [gateways, paymentMethod]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const services = await getServices({ search: 'Custom Task' });
        const target = services.find(s => s.pricing?.isQuoted) || services[0];
        if (!cancelled) setCustomTaskServiceId(target?.id || null);
      } catch {
        if (!cancelled) setCustomTaskServiceId(null);
      } finally {
        if (!cancelled) setResolvingService(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stateId = stateVal ? states.find(s => s.name === stateVal)?.id : null;
  const cityId = city ? cities.find(c => c.name === city)?.id : null;

  const isValid = subject.trim().length > 0 && message.trim().length > 0 && !!stateId && !!cityId && !!paymentMethod && !!customTaskServiceId;
  const busy = createLoading || payingRazorpay || pollingPayment || resolvingService || quoteLoading;

  // Identifies which exact field values a fetched quote/draft belongs to —
  // so a stale quote (fields edited after fetching) is never charged against.
  const fieldsFingerprint = `${subject.trim()}|${message.trim()}|${stateId || ''}|${cityId || ''}|${paymentMethod}`;

  const fetchQuote = async (fingerprint) => {
    setQuoteLoading(true);
    setQuoteError(null);
    try {
      const result = await create({
        subject: subject.trim(),
        message: message.trim(),
        serviceId: customTaskServiceId,
        stateId,
        cityId,
        gateway: paymentMethod,
      }).unwrap();
      lastFetchedFingerprintRef.current = fingerprint;
      setQuote({ fingerprint, ...result });
    } catch (error) {
      setQuoteError(error?.message || "Couldn't calculate the fee for this request.");
    } finally {
      setQuoteLoading(false);
    }
  };

  // Debounced live fee preview — waits for the user to stop typing/selecting
  // before calling create() again, so a fresh draft isn't saved on every
  // keystroke.
  useEffect(() => {
    if (!isValid || lastFetchedFingerprintRef.current === fieldsFingerprint) return;
    const timer = setTimeout(() => fetchQuote(fieldsFingerprint), 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isValid, fieldsFingerprint]);

  // Deep-links into the newly created ticket once payment settles. Retries a
  // few times if the backend hasn't raised the SupportTicket yet — the rare
  // webhook race verifyPayment's `pendingCustomPlan` flags (see paymentsApi.js);
  // normally customPlanTicket is already populated on the first call.
  const finishAfterPayment = async (data, attempt = 0) => {
    if (data?.customPlanTicket) {
      resetCreate();
      showAlert(
        'Request Submitted',
        `Your custom plan request ${data.customPlanTicket.ticketNumber} has been created.`,
        [{ text: 'OK', onPress: () => navigation.replace('SupportTicketChat', { ticketId: data.customPlanTicket.id, createdTicketNumber: data.customPlanTicket.ticketNumber, kind: 'custom_plan' }) }]
      );
      return;
    }
    if (data?.pendingCustomPlan && attempt < 5) {
      setPollingPayment(true);
      setTimeout(async () => {
        try {
          const retryResult = await verifyBillingPayment({ paymentId: data.pendingCustomPlan.paymentId }).unwrap();
          await finishAfterPayment(retryResult?.data, attempt + 1);
        } catch (error) {
          setPollingPayment(false);
          showAlert('Could Not Confirm', error?.message || 'Please check My Requests in a moment.');
        }
      }, 2500);
      return;
    }
    setPollingPayment(false);
    showAlert('Payment Received', "Your payment was received. If your request doesn't appear shortly, please check My Requests.");
    navigation.goBack();
  };

  const handleCheckoutSuccess = async (sessionId) => {
    const session = checkoutSession;
    setCheckoutSession(null);
    try {
      const result = await verifyBillingPayment({ paymentId: session?.paymentId, sessionId }).unwrap();
      await finishAfterPayment(result?.data);
    } catch (error) {
      showAlert('Verification Failed', error?.message || 'Could not verify this payment yet. Please try again in a moment.');
    }
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      // Reuse the already-fetched quote/draft if it matches exactly what's on
      // screen right now — avoids saving a second draft / opening a second
      // payment order for the same request.
      const result = (quote && quote.fingerprint === fieldsFingerprint)
        ? quote
        : await create({
            subject: subject.trim(),
            message: message.trim(),
            serviceId: customTaskServiceId,
            stateId,
            cityId,
            gateway: paymentMethod,
          }).unwrap();

      if (result.ticket) {
        resetCreate();
        showAlert(
          'Request Submitted',
          `Your custom plan request ${result.ticket.ticketNumber} has been created.`,
          [{ text: 'OK', onPress: () => navigation.replace('SupportTicketChat', { ticketId: result.ticket.id, createdTicketNumber: result.ticket.ticketNumber, kind: 'custom_plan' }) }]
        );
        return;
      }

      if (result.requiresPayment) {
        // The consultation fee to open this request — pay via the chosen
        // gateway. verifyPayment's customPlanTicket/pendingCustomPlan (see
        // finishAfterPayment) is what actually confirms the ticket exists.
        if (result.checkoutUrl) {
          setCheckoutSession({ url: result.checkoutUrl, paymentId: result.paymentId });
        } else if (result.order) {
          setPayingRazorpay(true);
          try {
            const verifyResult = await runRazorpayPayment({
              order: result.order,
              paymentId: result.paymentId,
              name: 'Custom Plan Request',
              description: subject.trim(),
              user: { name: user?.name, email: user?.email, phone: user?.phone },
              verify: (params) => verifyBillingPayment(params).unwrap(),
            });
            await finishAfterPayment(verifyResult?.data);
          } catch (error) {
            // A dead/failed order shouldn't be silently reused — clear the
            // cached quote so a retry fetches a fresh one.
            setQuote(null);
            lastFetchedFingerprintRef.current = null;
            showAlert('Payment Failed', error?.message || 'Could not complete payment. Please try again.');
          } finally {
            setPayingRazorpay(false);
          }
        } else {
          showAlert('Could Not Submit', 'No payment method is available right now. Please try again later.');
        }
        return;
      }

      if (result.requiresMembership) {
        showAlert('Membership Required', 'An active membership is required to open a custom plan request. Please complete your membership first.');
        return;
      }

      // Neither a ticket nor a payment/membership branch — surface anything
      // else rather than silently doing nothing.
      showAlert('Could Not Submit', 'Unexpected response from the server. Please try again.');
    } catch (error) {
      showAlert('Could Not Submit', error?.message || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header navigation={navigation} title="New Custom Plan Request" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.infoRow}>
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => setInfoOpen(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="info-outline" size={18} color="#D94625" />
            <Text style={styles.infoBtnText}>What's a custom plan?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.customPlanNote}>
            Where would this custom plan take place? This helps us check vendor availability there.
          </Text>
          <View style={styles.row}>
            <SelectField
              label="State"
              value={stateVal}
              placeholder="Select state..."
              options={stateNames}
              loading={loadingStates}
              onSelect={(v) => { setStateVal(v); setCity(''); }}
              style={styles.rowItem}
              required
            />
            <SelectField
              label="City"
              value={city}
              placeholder={stateVal ? 'Select city...' : 'Select state first...'}
              options={cityNames}
              disabled={!stateVal}
              loading={loadingCities}
              onSelect={setCity}
              style={styles.rowItem}
              required
            />
          </View>
          {statesFailed && (
            <TouchableOpacity onPress={retryStates}>
              <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          {citiesFailed && (
            <TouchableOpacity onPress={retryCities}>
              <Text style={styles.retryText}>Couldn't load cities. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.paymentNote}>
              You'll pay{' '}
              {(quoteLoading || quote?.amount != null || quote?.fee?.amount != null) && (
                <Text style={styles.paymentAmount}>
                  {quoteLoading
                    ? '…'
                    : formatFeeAmount(quote?.amount ?? quote?.fee?.amount, quote?.currency ?? quote?.fee?.currency)}
                  {' '}
                </Text>
              )}
              a consultation fee now to open this request — not the price for the work itself.
            </Text>
            {quoteError && (
              <TouchableOpacity onPress={() => fetchQuote(fieldsFingerprint)}>
                <Text style={styles.retryText}>{quoteError} Tap to retry.</Text>
              </TouchableOpacity>
            )}
            {gatewaysLoading ? (
              <ActivityIndicator size="small" color="#D94625" style={{ marginTop: 8 }} />
            ) : gateways.length === 0 ? (
              <Text style={styles.retryText}>No payment method is available right now.</Text>
            ) : (
              gateways.map(g => {
                const selected = g.value === paymentMethod;
                return (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.gatewayRow, selected && styles.gatewayRowActive]}
                    onPress={() => setPaymentMethod(g.value)}
                    activeOpacity={0.8}
                  >
                    <Icon name={gatewayIcon(g.value)} size={18} color="#D94625" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.gatewayLabel}>{g.label}</Text>
                      {!!GATEWAY_META[g.value]?.desc && <Text style={styles.gatewayDesc}>{GATEWAY_META[g.value].desc}</Text>}
                    </View>
                    <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
                      {selected && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you need?"
              placeholderTextColor="#94A3B8"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your request in detail..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={6}
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, (!isValid || busy) && styles.submitBtnDisabled]}
              disabled={!isValid || busy}
              onPress={handleSubmit}
            >
              {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Pay & Submit Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setInfoOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.infoModalCard} onPress={() => {}}>
            <View style={styles.infoIconCircle}>
              <Icon name="info-outline" size={26} color="#D94625" />
            </View>
            <Text style={styles.infoModalTitle}>What's a custom plan?</Text>
            <Text style={styles.infoModalText}>
              Something bespoke that's not a specific catalog service — describe what you need and where it
              would happen, and our team will review it and quote a price.
            </Text>
            <TouchableOpacity style={styles.infoModalCloseBtn} onPress={() => setInfoOpen(false)} activeOpacity={0.9}>
              <Text style={styles.infoModalCloseText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <StripeCheckoutModal
        visible={!!checkoutSession}
        checkoutUrl={checkoutSession?.url}
        title="Pay Opening Fee"
        onSuccess={handleCheckoutSuccess}
        onCancel={() => setCheckoutSession(null)}
      />

      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 16 },

  infoRow: { flexDirection: 'row', paddingHorizontal: 4 },
  infoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF1E8', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  infoBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#D94625' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  fieldWrap: { gap: 8 },
  label: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  required: { color: '#DC2626' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    minHeight: 140,
  },

  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: '#F8FAFC',
  },
  selectBoxDisabled: { opacity: 0.6 },
  selectText: { fontSize: 15, color: '#0F172A', flex: 1 },
  placeholderText: { color: '#94A3B8' },

  customPlanNote: { ...typography.small, color: '#64748B', lineHeight: 20 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  retryText: { fontSize: 13, color: '#D94625', fontFamily: typography.labelMedium.fontFamily },

  paymentNote: { ...typography.small, color: '#64748B', lineHeight: 18, marginTop: -2, flexShrink: 1 },
  paymentAmount: { fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', fontWeight: '700' },
  feeCalcRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  gatewayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 8,
    backgroundColor: '#F8FAFC',
  },
  gatewayRowActive: { borderColor: '#D94625', backgroundColor: '#FFF1E8' },
  gatewayLabel: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  gatewayDesc: { fontSize: 12, color: '#64748B', marginTop: 1 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#CBD5E1', alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: '#D94625' },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D94625' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '78%', backgroundColor: '#FFFFFF', borderRadius: 24, paddingTop: 18, paddingBottom: 12, overflow: 'hidden', elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  modalTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#1E293B', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', textAlign: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', marginHorizontal: 20, marginVertical: 12, borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1E293B', height: '100%' },
  searchClear: { marginLeft: 8, padding: 2 },
  listContent: { paddingBottom: 12 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalOptionText: { fontSize: 15, color: '#334155' },
  modalOptionTextActive: { color: '#D94625', fontFamily: typography.labelMedium.fontFamily },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 24, paddingHorizontal: 20, paddingBottom: 12 },

  infoModalCard: { width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', gap: 8, elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  infoIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  infoModalTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  infoModalText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  infoModalCloseBtn: { backgroundColor: '#D94625', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 12, marginTop: 10 },
  infoModalCloseText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },

  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { borderWidth: 1.5, borderColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 12, justifyContent: 'center' },
  cancelBtnText: { color: '#3B82F6', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
  submitBtn: { backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 26, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
});

export default CustomPlanNew;
