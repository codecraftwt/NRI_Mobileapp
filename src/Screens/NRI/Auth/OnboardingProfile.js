import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, FlatList, ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { useCountries } from '../../../Hooks/useCountries';
import { useStates } from '../../../Hooks/useStates';
import { useInternationalStates } from '../../../Hooks/useInternationalStates';
import { useInternationalCities } from '../../../Hooks/useInternationalCities';
import { saveUserProfile, logoutUser } from '../../../Redux/slices/userSlice';
import { lightColors as baseColors, typography, spacing, radius } from '../../../theme';
import AppAlert, { useAppAlert } from '../../../Components/AppAlert';

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};
const colors = C;

const { width: W, height: H } = Dimensions.get('window');

// Shared centered dialog for all the pickers. On iOS the card is lifted above
// the keyboard with KeyboardAvoidingView (padding); on Android we let the OS
// handle it via the manifest's adjustResize — adding KeyboardAvoidingView there
// too would double-adjust and make the card jump, so behavior is left undefined.
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

function SelectField({ label, required, value, placeholder, options, onSelect, loading, searchable }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  const displayOptions = searchable && query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      <TouchableOpacity
        style={[styles.selectBox, loading && styles.selectBoxDisabled]}
        onPress={() => { setQuery(''); setOpen(true); }}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color={C.primary} />
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
        {searchable && (
          <View style={styles.searchWrap}>
            <Icon name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search...`}
              placeholderTextColor="#94A3B8"
              value={query}
              onChangeText={setQuery}
            />
          </View>
        )}
        <FlatList
          data={displayOptions}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.modalOption} onPress={() => { onSelect(item); setOpen(false); }}>
              <Text style={[styles.modalOptionText, item === value && { color: C.primary, fontFamily: 'Poppins-Bold' }]}>{item}</Text>
              {item === value && <Icon name="check-circle" size={20} color={C.primary} />}
            </TouchableOpacity>
          )}
          ListEmptyComponent={searchable && query ? <Text style={styles.emptyText}>No matches found.</Text> : null}
        />
      </PickerSheet>
    </View>
  );
}

function AutocompleteField({ label, required, value, onChangeText, placeholder, options, loading, hint }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  const suggestions = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
      <TouchableOpacity
        style={[styles.selectBox, loading && styles.selectBoxDisabled]}
        onPress={() => { setQuery(value || ''); setOpen(true); }}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color={C.primary} />
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
            placeholder={`Type or search...`}
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
            autoFocus={true}
          />
        </View>

        <FlatList
          data={suggestions}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.modalOption} onPress={() => { onChangeText(item); setOpen(false); }}>
              <Text style={[styles.modalOptionText, item === value && { color: C.primary, fontFamily: 'Poppins-Bold' }]}>{item}</Text>
              {item === value && <Icon name="check-circle" size={20} color={C.primary} />}
            </TouchableOpacity>
          )}
          ListFooterComponent={
            query && suggestions.every(s => s.toLowerCase() !== query.toLowerCase()) ? (
              <TouchableOpacity style={styles.modalOption} onPress={() => { onChangeText(query); setOpen(false); }}>
                <Text style={[styles.modalOptionText, { color: C.primary, fontFamily: 'Poppins-Bold' }]}>Use "{query}"</Text>
              </TouchableOpacity>
            ) : null
          }
          ListEmptyComponent={
            !query ? null : <Text style={styles.emptyText}>No matches found. You can use your typed text above.</Text>
          }
        />
      </PickerSheet>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

// Phone / WhatsApp field with a tappable flag + dial-code picker. The flag
// button opens a searchable country list (name or code); picking one bubbles
// up via onSelectCountry. The number itself is submitted as plain free text —
// the picker only prefills the +code prefix.
function PhoneField({ label, required, optional, value, onChangeText, placeholder, selectedCountry, countries, onSelectCountry, hint }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();
  const filtered = q
    ? countries.filter(c => c.name.toLowerCase().includes(q) || String(c.phoneCode || '').includes(q.replace('+', '')))
    : countries;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
        {optional ? <Text style={styles.optional}> (optional)</Text> : null}
      </Text>
      <View style={styles.phoneRow}>
        <TouchableOpacity style={styles.flagBtn} activeOpacity={0.7} onPress={() => { setQuery(''); setOpen(true); }}>
          <Text style={styles.flagEmoji}>{selectedCountry?.flagEmoji || '🌐'}</Text>
          <Text style={styles.dialCode}>{selectedCountry?.phoneCode ? `+${selectedCountry.phoneCode}` : '+'}</Text>
          <Icon name="keyboard-arrow-down" size={18} color="#94A3B8" />
        </TouchableOpacity>
        <TextInput
          style={styles.phoneInput}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType="phone-pad"
          value={value}
          onChangeText={onChangeText}
        />
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}

      <PickerSheet visible={open} onClose={() => setOpen(false)} title="Select Country Code">
        <View style={styles.searchWrap}>
          <Icon name="search" size={20} color="#94A3B8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search country or code..."
            placeholderTextColor="#94A3B8"
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id ?? item.isoCode ?? item.name)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const active = selectedCountry?.isoCode === item.isoCode;
            return (
              <TouchableOpacity style={styles.modalOption} onPress={() => { onSelectCountry(item); setOpen(false); }}>
                <View style={styles.codeOptionLeft}>
                  <Text style={styles.flagEmoji}>{item.flagEmoji || '🌐'}</Text>
                  <Text style={[styles.modalOptionText, active && { color: C.primary, fontFamily: 'Poppins-Bold' }]} numberOfLines={1}>{item.name}</Text>
                </View>
                <Text style={styles.codeOptionDial}>{item.phoneCode ? `+${item.phoneCode}` : ''}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No matches found.</Text>}
        />
      </PickerSheet>
    </View>
  );
}

function OnboardingProfile({ navigation }) {
  const dispatch = useDispatch();
  const { showAlert, alertProps } = useAppAlert();
  const user = useSelector(state => state.user.user);
  const { countries, countryNames, loading: loadingCountries, failed: countriesFailed, retry: retryCountries } = useCountries();
  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const [country, setCountry] = useState(user?.countryOfResidence || '');
  const [stateProvince, setStateProvince] = useState(user?.stateProvince || '');
  const [city, setCity] = useState(user?.city || '');
  const [homeState, setHomeState] = useState(user?.homeState || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [submitting, setSubmitting] = useState(false);
  // Each dial-code picker tracks its own country (by iso2). Until the user taps
  // a field's flag, it falls back to the Country of Residence selection below.
  const [phoneIso, setPhoneIso] = useState('');
  const [whatsappIso, setWhatsappIso] = useState('');

  const residenceCountry = countries.find(c => c.name === country) || null;
  const phoneCountry = countries.find(c => c.isoCode === phoneIso) || residenceCountry;
  const whatsappCountry = countries.find(c => c.isoCode === whatsappIso) || residenceCountry;

  const {
    stateNames: intlStateNames,
    loading: loadingIntlStates,
    failed: intlStatesFailed,
    retry: retryIntlStates,
  } = useInternationalStates(country);
  const {
    cityNames: intlCityNames,
    loading: loadingIntlCities,
    failed: intlCitiesFailed,
    retry: retryIntlCities,
  } = useInternationalCities(country, stateProvince);

  const handleCountrySelect = (value) => {
    setCountry(value);
    setStateProvince('');
    setCity('');
    // Default both dial-code fields to the residence country's code — but only
    // prefill fields the user hasn't typed into yet (never overwrite input).
    const c = countries.find(x => x.name === value);
    if (c?.phoneCode) {
      if (!phone.trim()) setPhone(`+${c.phoneCode} `);
      if (!whatsapp.trim()) setWhatsapp(`+${c.phoneCode} `);
    }
  };

  // Flag tapped on the Phone / WhatsApp field: remember that field's country
  // and prefill its dial code only when the field is still empty.
  const handlePhoneCountry = (c) => {
    setPhoneIso(c.isoCode);
    if (!phone.trim() && c.phoneCode) setPhone(`+${c.phoneCode} `);
  };
  const handleWhatsappCountry = (c) => {
    setWhatsappIso(c.isoCode);
    if (!whatsapp.trim() && c.phoneCode) setWhatsapp(`+${c.phoneCode} `);
  };

  const handleContinue = async () => {
    if (!country || !stateProvince || !city || !homeState || !phone) {
      showAlert('Missing Fields', 'Please fill in all required fields before continuing.');
      return;
    }
    const stateId = states.find(s => s.name === homeState)?.id;
    setSubmitting(true);
    try {
      await dispatch(saveUserProfile({
        phone,
        nriCountry: country,
        nriCity: city,
        stateId,
      })).unwrap();
      navigation.navigate('OnboardingPayment', {
        profile: { countryOfResidence: country, stateProvince, city, homeState, phone, whatsapp },
      });
    } catch (error) {
      showAlert('Could Not Save Profile', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser());
          let root = navigation;
          while (root.getParent()) root = root.getParent();
          // Back to the app's first screen (onboarding), not the Login page.
          root.reset({ index: 0, routes: [{ name: 'Onboarding' }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />
      <OnboardingTopBar navigation={navigation} onLogout={handleLogout} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <StepIndicator steps={ONBOARDING_STEPS} currentStep={1} />

        <Text style={styles.eyebrow}>STEP 1 · YOUR PROFILE</Text>
        <Text style={styles.title}>Tell us a little about yourself</Text>
        <Text style={styles.subtitle}>This helps us show prices in your currency and connect you with a Relationship Manager who knows your home state.</Text>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Icon name="flight-takeoff" size={16} color={C.primary} />
            <Text style={styles.sectionHeader}>WHERE YOU LIVE NOW</Text>
          </View>

          <SelectField
            label="Country of Residence"
            required
            value={country}
            placeholder="Select Country"
            options={countryNames}
            onSelect={handleCountrySelect}
            loading={loadingCountries}
            searchable={true}
          />
          {countriesFailed && (
            <TouchableOpacity onPress={retryCountries}>
              <Text style={styles.retryText}>Couldn't load countries. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <AutocompleteField
            label="State / Province"
            required
            value={stateProvince}
            onChangeText={setStateProvince}
            placeholder="e.g. New Jersey, Dubai, London"
            options={intlStateNames}
            loading={loadingIntlStates}
            hint={!country ? 'Select a country above to see suggestions.' : undefined}
          />
          {intlStatesFailed && (
            <TouchableOpacity onPress={retryIntlStates}>
              <Text style={styles.retryText}>Couldn't load state suggestions. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <AutocompleteField
            label="City"
            required
            value={city}
            onChangeText={setCity}
            placeholder="e.g. Edison, Dubai, London"
            options={intlCityNames}
            loading={loadingIntlCities}
            hint={!country ? 'Select a country above to see suggestions.' : undefined}
          />
          {intlCitiesFailed && (
            <TouchableOpacity onPress={retryIntlCities}>
              <Text style={styles.retryText}>Couldn't load city suggestions. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <View style={styles.sectionHeaderRow}>
            <Icon name="home" size={16} color={C.primary} />
            <Text style={styles.sectionHeader}>YOUR ROOTS IN INDIA</Text>
          </View>

          <SelectField
            label="Home State in India"
            required
            value={homeState}
            placeholder="Select State"
            options={stateNames}
            onSelect={setHomeState}
            loading={loadingStates}
            searchable={true}
          />
          {statesFailed && (
            <TouchableOpacity onPress={retryStates}>
              <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.hint}>We'll try to match you with a Relationship Manager from this state.</Text>

          <PhoneField
            label="Phone Number"
            required
            value={phone}
            onChangeText={setPhone}
            placeholder="555 000 0000"
            selectedCountry={phoneCountry}
            countries={countries}
            onSelectCountry={handlePhoneCountry}
            hint="Tap the flag to pick your dialing code — we'll reach you on this number abroad."
          />

          <PhoneField
            label="WhatsApp Number"
            optional
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="555 000 0000"
            selectedCountry={whatsappCountry}
            countries={countries}
            onSelectCountry={handleWhatsappCountry}
            hint="Only if it's different from your phone number above."
          />

          <TouchableOpacity style={[styles.ctaBtn, submitting && styles.ctaBtnDisabled]} onPress={handleContinue} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text style={styles.ctaText}>Continue to Checkout</Text>
                <Icon name="arrow-forward" size={18} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  // Dynamic Background Layers matching Auth screen
  bgShape1: { position: 'absolute', top: -H * 0.15, right: -W * 0.3, width: W * 1.5, height: H * 0.5, backgroundColor: '#E0F2FE' + '60', borderRadius: 80, transform: [{ rotate: '-25deg' }] }, // colors.primaryLight
  bgShape2: { position: 'absolute', bottom: -H * 0.2, left: -W * 0.4, width: W * 1.5, height: H * 0.4, backgroundColor: '#FFEDD5' + '60', borderRadius: 60, transform: [{ rotate: '-35deg' }] }, // colors.accent
  bgShape3: { position: 'absolute', top: '35%', left: -W * 0.1, width: W * 1.2, height: H * 0.05, backgroundColor: '#0ea5e9' + '10', borderRadius: 20, transform: [{ rotate: '15deg' }] }, // colors.primary
  scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 40 },
  eyebrow: { fontSize: 12, color: colors.primary, fontFamily: 'Montserrat-Bold', letterSpacing: 1, textAlign: 'center', marginTop: 8 },
  title: { fontSize: 26, fontFamily: 'Montserrat-Bold', color: '#1A1A1A', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 24, paddingHorizontal: spacing.md },
  card: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.lg, shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionHeader: { fontSize: 12, color: colors.primary, fontFamily: 'Montserrat-Bold', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },
  fieldWrap: { gap: 0, marginBottom: spacing.md },
  inputLabel: { ...typography.labelLarge, color: '#334155', marginBottom: 8, marginTop: 4 },
  required: { color: colors.error },
  optional: { fontSize: 12, color: '#94A3B8', fontWeight: '400' },
  hint: { fontSize: 11.5, color: '#94A3B8', marginTop: 6 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, paddingHorizontal: 16, height: 56, color: '#1E293B', fontSize: 15, fontFamily: 'Poppins-Regular', shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, paddingHorizontal: 16, height: 56, shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  selectBoxDisabled: { backgroundColor: '#F1F5F9' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flagBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 56, paddingHorizontal: 12, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, backgroundColor: colors.surface },
  flagEmoji: { fontSize: 20 },
  dialCode: { fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1E293B' },
  phoneInput: { flex: 1, height: 56, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, paddingHorizontal: 16, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1E293B', backgroundColor: colors.surface },
  codeOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 8 },
  codeOptionDial: { fontSize: 14, fontFamily: 'Poppins-SemiBold', color: '#64748B' },
  selectText: { fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1E293B', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  retryText: { fontSize: 12, color: colors.error, fontWeight: '600', marginTop: 6 },
  ctaBtn: { width: '100%', height: 56, backgroundColor: colors.accent, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 24, shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalCard: { width: '100%', maxWidth: 420, maxHeight: '78%', backgroundColor: '#fff', borderRadius: 24, paddingTop: 18, paddingBottom: 12, overflow: 'hidden', elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  modalTitle: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', textAlign: 'center' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalOptionText: { fontSize: 15, fontFamily: 'Poppins-Regular', color: '#334155' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', marginHorizontal: 20, marginVertical: 12, borderRadius: 12, paddingHorizontal: 12, height: 48, borderWidth: 1, borderColor: '#E2E8F0' },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1E293B', height: '100%' },
  listContent: { paddingBottom: 12 },
  emptyText: { textAlign: 'center', fontFamily: 'Poppins-Regular', color: '#94A3B8', marginTop: 24, paddingHorizontal: 20 },
});

export default OnboardingProfile;
