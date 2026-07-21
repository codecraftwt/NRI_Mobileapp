import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Header from '../../Components/Header';
import { useSupportTickets } from '../../Hooks/useSupportTickets';
import { typography } from '../../theme/typography';

function NewSupportTicket({ navigation }) {
  const { create, createLoading, resetCreate } = useSupportTickets();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const isValid = subject.trim().length > 0 && message.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;
    try {
      const result = await create(subject.trim(), message.trim()).unwrap();
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
  actionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: { borderWidth: 1.5, borderColor: '#3B82F6', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 12, justifyContent: 'center' },
  cancelBtnText: { color: '#3B82F6', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
  submitBtn: { backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 26, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', minWidth: 90 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
});

export default NewSupportTicket;
