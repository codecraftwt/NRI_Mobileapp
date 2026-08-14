import React from 'react';
import { StyleSheet, Text, View, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme/typography';

function ReadOnlyField({ label, value, placeholder }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.selectBox, styles.readOnlyBox]}>
        <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>{value || placeholder}</Text>
      </View>
    </View>
  );
}

export default function ProfileAddress({ navigation }) {
  // Same source Services.js uses for "Select Location" — the pincode lookup
  // there (LocationPickerModal) writes state/city into this slice. There's no
  // backend endpoint for it, so this screen just mirrors that client-side
  // value instead of hitting an API of its own.
  const savedLocation = useSelector(s => s.serviceLocation);

  const country = 'India';
  const state = savedLocation?.stateName || '';
  const city = savedLocation?.cityName || '';
  const postalCode = savedLocation?.pincode || '';

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Address" showBack={true} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionCard}>
            {/* Info banner */}
            <View style={styles.banner}>
              <Icon name="info-outline" size={16} color="#64748B" style={{ marginTop: 1 }} />
              <Text style={styles.bannerText}>
                Your address in India — where services and correspondence are directed. Your country of residence abroad is set under the NRI & Membership tab.
              </Text>
            </View>

            {/* Country (fixed to India) */}
            <Text style={styles.inputLabel}>Country</Text>
            <View style={[styles.selectBox, styles.readOnlyBox]}>
              <Text style={styles.selectText}>{country}</Text>
            </View>

            {/* State + City — from the last "Select Location" pincode lookup */}
            <View style={styles.row}>
              <View style={styles.col}>
                <ReadOnlyField label="State" value={state} placeholder="Not set" />
              </View>
              <View style={styles.col}>
                <ReadOnlyField label="City" value={city} placeholder="Not set" />
              </View>
            </View>

            <ReadOnlyField label="Pincode" value={postalCode} placeholder="Not set" />
          </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 20 },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, gap: 4,
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
    borderWidth: 1, borderColor: '#E0E7FF'
  },
  banner: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 12, marginBottom: 4 },
  bannerText: { flex: 1, fontSize: 12, color: '#64748B', lineHeight: 17 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 12 },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  fieldWrap: { gap: 0 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52 },
  readOnlyBox: { backgroundColor: '#F1F5F9' },
  selectText: { fontSize: 16, color: '#0F172A', flex: 1 },
  placeholderText: { color: '#94A3B8' },
});
