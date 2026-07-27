import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

function ProfilePersonal({ navigation }) {
  const [businessName, setBusinessName] = useState('Medical Service');
  const [contactPhone, setContactPhone] = useState('8888888888');
  const [contactEmail, setContactEmail] = useState('name@example.com');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('27ABCDE1234F1Z5');

  const handleSave = () => {
    if (!businessName.trim()) {
      Alert.alert('Required', 'Business name is required.');
      return;
    }
    Alert.alert('Saved', 'Your personal info has been updated.');
  };

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

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Changes</Text>
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
  label: { ...typography.labelMedium, color: colors.textSecondary, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, ...typography.body, color: colors.textPrimary },
  textArea: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
  hint: { ...typography.small, color: colors.textPlaceholder, marginTop: 6 },
  saveBtn: { backgroundColor: '#D94625', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', ...typography.labelLarge },
});

export default ProfilePersonal;
