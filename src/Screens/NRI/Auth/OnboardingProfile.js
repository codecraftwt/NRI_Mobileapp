import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, FlatList, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { useCountries } from '../../../Hooks/useCountries';
import { useStates } from '../../../Hooks/useStates';
import { saveUserProfile } from '../../../Redux/slices/userSlice';
import { lightColors as colors, typography, spacing, radius } from '../../../theme';

const { width: W, height: H } = Dimensions.get('window');

function SelectField({ label, required, value, placeholder, options, onSelect, loading }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
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

function OnboardingProfile({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const { countryNames, loading: loadingCountries, failed: countriesFailed, retry: retryCountries } = useCountries();
  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const [country, setCountry] = useState(user?.countryOfResidence || '');
  const [city, setCity] = useState(user?.city || '');
  const [homeState, setHomeState] = useState(user?.homeState || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [submitting, setSubmitting] = useState(false);

  const handleContinue = async () => {
    if (!country || !homeState) {
      Alert.alert('Missing Fields', 'Please select your Country of Residence and Home State in India.');
      return;
    }
    const stateId = states.find(s => s.name === homeState)?.id;
    setSubmitting(true);
    try {
      await dispatch(saveUserProfile({
        phone: phone || undefined,
        nriCountry: country,
        nriCity: city || undefined,
        stateId,
      })).unwrap();
      navigation.navigate('OnboardingPlan', {
        profile: { countryOfResidence: country, city, homeState, phone },
      });
    } catch (error) {
      Alert.alert('Could Not Save Profile', error?.message || 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />
      <OnboardingTopBar navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <StepIndicator steps={ONBOARDING_STEPS} currentStep={1} />

        <Text style={styles.eyebrow}>STEP 1 · YOUR PROFILE</Text>
        <Text style={styles.title}>Tell us a little about yourself</Text>
        <Text style={styles.subtitle}>This helps us show prices in your currency and connect you with a Relationship Manager who knows your home state.</Text>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Icon name="flight-takeoff" size={16} color="#007AFF" />
            <Text style={styles.sectionHeader}>WHERE YOU LIVE NOW</Text>
          </View>

          <SelectField
            label="Country of Residence"
            required
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

          <Text style={styles.inputLabel}>City <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={styles.input} placeholder="e.g. New Jersey, Dubai, London" placeholderTextColor="#94A3B8" value={city} onChangeText={setCity} />

          <View style={styles.divider} />

          <View style={styles.sectionHeaderRow}>
            <Icon name="home" size={16} color="#007AFF" />
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
          />
          {statesFailed && (
            <TouchableOpacity onPress={retryStates}>
              <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.hint}>We'll try to match you with a Relationship Manager from this state.</Text>

          <Text style={styles.inputLabel}>Phone / WhatsApp <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput style={styles.input} placeholder="+1 555 000 0000" placeholderTextColor="#94A3B8" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <Text style={styles.hint}>Include your country code so we can reach you abroad.</Text>

          <TouchableOpacity style={[styles.ctaBtn, submitting && styles.ctaBtnDisabled]} onPress={handleContinue} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Text style={styles.ctaText}>Continue to Plans</Text>
                <Icon name="arrow-forward" size={18} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  selectText: { fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1E293B', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  retryText: { fontSize: 12, color: colors.error, fontWeight: '600', marginTop: 6 },
  ctaBtn: { width: '100%', height: 56, backgroundColor: colors.accent, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 24, shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '60%', paddingBottom: 24, paddingTop: 10 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 14.5, fontWeight: '800', color: '#1E293B', paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F8FAFC' },
  modalOptionText: { fontSize: 14.5, color: '#1E293B' },
});

export default OnboardingProfile;
