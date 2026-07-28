import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useVendorProfile } from '../../Hooks/useVendorProfile';

function BankDetails({ navigation }) {
  const { profile, loading, actionLoading, updateProfile } = useVendorProfile();
  const { showAlert, alertProps } = useAppAlert();

  const [payoutMethod, setPayoutMethod] = useState('bank'); // 'bank' | 'upi'
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  useEffect(() => {
    if (profile?.bank) {
      setBankName(profile.bank.bankName || '');
      setAccountHolder(profile.bank.accountName || '');
      setAccountNumber(profile.bank.accountNumber || '');
      setIfsc(profile.bank.ifsc || '');
      setUpiId(profile.bank.upiId || '');
      setPayoutMethod(profile.bank.upiId && !profile.bank.accountNumber ? 'upi' : 'bank');
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile({
        bank_name: bankName.trim(),
        bank_account_name: accountHolder.trim(),
        bank_account_number: accountNumber.trim(),
        bank_ifsc: ifsc.trim(),
        upi_id: upiId.trim(),
      }).unwrap();
      showAlert('Saved', 'Your payout details have been updated.');
    } catch (e) {
      showAlert('Update Failed', e?.message || 'Could not save. Please try again.');
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Bank & Payout Details" showBack />
        <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Bank & Payout Details" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <View style={styles.segment}>
            <TouchableOpacity
              style={[styles.segmentBtn, payoutMethod === 'bank' && styles.segmentBtnActive]}
              onPress={() => setPayoutMethod('bank')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, payoutMethod === 'bank' && styles.segmentTextActive]}>Bank transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentBtn, payoutMethod === 'upi' && styles.segmentBtnActive]}
              onPress={() => setPayoutMethod('upi')}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, payoutMethod === 'upi' && styles.segmentTextActive]}>UPI</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Bank name</Text>
          <TextInput style={styles.input} value={bankName} onChangeText={setBankName} placeholder="Bank name" placeholderTextColor={colors.textPlaceholder} />

          <Text style={styles.label}>Account holder name</Text>
          <TextInput style={styles.input} value={accountHolder} onChangeText={setAccountHolder} placeholder="Account holder name" placeholderTextColor={colors.textPlaceholder} />

          <Text style={styles.label}>Account number</Text>
          <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} placeholder="Account number" placeholderTextColor={colors.textPlaceholder} />

          <Text style={styles.label}>IFSC code</Text>
          <TextInput style={styles.input} value={ifsc} onChangeText={setIfsc} autoCapitalize="characters" placeholder="IFSC code" placeholderTextColor={colors.textPlaceholder} />
          <Text style={styles.hint}>or receive payouts via UPI</Text>

          <Text style={styles.label}>UPI ID</Text>
          <TextInput style={styles.input} value={upiId} onChangeText={setUpiId} autoCapitalize="none" placeholder="name@bank" placeholderTextColor={colors.textPlaceholder} />

          <TouchableOpacity style={[styles.saveBtn, actionLoading && styles.saveBtnDisabled]} onPress={handleSave} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Update Bank Details</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },

  segment: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  segmentBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: '#1E293B', borderColor: '#1E293B' },
  segmentText: { ...typography.labelMedium, color: colors.textSecondary },
  segmentTextActive: { color: '#FFFFFF' },

  label: { ...typography.labelMedium, color: colors.textSecondary, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, ...typography.body, color: colors.textPrimary },
  hint: { ...typography.small, color: colors.textPlaceholder, marginTop: 6 },
  saveBtn: { backgroundColor: '#D94625', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', ...typography.labelLarge },
});

export default BankDetails;
