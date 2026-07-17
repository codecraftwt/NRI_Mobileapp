import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const FIELDS = [
  { label: 'Full Name', value: 'Ramesh Ambekar' },
  { label: 'Phone', value: '+91 98220 XXXXX' },
  { label: 'Email', value: 'ramesh.a@example.com' },
  { label: 'Skill / Specialization', value: 'Elderly Care Executive' },
  { label: 'Service Area', value: 'Kolhapur, Maharashtra' },
];

function ProfilePersonal({ navigation }) {
  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Personal Info" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          {FIELDS.map(field => (
            <View key={field.label}>
              <Text style={styles.inputLabel}>{field.label}</Text>
              <View style={styles.valueBox}>
                <Text style={styles.valueText}>{field.value}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Edit Personal Info</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  inputLabel: { ...typography.labelMedium, color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
  valueBox: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, height: 50, justifyContent: 'center' },
  valueText: { ...typography.body, color: colors.textPrimary },
  saveBtn: { backgroundColor: '#D94625', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', ...typography.labelLarge },
});

export default ProfilePersonal;
