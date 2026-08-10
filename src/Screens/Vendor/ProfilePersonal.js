import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useVendorProfile } from '../../Hooks/Vendor/useVendorProfile';

function ProfilePersonal({ navigation }) {
  const { profile, loading, actionLoading, updateProfile } = useVendorProfile();
  const { showAlert, alertProps } = useAppAlert();

  const [businessName, setBusinessName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');

  // Seed the form once the profile loads.
  useEffect(() => {
    if (profile) {
      setBusinessName(profile.businessName || '');
      setContactPhone(profile.contactPhone || '');
      setContactEmail(profile.contactEmail || '');
      setAddress(profile.address || '');
      setGstNumber(profile.gstNumber || '');
    }
  }, [profile]);

  const handleSave = async () => {
    if (!businessName.trim()) {
      showAlert('Required', 'Business name is required.');
      return;
    }
    try {
      await updateProfile({
        business_name: businessName.trim(),
        contact_phone: contactPhone.trim(),
        contact_email: contactEmail.trim(),
        address: address.trim(),
        gst_number: gstNumber.trim() || null,
      }).unwrap();
      showAlert('Saved', 'Your personal info has been updated.');
    } catch (e) {
      showAlert('Update Failed', e?.message || 'Could not save. Please try again.');
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Personal Info" showBack />
        <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Personal Info" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.label}>Business name *</Text>
          <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="Business name" placeholderTextColor={colors.textPlaceholder} />

          <Text style={styles.label}>Contact phone</Text>
          <TextInput style={styles.input} value={contactPhone} onChangeText={setContactPhone} keyboardType="phone-pad" placeholder="Contact phone" placeholderTextColor={colors.textPlaceholder} />

          <Text style={styles.label}>Contact email</Text>
          <TextInput style={styles.input} value={contactEmail} onChangeText={setContactEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@example.com" placeholderTextColor={colors.textPlaceholder} />

          <Text style={styles.label}>Address</Text>
          <TextInput style={[styles.input, styles.textArea]} value={address} onChangeText={setAddress} multiline numberOfLines={3} placeholder="Address" placeholderTextColor={colors.textPlaceholder} />

          <Text style={styles.label}>GST number (optional)</Text>
          <TextInput style={styles.input} value={gstNumber} onChangeText={setGstNumber} autoCapitalize="characters" placeholder="GSTIN" placeholderTextColor={colors.textPlaceholder} />
          <Text style={styles.hint}>If provided, your GSTIN appears on job invoices.</Text>

          <TouchableOpacity style={[styles.saveBtn, actionLoading && styles.saveBtnDisabled]} onPress={handleSave} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
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
  label: { ...typography.labelMedium, color: colors.textSecondary, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, ...typography.body, color: colors.textPrimary },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  hint: { ...typography.small, color: colors.textPlaceholder, marginTop: 6 },
  saveBtn: { backgroundColor: '#D94625', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#FFFFFF', ...typography.labelLarge },
});

export default ProfilePersonal;
