import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../../Components/Header';
import { addFamilyMember, updateFamilyMember } from '../../Redux/slices/familySlice';
import { useFamilyMemberDetail } from '../../Hooks/useFamilyMemberDetail';
import { useStates } from '../../Hooks/useStates';
import { useDistricts } from '../../Hooks/useDistricts';

const RELATIONSHIP_OPTIONS = ['Parent', 'Spouse', 'Child', 'Sibling', 'Other'];
const RELATIONSHIP_TO_API = { Parent: 'parent', Spouse: 'spouse', Child: 'child', Sibling: 'sibling', Other: 'other' };
const RELATIONSHIP_FROM_API = { parent: 'Parent', spouse: 'Spouse', child: 'Child', sibling: 'Sibling', other: 'Other' };

function SelectField({ label, required, value, placeholder, options, disabled, loading, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity
        style={[styles.selectBox, (disabled || loading) && styles.selectBoxDisabled]}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={[styles.selectText, styles.placeholderText, { marginLeft: 8 }]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>
              {value || placeholder}
            </Text>
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
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
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

function AddFamilyMember({ navigation, route }) {
  const dispatch = useDispatch();
  const memberId = route?.params?.memberId || null;
  const isEditing = !!memberId;

  const [name, setName] = useState('');
  const [relation, setRelation] = useState('');
  const [phone, setPhone] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [healthNotes, setHealthNotes] = useState('');
  const [hasPopulated, setHasPopulated] = useState(false);

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const { districts: cities, districtNames: cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useDistricts(stateVal);
  const { detail, loading: loadingDetail, failed: detailFailed, fetchDetail } = useFamilyMemberDetail();
  const submitting = useSelector(state => state.family.mutationStatus === 'loading');

  useEffect(() => {
    if (isEditing) {
      fetchDetail(memberId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  useEffect(() => {
    if (!hasPopulated && detail && detail.id === memberId) {
      setName(detail.name || '');
      setRelation(RELATIONSHIP_FROM_API[detail.relationship] || '');
      setPhone(detail.phone || '');
      setEmergencyContact(detail.emergencyContact || '');
      setStateVal(detail.stateName || '');
      setCity(detail.cityName || '');
      setAddress(detail.address || '');
      setDob(detail.dateOfBirth ? new Date(detail.dateOfBirth) : null);
      setHealthNotes(detail.healthNotes || '');
      setHasPopulated(true);
    }
  }, [detail, memberId, hasPopulated]);

  const stateId = stateVal ? states.find(s => s.name === stateVal)?.id : null;
  const cityId = city ? cities.find(c => c.name === city)?.id : null;

  const formattedDob = dob
    ? dob.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const handleSubmit = () => {
    if (!name || !relation) {
      Alert.alert('Required', 'Name and Relationship are required.');
      return;
    }

    const payload = {
      name,
      relationship: RELATIONSHIP_TO_API[relation],
      phone,
      address,
      stateId,
      cityId,
      dateOfBirth: dob ? dob.toISOString().slice(0, 10) : undefined,
      healthNotes,
      emergencyContact,
    };

    const action = isEditing
      ? updateFamilyMember({ id: memberId, ...payload })
      : addFamilyMember(payload);

    dispatch(action)
      .unwrap()
      .then(() => {
        Alert.alert(isEditing ? 'Updated' : 'Added', `${name} has been ${isEditing ? 'updated' : 'added as a family member'}.`);
        navigation.goBack();
      })
      .catch((error) => {
        Alert.alert('Failed', error?.message || `Could not ${isEditing ? 'update' : 'add'} this family member.`);
      });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={isEditing ? 'Edit Member' : 'Add Family Member'} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isEditing && loadingDetail && !hasPopulated ? (
          <View style={styles.detailLoadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.detailLoadingText}>Loading member details…</Text>
          </View>
        ) : isEditing && detailFailed && !hasPopulated ? (
          <TouchableOpacity style={styles.retryBox} onPress={() => fetchDetail(memberId)}>
            <Text style={styles.retryText}>Couldn't load member details. Tap to retry.</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.card}>
              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Name<Text style={styles.required}> *</Text></Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Sushila Patel"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <SelectField
                label="Relationship"
                required
                value={relation}
                placeholder="Select..."
                options={RELATIONSHIP_OPTIONS}
                onSelect={setRelation}
              />

              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  placeholder="e.g. +91 98765 43210"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Emergency Contact</Text>
                <TextInput
                  style={styles.input}
                  value={emergencyContact}
                  onChangeText={setEmergencyContact}
                  keyboardType="phone-pad"
                  placeholder="e.g. +91 98765 43211"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <SelectField
                label="State"
                value={stateVal}
                placeholder="Select State..."
                options={stateNames}
                onSelect={(v) => { setStateVal(v); setCity(''); }}
                loading={loadingStates}
              />
              {statesFailed && (
                <TouchableOpacity onPress={retryStates}>
                  <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
                </TouchableOpacity>
              )}

              <SelectField
                label="City"
                value={city}
                placeholder="Select City..."
                options={cityNames}
                disabled={!stateVal}
                loading={loadingCities}
                onSelect={setCity}
              />
              {citiesFailed && (
                <TouchableOpacity onPress={retryCities}>
                  <Text style={styles.retryText}>Couldn't load cities. Tap to retry.</Text>
                </TouchableOpacity>
              )}

              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Address</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Complete address"
                  placeholderTextColor="#94A3B8"
                  multiline
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setShowDobPicker(true)} activeOpacity={0.7}>
                  <Text style={[styles.selectText, !formattedDob && styles.placeholderText]}>
                    {formattedDob || 'dd-mm-yyyy'}
                  </Text>
                  <Icon name="event" size={18} color="#94A3B8" />
                </TouchableOpacity>
                {showDobPicker && (
                  <DateTimePicker
                    value={dob || new Date(1980, 0, 1)}
                    mode="date"
                    maximumDate={new Date()}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selected) => {
                      setShowDobPicker(false);
                      if (selected) setDob(selected);
                    }}
                  />
                )}
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Health Notes</Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={healthNotes}
                  onChangeText={setHealthNotes}
                  placeholder="e.g. Diabetes, needs medicine reminders"
                  placeholderTextColor="#94A3B8"
                  multiline
                />
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} activeOpacity={0.85} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="check" size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>{isEditing ? 'Update Member' : 'Add Member'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },

  detailLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  detailLoadingText: { fontSize: 13, color: '#64748B' },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  fieldWrap: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  required: { color: '#EF4444' },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    color: '#1E293B',
    fontSize: 14,
  },
  multiline: { height: 88, textAlignVertical: 'top', paddingVertical: 12 },

  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
  },
  selectBoxDisabled: { backgroundColor: '#F1F5F9', opacity: 0.6 },
  selectText: { fontSize: 14, color: '#1E293B', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  retryText: { fontSize: 12, color: '#EF4444', fontWeight: '600' },
  retryBox: { alignItems: 'center', paddingVertical: 40 },

  actions: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  cancelBtnText: { color: '#64748B', fontSize: 15, fontWeight: '700' },
  submitBtn: {
    flex: 1.5,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnDisabled: { backgroundColor: '#9CC7FF' },
  submitBtnText: { color: 'white', fontSize: 15, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
    paddingBottom: 24,
    paddingTop: 10,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 10 },
  modalTitle: { fontSize: 14.5, fontWeight: '800', color: '#1E293B', paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalOptionText: { fontSize: 14.5, color: '#1E293B' },
});

export default AddFamilyMember;
