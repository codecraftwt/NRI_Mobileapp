import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Modal, FlatList, Platform, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import Header from '../../Components/Header';
import { updateProfile, updateAddress, logoutUser, changeUserPassword } from '../../Redux/slices/userSlice';
import { useCountries } from '../../Hooks/useCountries';
import { useStates } from '../../Hooks/useStates';
import { useDistricts } from '../../Hooks/useDistricts';
import { useCities } from '../../Hooks/useCities';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

function SelectField({ label, value, placeholder, options, onSelect, loading }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBox, loading && styles.selectBoxDisabled]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={[styles.selectText, styles.placeholderText, { marginLeft: 8 }]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>{value || placeholder}</Text>
            <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
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
                  {item === value && <Icon name="check" size={18} color="#007AFF" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const TABS = [
  { key: 'personal', label: 'Personal Info', icon: 'person-outline' },
  { key: 'address', label: 'Address', icon: 'place' },
  { key: 'password', label: 'Password', icon: 'lock-outline' },
];

function Profile({ navigation }) {
  const user = useSelector(state => state.user.user);
  const changePasswordStatus = useSelector(state => state.user.changePasswordStatus);
  const changingPassword = changePasswordStatus === 'loading';
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('personal');
  const [showDobPicker, setShowDobPicker] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.dob ? new Date(user.dob) : null);
  const [gender, setGender] = useState(user?.gender || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [emergencyName, setEmergencyName] = useState(user?.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContactPhone || '');

  const [country, setCountry] = useState(user?.address?.country || '');
  const [state, setStateVal] = useState(user?.address?.state || '');
  const [district, setDistrict] = useState(user?.address?.district || '');
  const [city, setCity] = useState(user?.address?.city || '');
  const [postalCode, setPostalCode] = useState(user?.address?.postalCode || '');
  const [addressLine1, setAddressLine1] = useState(user?.address?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(user?.address?.addressLine2 || '');

  const { countryNames, loading: loadingCountries, failed: countriesFailed, retry: retryCountries } = useCountries();
  const { stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const { districtNames, loading: loadingDistricts, failed: districtsFailed, retry: retryDistricts } = useDistricts(state);
  const { cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useCities(state, district);
  const { loading: loadingPostalLookup, lookup: lookupPostalCode } = usePostalCodeLookup();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});

  const clearPasswordError = (field) => {
    if (passwordErrors[field]) setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const passwordErrorFor = (field) => {
    const value = passwordErrors[field];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const initials = (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const formattedDob = dob ? dob.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '';

  const handleUploadPhoto = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) dispatch(updateProfile({ avatarUri: uri }));
    });
  };

  const handleSavePersonal = () => {
    if (!name.trim()) {
      Alert.alert('Full Name is required');
      return;
    }
    dispatch(updateProfile({
      name: name.trim(),
      phone,
      dob: dob ? dob.toISOString() : null,
      gender,
      bio,
      emergencyContactName: emergencyName,
      emergencyContactPhone: emergencyPhone,
    }));
    Alert.alert('Profile Updated', 'Your profile has been saved successfully.');
  };

  const handleSaveAddress = () => {
    dispatch(updateAddress({ country, state, district, city, postalCode, addressLine1, addressLine2 }));
    Alert.alert('Address Saved', 'Your address has been updated successfully.');
  };

  const handleLookupPincode = () => {
    if (!postalCode || postalCode.trim().length < 4) {
      Alert.alert('Enter Postal Code', 'Please enter a valid postal code to look up.');
      return;
    }
    lookupPostalCode(postalCode.trim())
      .unwrap()
      .then((result) => {
        const match = result?.results?.[0];
        if (!match) {
          Alert.alert('Not Found', 'No address found for that postal code.');
          return;
        }
        if (match.stateName) setStateVal(match.stateName);
        if (match.districtName) setDistrict(match.districtName);
        if (match.cityName) setCity(match.cityName);
      })
      .catch((error) => {
        Alert.alert('Lookup Failed', error?.message || 'Could not look up that postal code. Please try again.');
      });
  };

  const handleChangePassword = () => {
    const errors = {};
    if (!currentPassword) errors.current_password = 'Current password is required.';
    if (!newPassword) errors.password = 'New password is required.';
    else if (newPassword.length < 8) errors.password = 'New password must be at least 8 characters.';
    if (!confirmPassword) errors.password_confirmation = 'Please confirm your new password.';
    else if (newPassword !== confirmPassword) errors.password_confirmation = 'New password and confirmation do not match.';

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});

    dispatch(changeUserPassword({
      currentPassword,
      password: newPassword,
      passwordConfirmation: confirmPassword,
    }))
      .unwrap()
      .then(() => {
        Alert.alert('Password Changed', 'Your password has been updated successfully. Other signed-in devices have been logged out.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      })
      .catch((error) => {
        if (error?.errors) {
          setPasswordErrors(error.errors);
        }
        Alert.alert('Change Password Failed', error?.message || 'Please check your current password and try again.');
      });
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser());
          let root = navigation;
          while (root.getParent()) root = root.getParent();
          root.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="My Profile" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{name || 'Customer'}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <View style={styles.roleDot} />
            <Text style={styles.roleBadgeText}>{user?.role || 'Customer'}</Text>
          </View>

          <TouchableOpacity style={styles.uploadBtn} onPress={handleUploadPhoto}>
            <Icon name="photo-camera" size={16} color="#007AFF" />
            <Text style={styles.uploadBtnText}>Upload Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Icon name="logout" size={16} color="#EF4444" />
            <Text style={styles.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabRow}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={styles.tabItem} onPress={() => setActiveTab(t.key)}>
              <Icon name={t.icon} size={16} color={activeTab === t.key ? '#007AFF' : '#94A3B8'} />
              <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]}>{t.label}</Text>
              {activeTab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'personal' && (
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>Full Name<Text style={styles.required}> *</Text></Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#94A3B8" />

            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />

            <Text style={styles.inputLabel}>Date of Birth</Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setShowDobPicker(true)} activeOpacity={0.7}>
              <Text style={[styles.selectText, !formattedDob && styles.placeholderText]}>{formattedDob || 'dd-mm-yyyy'}</Text>
              <Icon name="event" size={18} color="#94A3B8" />
            </TouchableOpacity>
            {showDobPicker && (
              <DateTimePicker
                value={dob || new Date(1990, 0, 1)}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selected) => {
                  setShowDobPicker(false);
                  if (selected) setDob(selected);
                }}
              />
            )}

            <SelectField label="Gender" value={gender} placeholder="Select Gender" options={GENDERS} onSelect={setGender} />

            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} multiline placeholderTextColor="#94A3B8" />

            <Text style={styles.inputLabel}>Emergency Contact Name</Text>
            <TextInput style={styles.input} value={emergencyName} onChangeText={setEmergencyName} placeholderTextColor="#94A3B8" />

            <Text style={styles.inputLabel}>Emergency Contact Phone</Text>
            <TextInput style={styles.input} value={emergencyPhone} onChangeText={setEmergencyPhone} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSavePersonal}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'address' && (
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
              <TextInput style={[styles.input, styles.pincodeInput]} value={postalCode} onChangeText={setPostalCode} keyboardType="number-pad" placeholderTextColor="#94A3B8" />
              <TouchableOpacity style={styles.lookupBtn} onPress={handleLookupPincode} disabled={loadingPostalLookup}>
                {loadingPostalLookup ? <ActivityIndicator size="small" color="#007AFF" /> : <Text style={styles.lookupBtnText}>Find</Text>}
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Address Line 1</Text>
            <TextInput style={styles.input} value={addressLine1} onChangeText={setAddressLine1} placeholderTextColor="#94A3B8" />

            <Text style={styles.inputLabel}>Address Line 2</Text>
            <TextInput style={styles.input} value={addressLine2} onChangeText={setAddressLine2} placeholderTextColor="#94A3B8" />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAddress}>
              <Text style={styles.saveBtnText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        )}

        {activeTab === 'password' && (
          <View style={styles.sectionCard}>
            <Text style={styles.inputLabel}>Current Password<Text style={styles.required}> *</Text></Text>
            <TextInput
              style={[styles.input, passwordErrorFor('current_password') && styles.inputError]}
              value={currentPassword}
              onChangeText={(v) => { setCurrentPassword(v); clearPasswordError('current_password'); }}
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />
            {!!passwordErrorFor('current_password') && <Text style={styles.errorText}>{passwordErrorFor('current_password')}</Text>}

            <Text style={styles.inputLabel}>New Password<Text style={styles.required}> *</Text></Text>
            <TextInput
              style={[styles.input, passwordErrorFor('password') && styles.inputError]}
              value={newPassword}
              onChangeText={(v) => { setNewPassword(v); clearPasswordError('password'); }}
              secureTextEntry
              placeholder="Minimum 8 characters"
              placeholderTextColor="#94A3B8"
            />
            {!!passwordErrorFor('password') && <Text style={styles.errorText}>{passwordErrorFor('password')}</Text>}

            <Text style={styles.inputLabel}>Confirm New Password<Text style={styles.required}> *</Text></Text>
            <TextInput
              style={[styles.input, passwordErrorFor('password_confirmation') && styles.inputError]}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); clearPasswordError('password_confirmation'); }}
              secureTextEntry
              placeholderTextColor="#94A3B8"
            />
            {!!passwordErrorFor('password_confirmation') && <Text style={styles.errorText}>{passwordErrorFor('password_confirmation')}</Text>}

            <TouchableOpacity style={[styles.saveBtn, changingPassword && styles.saveBtnDisabled]} onPress={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveBtnText}>Change Password</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  profileCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  profileName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  profileEmail: { fontSize: 13, color: '#6B7280' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF3E2', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' },
  roleBadgeText: { fontSize: 12, color: '#B45309', fontWeight: '700' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9, marginTop: 16, alignSelf: 'stretch', justifyContent: 'center' },
  uploadBtnText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#FCA5A5', backgroundColor: '#FEF2F2', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 9, marginTop: 10, alignSelf: 'stretch', justifyContent: 'center' },
  logoutBtnText: { fontSize: 13, color: '#EF4444', fontWeight: '700' },
  tabRow: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 4, gap: 4 },
  tabItem: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 10, borderRadius: 8 },
  tabLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  tabLabelActive: { color: '#007AFF' },
  tabUnderline: { position: 'absolute', bottom: 0, height: 2, width: '60%', backgroundColor: '#007AFF', borderRadius: 1 },
  sectionCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 10 },
  required: { color: '#EF4444' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, height: 44, color: '#333', fontSize: 14 },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 5 },
  multiline: { height: 90, textAlignVertical: 'top', paddingVertical: 10 },
  pincodeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pincodeInput: { flex: 1 },
  lookupBtn: { height: 44, minWidth: 60, borderRadius: 8, borderWidth: 1, borderColor: '#007AFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 12 },
  lookupBtnText: { color: '#007AFF', fontSize: 13, fontWeight: '700' },
  fieldWrap: { gap: 0 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, height: 44 },
  selectBoxDisabled: { backgroundColor: '#F1F5F9' },
  selectText: { fontSize: 14, color: '#1E293B', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  retryText: { fontSize: 12, color: '#EF4444', fontWeight: '600', marginTop: 6, marginBottom: 4 },
  saveBtn: { backgroundColor: '#007AFF', height: 46, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 18 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', paddingBottom: 24, paddingTop: 10 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 14.5, fontWeight: '800', color: '#1E293B', paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalOptionText: { fontSize: 14.5, color: '#1E293B' },
});

export default Profile;
