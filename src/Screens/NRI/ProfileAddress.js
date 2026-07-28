import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { updateAddress } from '../../Redux/slices/userSlice';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';

function SelectField({ label, value, placeholder, options, onSelect, loading, disabled }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBox, (loading || disabled) && styles.selectBoxDisabled]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        disabled={loading || disabled}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={[styles.selectText, styles.placeholderText, { marginLeft: 8 }]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>{value || placeholder}</Text>
            <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
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
                <TouchableOpacity style={styles.modalOption} onPress={() => { onSelect(item); setOpen(false); }}>
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color="#1E3A8A" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function ProfileAddress({ navigation }) {
  const user = useSelector(state => state.user.user);
  const dispatch = useDispatch();

  // This is the member's address in India — country is fixed to India.
  const country = 'India';
  const [state, setStateVal] = useState(user?.address?.state || '');
  const [city, setCity] = useState(user?.address?.city || '');
  const [postalCode, setPostalCode] = useState(user?.address?.postalCode || '');
  const [addressLine1, setAddressLine1] = useState(user?.address?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(user?.address?.addressLine2 || '');
  const { showAlert, alertProps } = useAppAlert();

  const { stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const { cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useCities(state);

  const handleSaveAddress = () => {
    dispatch(updateAddress({ country, state, district: '', city, postalCode, addressLine1, addressLine2 }));
    showAlert('Address Saved', 'Your address has been updated successfully.');
  };

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
          keyboardShouldPersistTaps="handled"
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

            {/* State + City */}
            <View style={styles.row}>
              <View style={styles.col}>
                <SelectField
                  label="State"
                  value={state}
                  placeholder="Select state..."
                  options={stateNames}
                  onSelect={(v) => { setStateVal(v); setCity(''); }}
                  loading={loadingStates}
                />
              </View>
              <View style={styles.col}>
                <SelectField
                  label="City"
                  value={city}
                  placeholder={state ? 'Select city...' : 'Select state first...'}
                  options={cityNames}
                  onSelect={setCity}
                  loading={loadingCities}
                  disabled={!state}
                />
              </View>
            </View>
            {statesFailed && (
              <TouchableOpacity onPress={retryStates}>
                <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
              </TouchableOpacity>
            )}
            {citiesFailed && (
              <TouchableOpacity onPress={retryCities}>
                <Text style={styles.retryText}>Couldn't load cities. Tap to retry.</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.inputLabel}>Pincode</Text>
            <TextInput style={styles.input} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" placeholderTextColor="#94A3B8" />

            <Text style={styles.inputLabel}>Address Line 1</Text>
            <TextInput style={styles.input} value={addressLine1} onChangeText={setAddressLine1} placeholderTextColor="#94A3B8" />

            <Text style={styles.inputLabel}>Address Line 2</Text>
            <TextInput style={styles.input} value={addressLine2} onChangeText={setAddressLine2} placeholderTextColor="#94A3B8" />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
              <Text style={styles.saveBtnText}>Save Address</Text>
            </TouchableOpacity>
          </View>
      </ScrollView>
      </KeyboardAvoidingView>
      <AppAlert {...alertProps} />
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
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52, fontSize: 16, color: '#0F172A' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  fieldWrap: { gap: 0 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52 },
  selectBoxDisabled: { backgroundColor: '#F1F5F9' },
  readOnlyBox: { backgroundColor: '#F1F5F9' },
  selectText: { fontSize: 16, color: '#0F172A', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  retryText: { fontSize: 13, color: '#DC2626', marginTop: 8, marginBottom: 4 },
  saveBtn: { backgroundColor: '#A64416', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 24, alignSelf: 'flex-start', paddingHorizontal: 40 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 32, paddingTop: 12 },
  modalHandle: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 16, color: '#1E293B' },
});
