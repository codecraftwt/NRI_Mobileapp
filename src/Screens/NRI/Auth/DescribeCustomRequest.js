import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../../Components/Header';
import AppAlert, { useAppAlert } from '../../../Components/AppAlert';
import { replyCustomPlan } from '../../../Redux/slices/customPlanSlice';
import { typography } from '../../../theme/typography';

// Final "one last step" of the guest "Request a Quote" + registration flow —
// the request's consultation fee was already paid (bundled into membership
// checkout) before the customer had a chance to say what they actually need,
// so the ticket was raised with a generic placeholder subject/message. This
// screen collects the real request and posts it as the ticket's first
// customer reply (there's no endpoint to rewrite the ticket's original
// subject/message after creation) — same visual shape as the web app's
// "Describe Your Custom Request" step.
function DescribeCustomRequest({ route, navigation }) {
  const { ticketId, serviceName, subject: initialSubject } = route.params || {};
  const dispatch = useDispatch();
  const { showAlert, alertProps } = useAppAlert();
  const [subject, setSubject] = useState(initialSubject || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goToDashboard = () => navigation.replace('AppHome');

  const handleSubmit = async () => {
    if (!message.trim() || submitting) return;
    setSubmitting(true);
    // The subject field can't actually rewrite the ticket's stored subject
    // (no update endpoint) — fold it into the reply text when the customer
    // changed it from the prefilled default, so it isn't silently dropped.
    const editedSubject = subject.trim() && subject.trim() !== (initialSubject || '').trim();
    const text = editedSubject ? `${subject.trim()}\n\n${message.trim()}` : message.trim();
    try {
      await dispatch(replyCustomPlan({ ticketId, message: text })).unwrap();
      showAlert('Request Submitted', 'Thanks — our team will review it and reply with a price.', [
        { text: 'OK', onPress: () => navigation.replace('AppHome', {
          screen: 'Services',
          params: { screen: 'SupportTicketChat', params: { ticketId, kind: 'custom_plan' } },
        }) },
      ]);
    } catch (error) {
      showAlert('Could Not Submit', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Header navigation={navigation} title="Describe Your Custom Request" showBack onBack={goToDashboard} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.banner}>
          <Icon name="check-circle" size={16} color="#15803D" />
          <Text style={styles.bannerText}>
            Payment received — your membership is active and the request fee for{' '}
            <Text style={styles.bannerBold}>{serviceName || 'Custom Task Service Request'}</Text>
            {' '}is paid. One last step: tell us what you need.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Requesting a quote for</Text>
          <Text style={styles.serviceName}>{serviceName || 'Custom Task Service Request'}</Text>

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
              placeholder="Describe what you need — our team will review it and reply with a price."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={6}
              value={message}
              onChangeText={setMessage}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (!message.trim() || submitting) && styles.submitBtnDisabled]}
            disabled={!message.trim() || submitting}
            onPress={handleSubmit}
            activeOpacity={0.9}
          >
            {submitting ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AppAlert {...alertProps} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { padding: 20, paddingBottom: 60, gap: 16 },

  banner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#DCFCE7', borderRadius: 14, padding: 14,
  },
  bannerText: { flex: 1, fontSize: 12.5, lineHeight: 18, color: '#15803D' },
  bannerBold: { fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, gap: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  label: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  serviceName: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A', marginTop: -8 },

  fieldWrap: { gap: 8 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, height: 52,
    fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC',
  },
  textArea: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 15, color: '#0F172A', backgroundColor: '#F8FAFC', textAlignVertical: 'top', minHeight: 140,
  },

  submitBtn: {
    alignSelf: 'flex-end', backgroundColor: '#D94625', borderRadius: 20,
    paddingHorizontal: 26, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', minWidth: 140,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
});

export default DescribeCustomRequest;
