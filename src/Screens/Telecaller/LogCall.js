import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  Pressable,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { getTelecallerCustomers } from '../../Api/Telecaller/telecallerCustomersApi';
import { getTelecallerVendors } from '../../Api/Telecaller/telecallerVendorsApi';
import {
  getTelecallerCallOptions,
  logTelecallerCall,
  getTelecallerCallHistory,
} from '../../Api/Telecaller/telecallerCallsApi';

const PARTY_TYPES = [
  { value: 'customer', label: 'Customer' },
  { value: 'vendor', label: 'Vendor' },
];

const DIRECTIONS = [
  { value: 'outbound', label: 'Outgoing (we called)' },
  { value: 'inbound', label: 'Incoming (they called)' },
];

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function LogCall({ route, navigation }) {
  const {
    initialPartyType = 'customer',
    initialPartyName = '',
    initialPhone = '',
    initialCustomerId = null,
    initialVendorId = null,
    initialTicketId = null,
    initialSupportTicketId = null,
    initialPurpose = 'general',
    initialQueueKey = null,
    initialFollowUpOf = null,
  } = route.params || {};

  // Card 1: Who was on the call
  const [partyType, setPartyType] = useState(initialPartyType);
  const [selectedParty, setSelectedParty] = useState(null);
  const [phone, setPhone] = useState(initialPhone);
  const [direction, setDirection] = useState('outbound');

  // Card 2: What happened
  const [purpose, setPurpose] = useState(initialPurpose);
  const [outcome, setOutcome] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  const [notes, setNotes] = useState('');

  // Card 3: Callback / follow-up
  const [callbackAt, setCallbackAt] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  // Card 4: Pass this on (optional)
  const [relayCustomer, setRelayCustomer] = useState(false);
  const [relayVendor, setRelayVendor] = useState(false);
  const [relayMessage, setRelayMessage] = useState('');

  // Earlier calls state
  const [earlierCalls, setEarlierCalls] = useState([]);
  const [loadingEarlierCalls, setLoadingEarlierCalls] = useState(false);

  // Dropdown options & lists
  const [customers, setCustomers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [options, setOptions] = useState({
    outcomes: [],
    purposes: [],
    partyTypes: [],
    directions: [],
  });

  // Modal selector
  // 'partyType' | 'partyPicker' | 'direction' | 'purpose' | 'outcome' | 'callbackDate' | null
  const [pickerModalType, setPickerModalType] = useState(null);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');

  // Date modal helper
  const [dateInput, setDateInput] = useState('');
  const [timeInput, setTimeInput] = useState('11:00');

  // Loading & Submitting
  const [loadingInit, setLoadingInit] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load initial options, customers, vendors
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInit(true);
        const [optsRes, custRes, vendRes] = await Promise.all([
          getTelecallerCallOptions().catch(() => ({ outcomes: [], purposes: [], partyTypes: [], directions: [] })),
          getTelecallerCustomers().catch(() => ({ customers: [] })),
          getTelecallerVendors().catch(() => ({ vendors: [] })),
        ]);

        setOptions(optsRes);
        const custList = custRes.customers || (Array.isArray(custRes) ? custRes : []);
        const vendList = vendRes.vendors || (Array.isArray(vendRes) ? vendRes : []);
        setCustomers(custList);
        setVendors(vendList);

        // Pre-select party if provided
        if (initialCustomerId) {
          const match = custList.find(c => c.id === initialCustomerId);
          if (match) {
            setSelectedParty(match);
            if (!initialPhone && match.phone) setPhone(match.phone);
          }
        } else if (initialVendorId) {
          const match = vendList.find(v => v.id === initialVendorId);
          if (match) {
            setSelectedParty(match);
            if (!initialPhone && match.phone) setPhone(match.phone);
          }
        } else if (initialPartyName) {
          setSelectedParty({ name: initialPartyName, phone: initialPhone });
        }
      } catch (err) {
        console.warn('Error loading options:', err);
      } finally {
        setLoadingInit(false);
      }
    }
    loadData();
  }, [initialCustomerId, initialVendorId, initialPartyName, initialPhone]);

  // Load Earlier Calls when selected customer / vendor changes
  useEffect(() => {
    async function loadEarlier() {
      if (partyType === 'customer' && selectedParty?.id) {
        try {
          setLoadingEarlierCalls(true);
          const res = await getTelecallerCallHistory({ customer_id: selectedParty.id });
          setEarlierCalls(res.calls || []);
        } catch {
          setEarlierCalls([]);
        } finally {
          setLoadingEarlierCalls(false);
        }
      } else {
        setEarlierCalls([]);
      }
    }
    loadEarlier();
  }, [selectedParty, partyType]);

  const handleCall = () => {
    if (!phone) {
      Alert.alert('No Phone', 'Please enter a phone number to call.');
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleSelectParty = (item) => {
    setSelectedParty(item);
    if (item.phone) setPhone(item.phone);
    setPickerModalType(null);
  };

  const handleSaveDateTime = () => {
    const combined = timeInput ? `${dateInput} ${timeInput}` : dateInput;
    setCallbackAt(combined);
    setPickerModalType(null);
  };

  const handleSubmit = async () => {
    if (!outcome) {
      Alert.alert('Validation Error', 'Please select a call Outcome.');
      return;
    }
    if (!phone && !selectedParty?.name) {
      Alert.alert('Validation Error', 'Please specify the customer or vendor.');
      return;
    }
    if (outcome === 'callback_requested' && !callbackAt) {
      Alert.alert('Validation Error', 'Please provide a callback date & time.');
      return;
    }

    const relayTo = [];
    if (relayCustomer) relayTo.push('customer');
    if (relayVendor) relayTo.push('vendor');

    try {
      setSubmitting(true);
      await logTelecallerCall({
        party_type: partyType,
        party_name: selectedParty?.name || selectedParty?.businessName || '',
        phone: phone,
        customer_id: partyType === 'customer' ? selectedParty?.id : null,
        vendor_id: partyType === 'vendor' ? selectedParty?.id : null,
        ticket_id: initialTicketId,
        support_ticket_id: initialSupportTicketId,
        direction: direction,
        purpose: purpose || 'general',
        outcome: outcome,
        duration_minutes: durationMinutes ? Number(durationMinutes) : 0,
        notes: notes.trim(),
        follow_up_at: callbackAt.trim() || null,
        follow_up_note: reminderNote.trim() || '',
        queue_key: initialQueueKey,
        follow_up_of: initialFollowUpOf,
        relay_to: relayTo,
        relay_message: relayMessage.trim() || '',
      });

      Alert.alert('Success', 'Call log has been successfully saved!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save call log.');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredParties = () => {
    const q = pickerSearchQuery.toLowerCase();
    if (partyType === 'customer') {
      return customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q) || (c.email || '').toLowerCase().includes(q));
    }
    return vendors.filter(v => (v.businessName || v.name || '').toLowerCase().includes(q) || (v.phone || '').includes(q));
  };

  const outcomeList = options.outcomes.length > 0 ? options.outcomes : [
    { value: 'connected', label: 'Connected' },
    { value: 'no_answer', label: 'No Answer' },
    { value: 'busy', label: 'Busy' },
    { value: 'callback_requested', label: 'Callback Requested' },
    { value: 'wrong_number', label: 'Wrong Number' },
    { value: 'not_interested', label: 'Not Interested' },
    { value: 'resolved', label: 'Resolved' },
  ];

  const purposeList = options.purposes.length > 0 ? options.purposes : [
    { value: 'general', label: 'General follow-up' },
    { value: 'customer_request', label: 'Customer request' },
    { value: 'onboarding', label: 'New sign-up' },
    { value: 'pending_payment', label: 'Pending payment' },
    { value: 'stuck_ticket', label: 'Stuck with vendor' },
    { value: 'feedback', label: 'Feedback call' },
    { value: 'renewal', label: 'Renewals due' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Log Call</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#EA580C" />
          <Text style={styles.loadingText}>Loading call form...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* CARD 1: Who was on the call */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Icon name="person" size={18} color="#20304C" />
              <Text style={styles.cardTitle}>Who was on the call</Text>
            </View>

            {/* Row 1: Party & Customer/Vendor */}
            <View style={styles.rowTwoCols}>
              {/* Party Type */}
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Party</Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => setPickerModalType('partyType')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValText}>
                    {PARTY_TYPES.find(p => p.value === partyType)?.label || 'Customer'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Customer / Vendor Selector */}
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>{partyType === 'vendor' ? 'Vendor' : 'Customer'}</Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => {
                    setPickerSearchQuery('');
                    setPickerModalType('partyPicker');
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={selectedParty ? styles.dropdownValText : styles.dropdownPlaceholder}
                    numberOfLines={1}
                  >
                    {selectedParty?.name || selectedParty?.businessName || `Search ${partyType}s in your area...`}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 2: Phone number & Direction */}
            <View style={styles.rowTwoCols}>
              {/* Phone number with inline Call button */}
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Phone number</Text>
                <View style={styles.phoneInputWrap}>
                  <TextInput
                    style={styles.phoneTextInput}
                    placeholder="+91..."
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                  <TouchableOpacity
                    style={styles.inlineCallBtn}
                    onPress={handleCall}
                    activeOpacity={0.8}
                  >
                    <Icon name="call" size={13} color="#FFFFFF" />
                    <Text style={styles.inlineCallBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.helperText}>Opens your phone / softphone app.</Text>
              </View>

              {/* Direction */}
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Direction</Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => setPickerModalType('direction')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValText} numberOfLines={1}>
                    {DIRECTIONS.find(d => d.value === direction)?.label || 'Outgoing (we called)'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* CARD 2: What happened */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Icon name="chat-bubble-outline" size={18} color="#20304C" />
              <Text style={styles.cardTitle}>What happened</Text>
            </View>

            {/* Purpose, Outcome, Duration */}
            <View style={styles.rowThreeCols}>
              {/* Purpose */}
              <View style={styles.colThird}>
                <Text style={styles.inputLabel}>Purpose <Text style={styles.requiredStar}>*</Text></Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => setPickerModalType('purpose')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValText} numberOfLines={1}>
                    {purposeList.find(p => p.value === purpose)?.label || 'General follow-up'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Outcome */}
              <View style={styles.colThird}>
                <Text style={styles.inputLabel}>Outcome <Text style={styles.requiredStar}>*</Text></Text>
                <TouchableOpacity
                  style={[styles.dropdownInput, !outcome && { borderColor: '#EA580C' }]}
                  onPress={() => setPickerModalType('outcome')}
                  activeOpacity={0.7}
                >
                  <Text style={outcome ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                    {outcomeList.find(o => o.value === outcome)?.label || 'Select...'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={18} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              {/* Duration (min) */}
              <View style={styles.colThird}>
                <Text style={styles.inputLabel}>Duration (min)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 2"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.fullWidthField}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={styles.textAreaInput}
                placeholder="What was discussed / agreed?"
                placeholderTextColor="#94A3B8"
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* CARD 3: Callback / follow-up */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Icon name="alarm" size={18} color="#20304C" />
              <Text style={styles.cardTitle}>Callback / follow-up</Text>
            </View>

            <View style={styles.rowTwoCols}>
              {/* Call back at (IST) */}
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Call back at (IST)</Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => {
                    setDateInput(callbackAt ? callbackAt.split(' ')[0] : new Date().toISOString().slice(0, 10));
                    setPickerModalType('callbackDate');
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={callbackAt ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                    {callbackAt || 'dd-mm-yyyy --:--'}
                  </Text>
                  <Icon name="calendar-today" size={16} color="#94A3B8" />
                </TouchableOpacity>
                <Text style={styles.helperText}>
                  You'll get a notification when it's due, and it appears under Callbacks Due in the Call Centre.
                </Text>
              </View>

              {/* Reminder note */}
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Reminder note</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Customer will confirm payment after 6pm"
                  placeholderTextColor="#94A3B8"
                  value={reminderNote}
                  onChangeText={setReminderNote}
                />
              </View>
            </View>
          </View>

          {/* CARD 4: Pass this on (optional) */}
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Icon name="share" size={18} color="#20304C" />
              <Text style={styles.cardTitle}>Pass this on <Text style={styles.optionalTag}>(optional)</Text></Text>
            </View>

            {/* Checkbox row */}
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={styles.checkboxItem}
                onPress={() => setRelayCustomer(prev => !prev)}
                activeOpacity={0.7}
              >
                <Icon
                  name={relayCustomer ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color={relayCustomer ? '#EA580C' : '#94A3B8'}
                />
                <Text style={styles.checkboxLabel}>Customer (visible update)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkboxItem}
                onPress={() => setRelayVendor(prev => !prev)}
                activeOpacity={0.7}
              >
                <Icon
                  name={relayVendor ? 'check-box' : 'check-box-outline-blank'}
                  size={20}
                  color={relayVendor ? '#EA580C' : '#94A3B8'}
                />
                <Text style={styles.checkboxLabel}>Vendor</Text>
              </TouchableOpacity>
            </View>

            {/* Relay Message Textarea */}
            <View style={styles.fullWidthField}>
              <TextInput
                style={styles.textAreaInput}
                placeholder="Message to send — leave blank to send your call notes"
                placeholderTextColor="#94A3B8"
                value={relayMessage}
                onChangeText={setRelayMessage}
                multiline
                numberOfLines={3}
              />
              <Text style={styles.helperText}>
                Sent as an in-app notification. Only sent to parties linked to the person you pick.
              </Text>
            </View>
          </View>

          {/* CARD 5: Earlier calls */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Earlier calls</Text>
            {loadingEarlierCalls ? (
              <ActivityIndicator size="small" color="#EA580C" style={{ marginVertical: 10 }} />
            ) : earlierCalls.length > 0 ? (
              <View style={{ gap: 8, marginTop: 4 }}>
                {earlierCalls.slice(0, 3).map((c, idx) => (
                  <View key={String(c.id || idx)} style={styles.earlierCallItem}>
                    <View style={styles.earlierCallTop}>
                      <Text style={styles.earlierCallTitle}>{c.outcomeLabel} • {c.purposeLabel}</Text>
                      <Text style={styles.earlierCallDate}>{formatDate(c.createdAt)}</Text>
                    </View>
                    {c.notes ? <Text style={styles.earlierCallNotes} numberOfLines={2}>{c.notes}</Text> : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.noEarlierText}>
                {selectedParty ? `No earlier calls with this ${partyType}.` : `No earlier calls with this customer.`}
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check" size={18} color="#FFFFFF" />
                  <Text style={styles.saveBtnText}>Save Call</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Generic Selection Modal */}
      <Modal
        visible={!!pickerModalType && pickerModalType !== 'callbackDate'}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalType(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerModalType(null)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerModalType === 'partyType' && 'Select Party'}
                {pickerModalType === 'partyPicker' && `Select ${partyType === 'vendor' ? 'Vendor' : 'Customer'}`}
                {pickerModalType === 'direction' && 'Select Call Direction'}
                {pickerModalType === 'purpose' && 'Select Purpose'}
                {pickerModalType === 'outcome' && 'Select Outcome'}
              </Text>
              <TouchableOpacity onPress={() => setPickerModalType(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Box if party picker */}
            {pickerModalType === 'partyPicker' && (
              <View style={styles.modalSearchBox}>
                <Icon name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder={`Search ${partyType} by name or phone...`}
                  placeholderTextColor="#94A3B8"
                  value={pickerSearchQuery}
                  onChangeText={setPickerSearchQuery}
                />
              </View>
            )}

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {/* Party Type Options */}
              {pickerModalType === 'partyType' && (
                PARTY_TYPES.map(p => (
                  <TouchableOpacity
                    key={p.value}
                    style={styles.modalItemRow}
                    onPress={() => {
                      setPartyType(p.value);
                      setSelectedParty(null);
                      setPickerModalType(null);
                    }}
                  >
                    <Text style={styles.modalItemTitle}>{p.label}</Text>
                    {partyType === p.value && <Icon name="check" size={18} color="#EA580C" />}
                  </TouchableOpacity>
                ))
              )}

              {/* Direction Options */}
              {pickerModalType === 'direction' && (
                DIRECTIONS.map(d => (
                  <TouchableOpacity
                    key={d.value}
                    style={styles.modalItemRow}
                    onPress={() => {
                      setDirection(d.value);
                      setPickerModalType(null);
                    }}
                  >
                    <Text style={styles.modalItemTitle}>{d.label}</Text>
                    {direction === d.value && <Icon name="check" size={18} color="#EA580C" />}
                  </TouchableOpacity>
                ))
              )}

              {/* Purpose Options */}
              {pickerModalType === 'purpose' && (
                purposeList.map(p => (
                  <TouchableOpacity
                    key={p.value}
                    style={styles.modalItemRow}
                    onPress={() => {
                      setPurpose(p.value);
                      setPickerModalType(null);
                    }}
                  >
                    <Text style={styles.modalItemTitle}>{p.label}</Text>
                    {purpose === p.value && <Icon name="check" size={18} color="#EA580C" />}
                  </TouchableOpacity>
                ))
              )}

              {/* Outcome Options */}
              {pickerModalType === 'outcome' && (
                outcomeList.map(o => (
                  <TouchableOpacity
                    key={o.value}
                    style={styles.modalItemRow}
                    onPress={() => {
                      setOutcome(o.value);
                      setPickerModalType(null);
                    }}
                  >
                    <Text style={styles.modalItemTitle}>{o.label}</Text>
                    {outcome === o.value && <Icon name="check" size={18} color="#EA580C" />}
                  </TouchableOpacity>
                ))
              )}

              {/* Customer / Vendor Picker */}
              {pickerModalType === 'partyPicker' && (
                getFilteredParties().map((item, idx) => (
                  <TouchableOpacity
                    key={String(item.id || idx)}
                    style={styles.modalItemRow}
                    onPress={() => handleSelectParty(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalItemTitle}>{item.name || item.businessName}</Text>
                      {item.phone ? <Text style={styles.modalItemSub}>{item.phone}</Text> : null}
                      {item.email ? <Text style={styles.modalItemSub}>{item.email}</Text> : null}
                    </View>
                    <Icon name="chevron-right" size={18} color="#CBD5E1" />
                  </TouchableOpacity>
                ))
              )}

              {pickerModalType === 'partyPicker' && getFilteredParties().length === 0 && (
                <View style={styles.modalEmptyWrap}>
                  <Text style={styles.modalEmptyText}>No matching {partyType}s found</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Callback Date & Time Picker Modal */}
      <Modal
        visible={pickerModalType === 'callbackDate'}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerModalType(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerModalType(null)}>
          <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Callback Date & Time</Text>
              <TouchableOpacity onPress={() => setPickerModalType(null)}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12, gap: 12 }}>
              <View>
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  value={dateInput}
                  onChangeText={setDateInput}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Time (HH:mm)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="11:00"
                  placeholderTextColor="#94A3B8"
                  value={timeInput}
                  onChangeText={setTimeInput}
                />
              </View>

              {/* Quick shortcut date chips */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => {
                    const today = new Date().toISOString().slice(0, 10);
                    setDateInput(today);
                  }}
                >
                  <Text style={styles.quickDateChipText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setDateInput(d.toISOString().slice(0, 10));
                  }}
                >
                  <Text style={styles.quickDateChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    setDateInput(d.toISOString().slice(0, 10));
                  }}
                >
                  <Text style={styles.quickDateChipText}>In 3 Days</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveDateTime}>
              <Text style={styles.modalSaveBtnText}>Set Callback Time</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },

  blueHeader: {
    paddingTop: STATUS_BAR_HEIGHT + 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#20304C',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightPlaceholder: {
    width: 36,
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 60,
    gap: 14,
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  optionalTag: {
    fontSize: 11,
    fontWeight: 'normal',
    color: '#94A3B8',
  },

  // Layout Rows
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  colHalf: {
    flex: 1,
  },
  rowThreeCols: {
    flexDirection: 'row',
    gap: 10,
  },
  colThird: {
    flex: 1,
  },
  fullWidthField: {
    width: '100%',
  },

  // Labels & Inputs
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredStar: {
    color: '#DC2626',
  },
  helperText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 5,
    lineHeight: 15,
  },

  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  dropdownValText: {
    fontSize: 13,
    color: '#1E293B',
    flex: 1,
    marginRight: 4,
  },
  dropdownPlaceholder: {
    fontSize: 13,
    color: '#94A3B8',
    flex: 1,
    marginRight: 4,
  },

  textInput: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#1E293B',
  },
  textAreaInput: {
    height: 72,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1E293B',
    textAlignVertical: 'top',
  },

  // Phone input with inline Call button
  phoneInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingLeft: 12,
    paddingRight: 6,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
  },
  inlineCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  inlineCallBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  // Checkboxes
  checkboxRow: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 2,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkboxLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },

  // Earlier calls
  earlierCallItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  earlierCallTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earlierCallTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  earlierCallDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  earlierCallNotes: {
    fontSize: 11,
    color: '#475569',
  },
  noEarlierText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },

  // Action Buttons
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EA580C',
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  cancelBtnText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    maxWidth: 440,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginVertical: 10,
    gap: 6,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    paddingVertical: 0,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalItemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  modalEmptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  quickDateChip: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickDateChipText: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '600',
  },
  modalSaveBtn: {
    backgroundColor: '#20304C',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default LogCall;
