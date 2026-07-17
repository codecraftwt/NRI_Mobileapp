import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform, Modal, FlatList, KeyboardAvoidingView } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { updateProfile, saveUserProfile } from '../../Redux/slices/userSlice';

const GENDERS = ['Male', 'Female', 'Other', 'Prefer not to say'];

function SelectField({ label, value, placeholder, options, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.selectBox}
        onPress={() => setOpen(true)}
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

export default function ProfilePersonal({ navigation }) {
  const user = useSelector(state => state.user.user);
  const dispatch = useDispatch();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [dob, setDob] = useState(user?.dob ? new Date(user.dob) : null);
  const [gender, setGender] = useState(user?.gender || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [emergencyName, setEmergencyName] = useState(user?.emergencyContactName || '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContactPhone || '');
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const { showAlert, alertProps } = useAppAlert();

  const formattedDob = dob ? dob.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-') : '';

  const handleSavePersonal = async () => {
    if (!name.trim()) {
      showAlert('Required', 'Full Name is required.');
      return;
    }
    setSavingPersonal(true);
    try {
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
      showAlert('Profile Updated', 'Your profile has been saved successfully.');
    } catch (error) {
      showAlert('Could Not Save Profile', error?.message || 'Please try again.');
    } finally {
      setSavingPersonal(false);
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.sectionCard}>
          <Text style={styles.inputLabel}>Full Name<Text style={styles.required}> *</Text></Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor="#94A3B8" />

          <Text style={styles.inputLabel}>Phone</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />

          <Text style={styles.inputLabel}>Date of Birth</Text>
          <TouchableOpacity style={styles.selectBox} onPress={() => setShowDobPicker(true)} activeOpacity={0.7}>
            <Text style={[styles.selectText, !formattedDob && styles.placeholderText]}>{formattedDob || 'dd-mm-yyyy'}</Text>
            <Icon name="event" size={20} color="#64748B" />
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
            {savingPersonal ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
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
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 12 },
  required: { color: '#DC2626' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52, fontSize: 16, color: '#0F172A' },
  multiline: { height: 100, textAlignVertical: 'top', paddingVertical: 12 },
  fieldWrap: { gap: 0 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52 },
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
});
