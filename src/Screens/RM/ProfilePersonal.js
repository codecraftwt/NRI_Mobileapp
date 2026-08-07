import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, Modal, FlatList, KeyboardAvoidingView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { typography } from '../../theme/typography';
import { useStates } from '../../Hooks/useStates';
import { getCities } from '../../Api/geoApi';
import { getRmProfile, updateRmProfile } from '../../Api/RM/rmProfileApi';

// Same modal-select UI the NRI profile screen uses.
function SelectField({ label, value, placeholder, options, onSelect, disabled }) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBox, disabled && styles.selectBoxDisabled]}
        onPress={() => !disabled && setOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>{value || placeholder}</Text>
        <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item, i) => `${item}-${i}`}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => { onSelect(item); setOpen(false); }}>
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color="#1E3A8A" />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>No options available.</Text>}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function ProfilePersonal({ navigation }) {
  const { states, stateNames } = useStates();
  const { showAlert, alertProps } = useAppAlert();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [stateName, setStateName] = useState('');
  const [stateId, setStateId] = useState(null);
  const [cityName, setCityName] = useState('');
  const [cityId, setCityId] = useState(null);
  const [cities, setCities] = useState([]);

  // Prefill from the current RM profile.
  useEffect(() => {
    let active = true;
    getRmProfile()
      .then(p => {
        if (!active) return;
        setName(p.name || '');
        setPhone(p.phone || '');
        setWhatsapp(p.whatsapp || '');
        if (p.state) { setStateName(p.state.name); setStateId(p.state.id); loadCities(p.state.id); }
        if (p.city) { setCityName(p.city.name); setCityId(p.city.id); }
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCities = async (sid) => {
    try {
      setCities(await getCities({ stateId: sid }));
    } catch (e) {
      setCities([]);
    }
  };

  const onSelectState = (nm) => {
    const s = states.find(x => x.name === nm);
    setStateName(nm);
    setStateId(s?.id ?? null);
    // Reset city when the state changes.
    setCityName('');
    setCityId(null);
    setCities([]);
    if (s?.id) loadCities(s.id);
  };

  const onSelectCity = (nm) => {
    const c = cities.find(x => x.name === nm);
    setCityName(nm);
    setCityId(c?.id ?? null);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      showAlert('Required', 'Full Name is required.');
      return;
    }
    setSaving(true);
    try {
      await updateRmProfile({
        name: name.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        stateId: stateId ?? undefined,
        cityId: cityId ?? undefined,
      });
      showAlert('Profile Updated', 'Your profile has been saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      showAlert('Could Not Save Profile', error?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Personal Info" showBack={true} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
      >
        {loading ? (
          <View style={styles.centerFill}><ActivityIndicator size="large" color="#A64416" /></View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.sectionCard}>
              <Text style={styles.inputLabel}>Full Name<Text style={styles.required}> *</Text></Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />

              <Text style={styles.inputLabel}>WhatsApp Number</Text>
              <TextInput style={styles.input} value={whatsapp} onChangeText={setWhatsapp} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />

              <SelectField label="State" value={stateName} placeholder="Select State" options={stateNames} onSelect={onSelectState} />

              <SelectField label="City" value={cityName} placeholder={stateId ? 'Select City' : 'Select a state first'} options={cities.map(c => c.name)} onSelect={onSelectCity} disabled={!stateId} />

              <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 20 },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, gap: 4,
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
    borderWidth: 1, borderColor: '#E0E7FF',
  },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 12 },
  required: { color: '#DC2626' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52, fontSize: 16, color: '#0F172A' },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52 },
  selectBoxDisabled: { opacity: 0.5 },
  selectText: { fontSize: 16, color: '#0F172A', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  saveBtn: { backgroundColor: '#A64416', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 32, paddingTop: 12 },
  modalHandle: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 16, color: '#1E293B' },
  modalEmpty: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 24 },
});
