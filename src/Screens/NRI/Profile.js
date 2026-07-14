import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Modal, FlatList, Platform, ActivityIndicator, PermissionsAndroid, Linking, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Header from '../../Components/Header';
import { updateProfile, updateAddress, logoutUser, changeUserPassword, saveUserProfile } from '../../Redux/slices/userSlice';
import { useCountries } from '../../Hooks/useCountries';
import { useStates } from '../../Hooks/useStates';
import { useDistricts } from '../../Hooks/useDistricts';
import { useCities } from '../../Hooks/useCities';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';
import { useDocuments } from '../../Hooks/useDocuments';
import { useWalletAccount } from '../../Hooks/useWalletAccount';
import { useReferrals } from '../../Hooks/useReferrals';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useProperties } from '../../Hooks/useProperties';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

const PROPERTY_TYPE_LABELS = { flat: 'Flat', house: 'House', farm: 'Farm / Agricultural Land', commercial: 'Commercial', plot: 'Plot' };

const DOCUMENT_TYPE_LABELS = {
  passport: 'Passport',
  pan_card: 'PAN Card',
  aadhaar_card: 'Aadhaar Card',
  property_papers: 'Property Papers',
  will: 'Will',
  power_of_attorney: 'Power of Attorney',
  insurance_policy: 'Insurance Policy',
  other: 'Other',
};

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'ur', label: 'Urdu' },
];
const LANGUAGE_LABEL_BY_CODE = Object.fromEntries(LANGUAGE_OPTIONS.map(l => [l.code, l.label]));
const LANGUAGE_CODE_BY_LABEL = Object.fromEntries(LANGUAGE_OPTIONS.map(l => [l.label, l.code]));

const TIMEZONE_BY_COUNTRY = {
  'United States': 'America/New_York',
  'United Kingdom': 'Europe/London',
  UAE: 'Asia/Dubai',
  Canada: 'America/Toronto',
  Australia: 'Australia/Sydney',
  Singapore: 'Asia/Singapore',
  Qatar: 'Asia/Qatar',
  'Saudi Arabia': 'Asia/Riyadh',
  Germany: 'Europe/Berlin',
  Greece: 'Europe/Athens',
};

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

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
  { key: 'nri', label: 'NRI & Membership', icon: 'card-membership' },
  { key: 'password', label: 'Password', icon: 'lock-outline' },
];

function Profile({ navigation, route }) {
  const user = useSelector(state => state.user.user);
  const changePasswordStatus = useSelector(state => state.user.changePasswordStatus);
  const changingPassword = changePasswordStatus === 'loading';
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('personal');
  const [showDobPicker, setShowDobPicker] = useState(false);

  // Deep-linked here (e.g. the "Back to My Profile" button on Family/
  // Properties/Document Vault) with an `initialTab` param — jump straight to
  // that tab every time this screen gains focus, without disturbing whatever
  // tab the user is on when arriving via the normal Profile tab bar icon.
  useFocusEffect(
    useCallback(() => {
      if (route?.params?.initialTab) {
        setActiveTab(route.params.initialTab);
      }
    }, [route?.params?.initialTab])
  );

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.dob ? new Date(user.dob) : null);
  const [gender, setGender] = useState(user?.gender || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [emergencyName, setEmergencyName] = useState(user?.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContactPhone || '');
  const [savingPersonal, setSavingPersonal] = useState(false);

  const [country, setCountry] = useState(user?.address?.country || '');
  const [state, setStateVal] = useState(user?.address?.state || '');
  const [district, setDistrict] = useState(user?.address?.district || '');
  const [city, setCity] = useState(user?.address?.city || '');
  const [postalCode, setPostalCode] = useState(user?.address?.postalCode || '');
  const [addressLine1, setAddressLine1] = useState(user?.address?.addressLine1 || '');
  const [addressLine2, setAddressLine2] = useState(user?.address?.addressLine2 || '');

  const { countryNames, loading: loadingCountries, failed: countriesFailed, retry: retryCountries } = useCountries();
  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const { districtNames, loading: loadingDistricts, failed: districtsFailed, retry: retryDistricts } = useDistricts(state);
  const { cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useCities(state, district);
  const { loading: loadingPostalLookup, lookup: lookupPostalCode } = usePostalCodeLookup();

  // These previously read straight from Redux without going through a
  // fetch-capable hook, so this screen had no way to actually refresh them —
  // it relied on some other screen (Family.js/Properties.js) having already
  // populated the store first. Using the real hooks here fixes that.
  const { members: familyMembers, retry: retryFamily } = useFamilyMembers();
  const { properties, retry: retryProperties } = useProperties();
  const { documents, retry: retryDocuments } = useDocuments();
  const { balance: walletBalance, retry: retryWallet } = useWalletAccount();
  const { referralCode, retry: retryReferrals } = useReferrals();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([retryFamily(), retryProperties(), retryDocuments(), retryWallet(), retryReferrals()]);
    setRefreshing(false);
  };

  // These retry functions are new references every render (not memoized by
  // the hooks) — keeping them out of these deps avoids an infinite refetch
  // loop.
  useFocusEffect(
    useCallback(() => {
      retryFamily();
      retryProperties();
      retryDocuments();
      retryWallet();
      retryReferrals();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // NRI & Membership tab — editable profile fields from PUT /auth/profile.
  const [nriCountry, setNriCountry] = useState(user?.countryOfResidence || '');
  const [nriCity, setNriCity] = useState(user?.city || '');
  const [nriHomeState, setNriHomeState] = useState(user?.homeState || '');
  const [nriLanguage, setNriLanguage] = useState(LANGUAGE_LABEL_BY_CODE[user?.language] || 'English');
  const [nriTimezone, setNriTimezone] = useState(user?.timezone || TIMEZONE_BY_COUNTRY[user?.countryOfResidence] || '');
  const [savingNri, setSavingNri] = useState(false);

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

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (already) return true;

    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Allow Camera Access',
      message: 'NRI Circle needs access to your camera to take a profile photo.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Required',
        'Camera access is blocked. Please enable it from app settings to take a photo.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
    } else {
      Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
    }
    return false;
  };

  const requestGalleryPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const permission = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;

    const result = await PermissionsAndroid.request(permission, {
      title: 'Allow Photo Access',
      message: 'NRI Circle needs access to your photos so you can set a profile picture.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Required',
        'Photo access is blocked. Please enable it from app settings to choose a profile picture.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
    } else {
      Alert.alert('Permission Denied', 'Photo access is required to choose a profile picture.');
    }
    return false;
  };

  const handleTakePhoto = async () => {
    const allowed = await requestCameraPermission();
    if (!allowed) return;
    launchCamera({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) dispatch(updateProfile({ avatarUri: uri }));
    });
  };

  const handleChooseFromGallery = async () => {
    const allowed = await requestGalleryPermission();
    if (!allowed) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) dispatch(updateProfile({ avatarUri: uri }));
    });
  };

  const handleUploadPhoto = () => {
    Alert.alert('Update Profile Photo', 'Choose a source', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
    ]);
  };

  const handleSavePersonal = async () => {
    if (!name.trim()) {
      Alert.alert('Full Name is required');
      return;
    }
    setSavingPersonal(true);
    try {
      // name/phone go through the real API; dob/gender/bio/emergency contact
      // aren't part of that endpoint's schema, so they stay local-only.
      await dispatch(saveUserProfile({ name: name.trim(), phone })).unwrap();
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
    } catch (error) {
      Alert.alert('Could Not Save Profile', error?.message || 'Please try again.');
    } finally {
      setSavingPersonal(false);
    }
  };

  const handleSaveAddress = () => {
    dispatch(updateAddress({ country, state, district, city, postalCode, addressLine1, addressLine2 }));
    Alert.alert('Address Saved', 'Your address has been updated successfully.');
  };

  const handleSaveNri = async () => {
    const stateId = nriHomeState ? states.find(s => s.name === nriHomeState)?.id : undefined;
    setSavingNri(true);
    try {
      await dispatch(saveUserProfile({
        nriCountry,
        nriCity,
        preferredLanguage: LANGUAGE_CODE_BY_LABEL[nriLanguage] || undefined,
        timezone: nriTimezone,
        stateId,
      })).unwrap();
      Alert.alert('Saved', 'Your NRI details have been updated successfully.');
    } catch (error) {
      Alert.alert('Could Not Save', error?.message || 'Please try again.');
    } finally {
      setSavingNri(false);
    }
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={styles.tabRowContent}>
          {TABS.map(t => (
            <TouchableOpacity key={t.key} style={styles.tabItem} onPress={() => setActiveTab(t.key)}>
              <Icon name={t.icon} size={16} color={activeTab === t.key ? '#007AFF' : '#94A3B8'} />
              <Text style={[styles.tabLabel, activeTab === t.key && styles.tabLabelActive]} numberOfLines={1}>{t.label}</Text>
              {activeTab === t.key && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </ScrollView>

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

            <TouchableOpacity style={[styles.saveBtn, savingPersonal && styles.saveBtnDisabled]} onPress={handleSavePersonal} disabled={savingPersonal}>
              {savingPersonal ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
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

        {activeTab === 'nri' && (
          <>
            <View style={styles.sectionCard}>
              <Text style={styles.cardTitle}>NRI Details</Text>

              <SelectField
                label="NRI Country"
                value={nriCountry}
                placeholder="Select Country"
                options={countryNames}
                loading={loadingCountries}
                onSelect={(v) => {
                  setNriCountry(v);
                  const guessed = TIMEZONE_BY_COUNTRY[v];
                  if (guessed && (!nriTimezone || nriTimezone === TIMEZONE_BY_COUNTRY[nriCountry])) {
                    setNriTimezone(guessed);
                  }
                }}
              />
              {countriesFailed && (
                <TouchableOpacity onPress={retryCountries}>
                  <Text style={styles.retryText}>Couldn't load countries. Tap to retry.</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.inputLabel}>NRI City</Text>
              <TextInput style={styles.input} value={nriCity} onChangeText={setNriCity} placeholderTextColor="#94A3B8" />

              <SelectField
                label="Home State in India"
                value={nriHomeState}
                placeholder="Select State"
                options={stateNames}
                loading={loadingStates}
                onSelect={setNriHomeState}
              />
              {statesFailed && (
                <TouchableOpacity onPress={retryStates}>
                  <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
                </TouchableOpacity>
              )}

              <SelectField
                label="Language"
                value={nriLanguage}
                placeholder="Select Language"
                options={LANGUAGE_OPTIONS.map(l => l.label)}
                onSelect={setNriLanguage}
              />

              <Text style={styles.inputLabel}>Timezone</Text>
              <TextInput style={styles.input} value={nriTimezone} onChangeText={setNriTimezone} placeholder="e.g. Europe/London" placeholderTextColor="#94A3B8" />

              <TouchableOpacity style={[styles.saveBtn, savingNri && styles.saveBtnDisabled]} onPress={handleSaveNri} disabled={savingNri}>
                {savingNri ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveBtnText}>Save NRI Details</Text>}
              </TouchableOpacity>

              <View style={styles.nriReadOnlyList}>
                <InfoRow label="Referral Code" value={referralCode} />
                <InfoRow label="Referred By" value={user?.referredByCode} />
                <InfoRow label="Assigned RM" value={user?.rm?.name} />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Wallet Balance</Text>
              <Text style={styles.walletValue}>₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Active Membership</Text>
              <Text style={styles.membershipPlan}>{user?.membership || 'None'}</Text>
              {!!user?.membershipExpiry && <Text style={styles.membershipExpiry}>Expires: {user.membershipExpiry}</Text>}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Actions</Text>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Family')}>
                <Icon name="people" size={16} color="#0891B2" />
                <Text style={[styles.actionBtnText, { color: '#0891B2' }]}>Manage Family ({familyMembers.length})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAmber]} onPress={() => navigation.navigate('Dashboard', { screen: 'Properties' })}>
                <Icon name="home" size={16} color="#D97706" />
                <Text style={[styles.actionBtnText, { color: '#D97706' }]}>Manage Properties ({properties.length})</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.cardTitle}>Family Members ({familyMembers.length})</Text>
                <TouchableOpacity style={styles.addLinkBtn} onPress={() => navigation.navigate('Family', { screen: 'AddFamilyMember' })}>
                  <Icon name="add" size={14} color="#007AFF" />
                  <Text style={styles.addLinkText}>Add</Text>
                </TouchableOpacity>
              </View>
              {familyMembers.length === 0 ? (
                <Text style={styles.emptyText}>No family members added yet.</Text>
              ) : (
                familyMembers.map(m => (
                  <View key={m.id} style={styles.listRow}>
                    <Text style={styles.listRowName}>{m.name}</Text>
                    <View style={styles.listRowMetaRow}>
                      <View style={styles.relationPill}>
                        <Text style={styles.relationPillText}>{m.relationship}</Text>
                      </View>
                      <Text style={styles.listRowMeta}>{m.phone}</Text>
                    </View>
                    <Text style={styles.listRowMeta}>{[m.cityName, m.stateName].filter(Boolean).join(', ')}</Text>
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.listHeaderRow}>
                <Text style={styles.cardTitle}>Properties ({properties.length})</Text>
                <TouchableOpacity style={styles.addLinkBtn} onPress={() => navigation.navigate('Dashboard', { screen: 'AddProperty' })}>
                  <Icon name="add" size={14} color="#007AFF" />
                  <Text style={styles.addLinkText}>Add</Text>
                </TouchableOpacity>
              </View>
              {properties.length === 0 ? (
                <Text style={styles.emptyText}>No properties added yet.</Text>
              ) : (
                properties.map(p => (
                  <View key={p.id} style={styles.listRow}>
                    <Text style={styles.listRowName}>{p.nickname}</Text>
                    <View style={styles.relationPill}>
                      <Text style={styles.relationPillText}>{PROPERTY_TYPE_LABELS[p.type] || p.type}</Text>
                    </View>
                    <Text style={styles.listRowMeta}>{p.address}</Text>
                    {!!p.tenantName && <Text style={styles.listRowMeta}>Tenant: {p.tenantName}</Text>}
                  </View>
                ))
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Documents ({documents.length})</Text>
              {documents.length === 0 ? (
                <Text style={styles.emptyText}>No documents uploaded yet.</Text>
              ) : (
                documents.map(doc => (
                  <View key={doc.id} style={styles.listRow}>
                    <Text style={styles.listRowName}>{doc.documentName}</Text>
                    <View style={styles.listRowMetaRow}>
                      <View style={styles.relationPill}>
                        <Text style={styles.relationPillText}>{DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}</Text>
                      </View>
                      <Text style={styles.listRowMeta}>Expiry: {doc.expiryDate || '—'}</Text>
                    </View>
                    <Text style={styles.listRowMeta}>{doc.sharedWithRm ? 'Shared with RM' : 'Not shared with RM'}</Text>
                  </View>
                ))
              )}
            </View>
          </>
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
  tabRow: { backgroundColor: 'white', borderRadius: 12 },
  tabRowContent: { flexDirection: 'row', padding: 4, gap: 4 },
  tabItem: { alignItems: 'center', gap: 4, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, minWidth: 80 },
  tabLabel: { fontSize: 11, color: '#94A3B8', fontWeight: '600', textAlign: 'center' },
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

  // NRI & Membership tab (ported from Customer.js)
  infoList: { alignSelf: 'stretch' },
  nriReadOnlyList: { alignSelf: 'stretch', marginTop: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  infoLabel: { fontSize: 12.5, color: '#6B7280' },
  infoValue: { fontSize: 12.5, color: '#1E293B', fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  walletValue: { fontSize: 24, fontWeight: 'bold', color: '#10B981', marginTop: 8 },
  membershipPlan: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 8 },
  membershipExpiry: { fontSize: 12.5, color: '#6B7280', marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#A5F3FC', backgroundColor: '#ECFEFF', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12, marginTop: 10, justifyContent: 'center' },
  actionBtnAmber: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  addLinkText: { fontSize: 12, color: '#007AFF', fontWeight: '700' },
  emptyText: { fontSize: 12.5, color: '#9CA3AF', marginTop: 10 },
  listRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 4, gap: 4 },
  listRowName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  listRowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listRowMeta: { fontSize: 12, color: '#6B7280' },
  relationPill: { backgroundColor: '#E5F1FF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  relationPillText: { fontSize: 10.5, color: '#007AFF', fontWeight: '700' },
});

export default Profile;
