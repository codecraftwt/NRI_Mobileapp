import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useSupportTickets } from '../../Hooks/useSupportTickets';
import { typography } from '../../theme/typography';

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
  const { showAlert, alertProps } = useAppAlert();
  const [raiseTo, setRaiseTo] = useState(GENERAL_VALUE);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [infoOpen, setInfoOpen] = useState(false);

  // Options come from the API (category / category_label); we track the
  // selected category `value` but show its `label` in the dropdown.
  const categoryLabels = categories.map(c => c.label);
  const selectedLabel = categories.find(c => c.value === raiseTo)?.label || '';

  const isValid = subject.trim().length > 0 && message.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      const result = await create({
        subject: subject.trim(),
        message: message.trim(),
        category: raiseTo || GENERAL_VALUE,
      }).unwrap();
      resetCreate();
      showAlert(
        'Ticket Created',
        `Your support ticket ${result.ticket.ticketNumber} has been created.`,
        [{ text: 'OK', onPress: () => navigation.replace('SupportTicketChat', { ticketId: result.ticket.id, createdTicketNumber: result.ticket.ticketNumber }) }]
      );
    } catch (error) {
      showAlert('Could Not Create Ticket', error?.message || 'Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header navigation={navigation} title="New Support Ticket" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.infoRow}>
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => setInfoOpen(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="info-outline" size={18} color="#D94625" />
            <Text style={styles.infoBtnText}>What's this form for?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <SelectField
            label="Raise Ticket to"
            value={selectedLabel}
            placeholder="Select..."
            options={categoryLabels}
            onSelect={(label) => {
              const picked = categories.find(c => c.label === label);
              setRaiseTo(picked?.value || GENERAL_VALUE);
            }}
          />

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

      <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
        <TouchableOpacity style={styles.infoModalOverlay} activeOpacity={1} onPress={() => setInfoOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.infoModalCard} onPress={() => {}}>
            <View style={styles.infoIconCircle}>
              <Icon name="info-outline" size={26} color="#D94625" />
            </View>
            <Text style={styles.infoModalTitle}>What's this form for?</Text>
            <Text style={styles.infoModalText}>
              For a question about a specific service request, use the{' '}
              <Text style={styles.infoModalTextBold}>Support Chat</Text> card on that request's page instead — this form is for general questions not tied to any request.
            </Text>
            <TouchableOpacity style={styles.infoModalCloseBtn} onPress={() => setInfoOpen(false)} activeOpacity={0.9}>
              <Text style={styles.infoModalCloseText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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

  // dropdown bottom sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '60%' },
  modalHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', marginBottom: 14 },
  modalTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A', marginBottom: 8 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 15, color: '#0F172A' },

  // "What's this form for?" info modal — centered, distinct from the bottom-sheet dropdown above.
  infoModalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  infoModalCard: { width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', gap: 8, elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  infoIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  infoModalTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  infoModalText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  infoModalTextBold: { fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  infoModalCloseBtn: { backgroundColor: '#D94625', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 12, marginTop: 10 },
  infoModalCloseText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },

  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { borderWidth: 1.5, borderColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 12, justifyContent: 'center' },
  cancelBtnText: { color: '#3B82F6', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
  submitBtn: { backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 26, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
});

export default NewSupportTicket;
