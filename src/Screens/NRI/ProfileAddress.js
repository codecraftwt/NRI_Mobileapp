import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { updateAddress } from '../../Redux/slices/userSlice';
import { useCountries } from '../../Hooks/useCountries';
import { useStates } from '../../Hooks/useStates';
import { useDistricts } from '../../Hooks/useDistricts';
import { useCities } from '../../Hooks/useCities';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';

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
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.selectText, styles.placeholderText, { marginLeft: 8 }]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>{value || placeholder}</Text>
            <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
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
                  {item === value && <Icon name="check" size={18} color={colors.primary} />}
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

  const [country, setCountry] = useState(user?.address?.country || '');
  const [state, setStateVal] = useState(user?.address?.state || '');
  const [district, setDistrict] = useState(user?.address?.district || '');
  const [city, setCity] = useState(user?.address?.city || '');
  const [postalCode, setPostalCode] = useState(user?.address?.postalCode || '');
  const [addressLine1, setAddressLine1] = useState(user?.address?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(user?.address?.addressLine2 || '');
  const { showAlert, alertProps } = useAppAlert();

  const { countryNames, loading: loadingCountries, failed: countriesFailed, retry: retryCountries } = useCountries();
  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const { districtNames, loading: loadingDistricts, failed: districtsFailed, retry: retryDistricts } = useDistricts(state);
  const { cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useCities(state, district);
  const { loading: loadingPostalLookup, lookup: lookupPostalCode } = usePostalCodeLookup();

  const handleSaveAddress = () => {
    dispatch(updateAddress({ country, state, district, city, postalCode, addressLine1, addressLine2 }));
    showAlert('Address Saved', 'Your address has been updated successfully.');
  };

  const handleLookupPincode = () => {
    if (!postalCode || postalCode.trim().length < 4) {
      showAlert('Enter Postal Code', 'Please enter a valid postal code to look up.');
      return;
    }
    lookupPostalCode(postalCode.trim())
      .unwrap()
      .then((result) => {
        const match = result?.results?.[0];
        if (!match) {
          showAlert('Not Found', 'No address found for that postal code.');
          return;
        }
        if (match.stateName) setStateVal(match.stateName);
        if (match.districtName) setDistrict(match.districtName);
        if (match.cityName) setCity(match.cityName);
      })
      .catch((error) => {
        showAlert('Lookup Failed', error?.message || 'Could not look up that postal code. Please try again.');
      });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Address" showBack={true} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <SelectField
            label="Country of Residence"
            value={country}
            placeholder="Select Country"
            options={countryNames}
            onSelect={setCountry}
            loading={loadingCountries}
          />
          {countriesFailed && (
            <TouchableOpacity onPress={retryCountries}>
              <Text style={styles.retryText}>Couldn't load countries. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <SelectField
            label="State"
            value={state}
            placeholder="Select State"
            options={stateNames}
            onSelect={(v) => { setStateVal(v); setDistrict(''); setCity(''); }}
            loading={loadingStates}
          />
          {statesFailed && (
            <TouchableOpacity onPress={retryStates}>
              <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <SelectField
            label="District"
            value={district}
            placeholder="Select District"
            options={districtNames}
            onSelect={(v) => { setDistrict(v); setCity(''); }}
            loading={loadingDistricts}
          />
          {districtsFailed && (
            <TouchableOpacity onPress={retryDistricts}>
              <Text style={styles.retryText}>Couldn't load districts. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <SelectField
            label="City"
            value={city}
            placeholder="Select City"
            options={cityNames}
            onSelect={setCity}
            loading={loadingCities}
            disabled={!district}
          />
          {citiesFailed && (
            <TouchableOpacity onPress={retryCities}>
              <Text style={styles.retryText}>Couldn't load cities. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.inputLabel}>Postal Code</Text>
          <View style={styles.pincodeRow}>
            <TextInput style={[styles.input, styles.pincodeInput]} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" placeholderTextColor={colors.textPlaceholder} />
            <TouchableOpacity style={styles.lookupBtn} onPress={handleLookupPincode} disabled={loadingPostalLookup}>
              {loadingPostalLookup ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={styles.lookupBtnText}>Find</Text>}
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Address Line 1</Text>
          <TextInput style={styles.input} value={addressLine1} onChangeText={setAddressLine1} placeholderTextColor={colors.textPlaceholder} />

          <Text style={styles.inputLabel}>Address Line 2</Text>
          <TextInput style={styles.input} value={addressLine2} onChangeText={setAddressLine2} placeholderTextColor={colors.textPlaceholder} />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
            <Text style={styles.saveBtnText}>Save Address</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  inputLabel: { ...typography.labelMedium, color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, height: 50, ...typography.body, color: colors.textPrimary },
  pincodeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  pincodeInput: { flex: 1 },
  lookupBtn: { height: 50, minWidth: 80, borderRadius: 12, backgroundColor: colors.surfaceSecondary, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  lookupBtnText: { color: colors.primary, ...typography.labelLarge },
  fieldWrap: { gap: 0 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, height: 50 },
  selectBoxDisabled: { backgroundColor: colors.surfaceSecondary },
  selectText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  placeholderText: { color: colors.textPlaceholder },
  retryText: { ...typography.labelMedium, color: colors.error, marginTop: 8, marginBottom: 4 },
  saveBtn: { backgroundColor: '#D94625', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#FFFFFF', ...typography.labelLarge },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 32, paddingTop: 12 },
  modalHandle: { width: 48, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h4, color: colors.textPrimary, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.surfaceSecondary },
  modalOptionText: { ...typography.body, color: colors.textPrimary },
});
