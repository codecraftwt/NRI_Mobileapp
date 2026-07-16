import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
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
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.selectText, styles.placeholderText, { marginLeft: 8 }]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>
              {value || placeholder}
            </Text>
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
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    onSelect(item);
                    setOpen(false);
                  }}
                >
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
  const { showAlert, alertProps } = useAppAlert();

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const { districts: cities, districtNames: cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useDistricts(stateVal);
  const { loading: loadingDetail, failed: detailFailed, fetchDetail } = useFamilyMemberDetail();
  const submitting = useSelector(state => state.family.mutationStatus === 'loading');

  // Populate directly from this fetch's own resolved result, not from the
  // Redux-cached `detail` — on remount (e.g. re-opening edit after just
  // saving a change), the store can still hold the previous fetch's stale
  // object for the same member id until this fetch resolves, which used to
  // get read and "locked in" via the `hasPopulated` guard before the fresh
  // data ever arrived.
  const populateForm = (data) => {
    setName(data.name || '');
    setRelation(RELATIONSHIP_FROM_API[data.relationship] || '');
    setPhone(data.phone || '');
    setEmergencyContact(data.emergencyContact || '');
    setStateVal(data.stateName || '');
    setCity(data.cityName || '');
    setAddress(data.address || '');
    setDob(data.dateOfBirth ? new Date(data.dateOfBirth) : null);
    setHealthNotes(data.healthNotes || '');
    setHasPopulated(true);
  };

  useEffect(() => {
    if (!isEditing) return;
    let cancelled = false;
    fetchDetail(memberId).unwrap().then((data) => {
      if (!cancelled) populateForm(data);
    }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId]);

  const stateId = stateVal ? states.find(s => s.name === stateVal)?.id : null;
  const cityId = city ? cities.find(c => c.name === city)?.id : null;

  const formattedDob = dob
    ? dob.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const handleSubmit = () => {
    if (!name || !relation) {
      showAlert('Required', 'Name and Relationship are required.');
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
        showAlert(isEditing ? 'Updated' : 'Added', `${name} has been ${isEditing ? 'updated' : 'added as a family member'}.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      })
      .catch((error) => {
        showAlert('Failed', error?.message || `Could not ${isEditing ? 'update' : 'add'} this family member.`);
      });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={isEditing ? 'Edit Member' : 'Add Family Member'} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isEditing && loadingDetail && !hasPopulated ? (
          <View style={styles.detailLoadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.detailLoadingText}>Loading member details…</Text>
          </View>
        ) : isEditing && detailFailed && !hasPopulated ? (
          <TouchableOpacity style={styles.retryBox} onPress={() => fetchDetail(memberId).unwrap().then(populateForm).catch(() => {})}>
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
                  placeholderTextColor={colors.textPlaceholder}
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
                  placeholderTextColor={colors.textPlaceholder}
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
                  placeholderTextColor={colors.textPlaceholder}
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
                  placeholderTextColor={colors.textPlaceholder}
                  multiline
                />
              </View>

              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Date of Birth</Text>
                <TouchableOpacity style={styles.selectBox} onPress={() => setShowDobPicker(true)} activeOpacity={0.7}>
                  <Text style={[styles.selectText, !formattedDob && styles.placeholderText]}>
                    {formattedDob || 'dd-mm-yyyy'}
                  </Text>
                  <Icon name="event" size={20} color={colors.textSecondary} />
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
                  placeholderTextColor={colors.textPlaceholder}
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name="check" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>{isEditing ? 'Update Member' : 'Add Member'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },

  detailLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  detailLoadingText: { ...typography.body, color: colors.textSecondary },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },

  fieldWrap: { gap: 8 },
  inputLabel: { ...typography.labelMedium, color: colors.textPrimary },
  required: { color: colors.error },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    color: colors.textPrimary,
    ...typography.body,
  },
  multiline: { height: 96, textAlignVertical: 'top', paddingVertical: 14 },

  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  selectBoxDisabled: { backgroundColor: colors.surfaceSecondary, opacity: 0.6 },
  selectText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  placeholderText: { color: colors.textPlaceholder },
  retryText: { ...typography.labelMedium, color: colors.error },
  retryBox: { alignItems: 'center', paddingVertical: 40 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  cancelBtnText: { color: colors.primary, ...typography.labelLarge },
  submitBtn: {
    flex: 1.5,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#D94625',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#FFFFFF', ...typography.labelLarge },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '60%',
    paddingBottom: 24,
    paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h4, color: colors.textPrimary, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surfaceSecondary },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceSecondary,
  },
  modalOptionText: { ...typography.body, color: colors.textPrimary },
});

export default AddFamilyMember;
