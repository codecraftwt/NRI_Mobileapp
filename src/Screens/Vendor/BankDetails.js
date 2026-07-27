import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

function BankDetails({ navigation }) {
  const [payoutMethod, setPayoutMethod] = useState('bank'); // 'bank' | 'upi'
  const [bankName, setBankName] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [accountNumber, setAccountNumber] = useState('**** 4821');
  const [ifsc, setIfsc] = useState('');
  const [upiId, setUpiId] = useState('name@okhdfcbank');

  const handleSave = () => Alert.alert('Saved', 'Your payout details have been updated.');

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

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Update Bank Details</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  saveBtnText: { color: '#FFFFFF', ...typography.labelLarge },
});

export default BankDetails;
