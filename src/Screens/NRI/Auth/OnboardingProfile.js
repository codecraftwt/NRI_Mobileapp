import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, FlatList, Alert, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { useCountries } from '../../../Hooks/useCountries';
import { useStates } from '../../../Hooks/useStates';
import { saveUserProfile } from '../../../Redux/slices/userSlice';

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
  container: { flex: 1, backgroundColor: '#EFF3FA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  eyebrow: { fontSize: 11, color: '#007AFF', fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginTop: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginTop: 8, marginBottom: 20 },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionHeader: { fontSize: 11, color: '#007AFF', fontWeight: '700', letterSpacing: 0.5 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 18 },
  fieldWrap: { gap: 0, marginBottom: 4 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 10 },
  required: { color: '#EF4444' },
  optional: { fontSize: 12, color: '#94A3B8', fontWeight: '400' },
  hint: { fontSize: 11.5, color: '#94A3B8', marginTop: 6 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 46, color: '#1E293B', fontSize: 14 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 46 },
  selectBoxDisabled: { backgroundColor: '#F1F5F9' },
  selectText: { fontSize: 14, color: '#1E293B', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  retryText: { fontSize: 12, color: '#EF4444', fontWeight: '600', marginTop: 6 },
  ctaBtn: { flexDirection: 'row', backgroundColor: '#FF7C1A', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 24 },
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
