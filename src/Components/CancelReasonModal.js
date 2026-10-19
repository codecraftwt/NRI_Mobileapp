import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../theme/typography';

const MIN_LEN = 5;
const MAX_LEN = 1000;

// Required-reason confirm step shared by all three "stop auto-renewal"
// actions (membership, a single recurring service, cancel-all) — the backend
// 422s each of those endpoints without a `reason` (5-1000 chars), so this
// gates the call client-side with the same copy/thresholds, and surfaces the
// server's own message via `serverError` if it still 422s. `subjectText`
// names what's being stopped (e.g. "your membership", "Periodic Inspection",
// "your membership and all recurring service subscriptions") and is bolded
// inline in the first sentence, matching the website's copy.
export default function CancelReasonModal({ visible, loading, serverError, subjectText, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason('');
      setTouched(false);
    }
  }, [visible]);

  const trimmed = reason.trim();
  const localError = touched
    ? (trimmed.length === 0
        ? 'Please tell us why you want to stop auto-renewal.'
        : trimmed.length < MIN_LEN
          ? 'Please give a little more detail (at least 5 characters).'
          : null)
    : null;
  const errorText = serverError || localError;

  const handleConfirm = () => {
    setTouched(true);
    if (trimmed.length < MIN_LEN) return;
    onConfirm(trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={loading ? undefined : onClose} />
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Stop auto-renewal</Text>
            <TouchableOpacity onPress={onClose} disabled={loading} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerDivider} />

          <Text style={styles.message}>
            {!!subjectText && (
              <>You're stopping auto-renewal for <Text style={styles.messageBold}>{subjectText}</Text>. </>
            )}
            You won't be charged again, and anything you've already paid for stays active until the end of its current period.
          </Text>

          <Text style={styles.label}>Why do you want to stop auto-renewal?<Text style={styles.required}> *</Text></Text>
          <TextInput
            style={[styles.input, !!errorText && styles.inputError]}
            value={reason}
            onChangeText={setReason}
            onBlur={() => setTouched(true)}
            placeholder="e.g. I'm moving back to India / no longer need this service"
            placeholderTextColor="#94A3B8"
            multiline
            maxLength={MAX_LEN}
            editable={!loading}
          />
          {!!errorText && <Text style={styles.errorText}>{errorText}</Text>}

          <View style={styles.actionsDivider} />
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={[styles.button, styles.buttonCancel]} onPress={onClose} disabled={loading} activeOpacity={0.75}>
              <Text style={[styles.buttonText, styles.buttonTextCancel]}>Keep auto-renewal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.buttonDestructive]} onPress={handleConfirm} disabled={loading} activeOpacity={0.75}>
              {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={[styles.buttonText, styles.buttonTextDestructive]}>Stop auto-renewal</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...typography.h4, color: '#0F172A' },
  headerDivider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 16, marginHorizontal: -24 },
  message: { ...typography.body, color: '#64748B', marginTop: 16, lineHeight: 20 },
  messageBold: { fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', fontWeight: '700' },
  label: { ...typography.labelMedium, color: '#0F172A', marginTop: 18, marginBottom: 8 },
  required: { color: '#DC2626' },
  input: {
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 90,
    textAlignVertical: 'top',
    ...typography.body,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputError: { borderColor: '#EF4444' },
  errorText: { ...typography.small, color: '#EF4444', marginTop: 6 },
  actionsDivider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 20, marginHorizontal: -24 },
  buttonGroup: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 },
  button: { borderRadius: 24, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  buttonCancel: { backgroundColor: '#F1F5F9' },
  buttonDestructive: { backgroundColor: '#EF4444' },
  buttonText: { ...typography.labelLarge },
  buttonTextCancel: { color: '#0F172A' },
  buttonTextDestructive: { color: '#FFFFFF' },
});
