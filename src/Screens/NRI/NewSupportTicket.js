import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useSupportTickets } from '../../Hooks/useSupportTickets';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';
import { typography } from '../../theme/typography';

// Picking the "Customize Plan" category routes the ticket through the
// backend's Custom Plan flow (category=custom_plan), which also needs the
// state + city where the plan would take place. The list of "Raise Ticket to"
// options itself comes from the support-tickets API (category / category_label).
const CUSTOM_PLAN_VALUE = 'custom_plan';
const GENERAL_VALUE = 'general';

// Reusable bottom-sheet dropdown field (same pattern as AddProperty's SelectField).
function SelectField({ label, value, placeholder, options, disabled, loading, onSelect, style }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBox, (disabled || loading) && styles.selectBoxDisabled]}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
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

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => { onSelect(item); setOpen(false); }}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color="#D94625" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function NewSupportTicket({ navigation }) {
  const { create, createLoading, resetCreate, categories } = useSupportTickets();
  const [raiseTo, setRaiseTo] = useState(GENERAL_VALUE);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [city, setCity] = useState('');

  // Options come from the API (category / category_label); we track the
  // selected category `value` but show its `label` in the dropdown.
  const categoryLabels = categories.map(c => c.label);
  const selectedLabel = categories.find(c => c.value === raiseTo)?.label || '';
  const isCustomPlan = raiseTo === CUSTOM_PLAN_VALUE;

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const { cities, cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useCities(stateVal);

  const stateId = stateVal ? states.find(s => s.name === stateVal)?.id : null;
  const cityId = city ? cities.find(c => c.name === city)?.id : null;

  const isValid = subject.trim().length > 0
    && message.trim().length > 0
    && (!isCustomPlan || (!!stateId && !!cityId));

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      const result = await create({
        subject: subject.trim(),
        message: message.trim(),
        category: raiseTo && raiseTo !== GENERAL_VALUE ? raiseTo : undefined,
        stateId: isCustomPlan ? stateId : undefined,
        cityId: isCustomPlan ? cityId : undefined,
      }).unwrap();
      resetCreate();
      navigation.replace('SupportTicketChat', { ticketId: result.ticket.id, createdTicketNumber: result.ticket.ticketNumber });
    } catch (error) {
      Alert.alert('Could Not Create Ticket', error?.message || 'Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="New Support Ticket" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.noteBanner}>
          <Text style={styles.noteText}>
            For a question about a specific service request, use the <Text style={styles.noteBold}>Support Chat</Text> card on that request's page instead — this form is for general questions not tied to any request.
          </Text>
        </View>

        <View style={styles.card}>
          <SelectField
            label="Raise Ticket to"
            value={selectedLabel}
            placeholder="Select..."
            options={categoryLabels}
            onSelect={(label) => {
              const picked = categories.find(c => c.label === label);
              const value = picked?.value || GENERAL_VALUE;
              setRaiseTo(value);
              // Clear location when switching away from Custom Plan so a stale
              // state/city can't be submitted.
              if (value !== CUSTOM_PLAN_VALUE) { setStateVal(''); setCity(''); }
            }}
          />

          {isCustomPlan && (
            <>
              <Text style={styles.customPlanNote}>
                Where would this custom plan take place? This helps us check vendor availability there.
              </Text>
              <View style={styles.row}>
                <SelectField
                  label="State"
                  value={stateVal}
                  placeholder="Select State..."
                  options={stateNames}
                  loading={loadingStates}
                  onSelect={(v) => { setStateVal(v); setCity(''); }}
                  style={styles.rowItem}
                />
                <SelectField
                  label="City"
                  value={city}
                  placeholder="Select City..."
                  options={cityNames}
                  disabled={!stateVal}
                  loading={loadingCities}
                  onSelect={setCity}
                  style={styles.rowItem}
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
            </>
          )}

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              placeholder="What do you need help with?"
              placeholderTextColor="#94A3B8"
              value={subject}
              onChangeText={setSubject}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Describe your question in detail..."
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
              style={[styles.submitBtn, (!isValid || createLoading) && styles.submitBtnDisabled]}
              disabled={!isValid || createLoading}
              onPress={handleSubmit}
            >
              {createLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Submit</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 16 },

  noteBanner: { paddingHorizontal: 4 },
  noteText: { ...typography.small, color: '#64748B', lineHeight: 20 },
  noteBold: { fontFamily: typography.labelMedium.fontFamily, color: '#334155' },

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

  // "Raise Ticket to" / State / City dropdown trigger
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

  customPlanNote: { ...typography.small, color: '#64748B', lineHeight: 20, marginTop: -8 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  retryText: { fontSize: 13, color: '#D94625', fontFamily: typography.labelMedium.fontFamily },

  // dropdown bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '60%' },
  modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A', marginBottom: 8 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 15, color: '#0F172A' },

  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { borderWidth: 1.5, borderColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 12, justifyContent: 'center' },
  cancelBtnText: { color: '#3B82F6', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
  submitBtn: { backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 26, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
});

export default NewSupportTicket;
