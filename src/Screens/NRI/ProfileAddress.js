import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { saveUserProfile } from '../../Redux/slices/userSlice';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';

// Centered picker dialog — same shape as the SelectField/PickerSheet used in
// OnboardingProfile.js, so State/City here look and behave like onboarding.
function PickerSheet({ visible, onClose, title, children }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          {children}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SelectField({ label, value, placeholder, options, onSelect, loading, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const displayOptions = query ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBox, (loading || disabled) && styles.selectBoxDisabled]}
        onPress={() => { setQuery(''); setOpen(true); }}
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
            <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
          </>
        )}
      </TouchableOpacity>
      <PickerSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.searchWrap}>
          <Icon name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.searchClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <FlatList
          data={displayOptions}
          keyExtractor={(item, index) => `${item}-${index}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.modalOption} onPress={() => { onSelect(item); setOpen(false); }}>
              <Text style={[styles.modalOptionText, item === value && styles.modalOptionTextActive]}>{item}</Text>
              {item === value && <Icon name="check-circle" size={20} color="#1E3A8A" />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No matches found.</Text>}
        />
      </PickerSheet>
    </View>
  );
}

export default function ProfileAddress({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(s => s.user.user);
  const indiaAddress = user?.indiaAddress || {};

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();

  const [selectedState, setSelectedState] = useState(indiaAddress.state || '');
  const [selectedCity, setSelectedCity] = useState(indiaAddress.city || '');
  const [addressLine1, setAddressLine1] = useState(indiaAddress.line1 || '');
  const [addressLine2, setAddressLine2] = useState(indiaAddress.line2 || '');
  const [pincode, setPincode] = useState(indiaAddress.pincode || '');
  const [saving, setSaving] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const { showAlert, alertProps } = useAppAlert();

  const { cities, cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useCities(selectedState);

  const handleSelectState = (name) => {
    setSelectedState(name);
    setSelectedCity('');
  };

  const handleSave = async () => {
    const stateId = selectedState ? states.find(s => s.name === selectedState)?.id : undefined;
    const cityId = selectedCity ? cities.find(c => c.name === selectedCity)?.id : undefined;
    setSaving(true);
    try {
      await dispatch(saveUserProfile({
        indiaAddress: {
          stateId,
          cityId,
          pincode: pincode || undefined,
          line1: addressLine1 || undefined,
          line2: addressLine2 || undefined,
        },
      })).unwrap();
      showAlert('Saved', 'Your address in India has been updated successfully.');
    } catch (error) {
      showAlert('Could Not Save Address', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
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
        >
          <View style={styles.sectionCard}>
            {/* Info banner */}
            <View style={styles.bannerRow}>
              <TouchableOpacity
                style={styles.infoBtn}
                onPress={() => setInfoOpen(true)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="info-outline" size={16} color="#1E3A8A" />
                <Text style={styles.infoBtnText}>About this address</Text>
              </TouchableOpacity>
            </View>

            {/* Country (fixed to India, not editable) */}
            <Text style={styles.inputLabel}>Country</Text>
            <View style={[styles.selectBox, styles.readOnlyBox]}>
              <Text style={styles.selectText}>India</Text>
            </View>

            <Text style={styles.inputLabel}>Address Line 1</Text>
            <TextInput
              style={styles.input}
              value={addressLine1}
              onChangeText={setAddressLine1}
              placeholder="House / Flat / Street"
              placeholderTextColor="#94A3B8"
            />

            <Text style={styles.inputLabel}>Address Line 2</Text>
            <TextInput
              style={styles.input}
              value={addressLine2}
              onChangeText={setAddressLine2}
              placeholder="Area / Landmark (optional)"
              placeholderTextColor="#94A3B8"
            />

            {/* State + City — from GET /geo/states and GET /geo/cities */}
            <View style={styles.row}>
              <View style={styles.col}>
                <SelectField
                  label="State"
                  value={selectedState}
                  placeholder="Select State"
                  options={stateNames}
                  loading={loadingStates}
                  onSelect={handleSelectState}
                />
                {statesFailed && (
                  <TouchableOpacity onPress={retryStates}>
                    <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.col}>
                <SelectField
                  label="City"
                  value={selectedCity}
                  placeholder={selectedState ? 'Select City' : 'Select State first'}
                  options={cityNames}
                  loading={loadingCities}
                  disabled={!selectedState}
                  onSelect={setSelectedCity}
                />
                {citiesFailed && (
                  <TouchableOpacity onPress={retryCities}>
                    <Text style={styles.retryText}>Couldn't load cities. Tap to retry.</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <Text style={styles.inputLabel}>Pincode</Text>
            <TextInput
              style={styles.input}
              value={pincode}
              onChangeText={setPincode}
              placeholder="e.g. 400001"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
            />

            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Address</Text>}
            </TouchableOpacity>
          </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setInfoOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.infoModalCard} onPress={() => {}}>
            <View style={styles.infoIconCircle}>
              <Icon name="info-outline" size={26} color="#1E3A8A" />
            </View>
            <Text style={styles.infoModalTitle}>About This Address</Text>
            <Text style={styles.infoModalText}>
              Your address in India — where services and correspondence are directed. Your country of residence abroad is set under the NRI & Membership tab.
            </Text>
            <TouchableOpacity style={styles.infoModalCloseBtn} onPress={() => setInfoOpen(false)} activeOpacity={0.9}>
              <Text style={styles.infoModalCloseText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
  bannerRow: { flexDirection: 'row', marginBottom: 4 },
  infoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F1F5F9', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7,
  },
  infoBtnText: { fontSize: 12, fontWeight: '600', color: '#1E3A8A' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52, fontSize: 16, color: '#0F172A' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  fieldWrap: { gap: 0 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52 },
  selectBoxDisabled: { backgroundColor: '#E2E8F0' },
  readOnlyBox: { backgroundColor: '#F1F5F9' },
  selectText: { fontSize: 16, color: '#0F172A', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  retryText: { fontSize: 13, color: '#DC2626', marginTop: 8, marginBottom: 4 },
  saveBtn: { backgroundColor: '#A64416', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '78%', backgroundColor: '#FFFFFF', borderRadius: 24, paddingTop: 18, paddingBottom: 12, overflow: 'hidden', elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', textAlign: 'center' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', marginHorizontal: 20, marginVertical: 12, borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: '#1E293B', height: '100%' },
  searchClear: { marginLeft: 8, padding: 2 },
  listContent: { paddingBottom: 12 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalOptionText: { fontSize: 15, color: '#334155' },
  modalOptionTextActive: { color: '#1E3A8A', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 24, paddingHorizontal: 20, paddingBottom: 12 },

  infoModalCard: { width: '90%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, alignItems: 'center', gap: 8, elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  infoIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0E7FF', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  infoModalTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  infoModalText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  infoModalCloseBtn: { backgroundColor: '#A64416', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 12, marginTop: 10 },
  infoModalCloseText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
