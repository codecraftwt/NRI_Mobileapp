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
  PermissionsAndroid,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import Header from '../../Components/Header';
import { addProperty, updateProperty } from '../../Redux/slices/propertiesSlice';
import { usePropertyDetail } from '../../Hooks/usePropertyDetail';
import { useStates } from '../../Hooks/useStates';
import { useDistricts } from '../../Hooks/useDistricts';
import { usePostalCodeLookup } from '../../Hooks/usePostalCodeLookup';

const PROPERTY_TYPE_OPTIONS = ['Flat', 'House', 'Farm / Agricultural Land', 'Commercial', 'Plot'];
const PROPERTY_TYPE_TO_API = { Flat: 'flat', House: 'house', 'Farm / Agricultural Land': 'farm', Commercial: 'commercial', Plot: 'plot' };
const PROPERTY_TYPE_FROM_API = { flat: 'Flat', house: 'House', farm: 'Farm / Agricultural Land', commercial: 'Commercial', plot: 'Plot' };

let utilityIdCounter = 0;
function newUtilityRow() {
  utilityIdCounter += 1;
  return { id: `u${utilityIdCounter}`, label: '', value: '' };
}

// Reusable bottom-sheet dropdown field
function SelectField({ label, required, value, placeholder, options, disabled, loading, onSelect, style }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={[styles.fieldWrap, style]}>
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

function SectionHeader({ title, action }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
      {action}
    </View>
  );
}

async function requestFilePermission() {
  if (Platform.OS !== 'android') return true;
  const permission = Platform.Version >= 33
    ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
    : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
  const already = await PermissionsAndroid.check(permission);
  if (already) return true;

  const result = await PermissionsAndroid.request(permission, {
    title: 'Allow Photo & Document Access',
    message: 'NRI Circle needs access to your photos and documents so you can attach them to this property.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });

  if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    Alert.alert(
      'Permission Required',
      'Photo & document access is blocked. Please enable it from app settings to attach files.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
    );
  } else {
    Alert.alert('Permission Denied', 'Photo & document access is required to attach files.');
  }
  return false;
}

function AttachmentsCard({ propertyId }) {
  const [label, setLabel] = useState('');
  const { detail, uploadingAttachment, uploadAttachment, removeAttachment } = usePropertyDetail();
  const attachments = detail?.id === propertyId ? detail.attachments : [];

  const pickAndUpload = async (kind) => {
    const allowed = await requestFilePermission();
    if (!allowed) return;
    try {
      const [result] = await pick({
        type: [docTypes.images, docTypes.pdf],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });
      if (!result) return;
      if (result.size && result.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Attachments must be 10 MB or smaller.');
        return;
      }
      const file = {
        uri: result.fileCopyUri || result.uri,
        name: result.name,
        type: result.type || 'application/octet-stream',
      };
      uploadAttachment(propertyId, kind, label.trim(), file)
        .unwrap()
        .then(() => setLabel(''))
        .catch((error) => {
          Alert.alert('Upload Failed', error?.message || 'Could not upload this file.');
        });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', 'Could not select the file. Please try again.');
    }
  };

  const handleRemove = (attachmentId) => {
    Alert.alert('Remove Attachment', 'Are you sure you want to remove this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeAttachment(propertyId, attachmentId).unwrap().catch((error) => {
            Alert.alert('Failed', error?.message || 'Could not remove this attachment.');
          });
        },
      },
    ]);
  };

  return (
    <View style={styles.card}>
      <SectionHeader title="Photos & Documents" />

      {attachments.length === 0 ? (
        <Text style={styles.hint}>No attachments yet — add a photo or document below.</Text>
      ) : (
        <View style={{ gap: 8 }}>
          {attachments.map(a => (
            <View key={a.id} style={styles.attachmentRow}>
              <Icon name={a.type === 'photo' ? 'image' : 'description'} size={18} color="#8B5CF6" />
              <Text style={styles.attachmentLabel} numberOfLines={1}>{a.label || (a.type === 'photo' ? 'Photo' : 'Document')}</Text>
              <TouchableOpacity onPress={() => handleRemove(a.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="delete-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={styles.fieldWrap}>
        <Text style={styles.inputLabel}>Label (optional)</Text>
        <TextInput
          style={styles.input}
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Front view, Tax receipt"
          placeholderTextColor="#94A3B8"
        />
      </View>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.attachBtn, styles.rowItem]} onPress={() => pickAndUpload('photo')} disabled={uploadingAttachment}>
          {uploadingAttachment ? <ActivityIndicator size="small" color="#007AFF" /> : <Icon name="add-a-photo" size={16} color="#007AFF" />}
          <Text style={styles.attachBtnText}>Add Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.attachBtn, styles.rowItem]} onPress={() => pickAndUpload('document')} disabled={uploadingAttachment}>
          {uploadingAttachment ? <ActivityIndicator size="small" color="#007AFF" /> : <Icon name="note-add" size={16} color="#007AFF" />}
          <Text style={styles.attachBtnText}>Add Document</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AddProperty({ navigation, route }) {
  const dispatch = useDispatch();
  const propertyId = route?.params?.propertyId || null;
  const isEdit = !!propertyId;

  // Property Details
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [address, setAddress] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [area, setArea] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [utilities, setUtilities] = useState([]);
  const [notes, setNotes] = useState('');
  const [hasPopulated, setHasPopulated] = useState(false);

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();
  const { districts: cities, districtNames: cityNames, loading: loadingCities, failed: citiesFailed, retry: retryCities } = useDistricts(stateVal);
  const { loading: loadingPostalLookup, lookup: lookupPostalCode } = usePostalCodeLookup();
  const { detail, loading: loadingDetail, failed: detailFailed, fetchDetail } = usePropertyDetail();
  const submitting = useSelector(state => state.properties.mutationStatus === 'loading');

  useEffect(() => {
    if (isEdit) {
      fetchDetail(propertyId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propertyId]);

  useEffect(() => {
    if (!hasPopulated && detail && detail.id === propertyId) {
      setName(detail.nickname || '');
      setType(PROPERTY_TYPE_FROM_API[detail.type] || '');
      setAddress(detail.address || '');
      setStateVal(detail.stateName || '');
      setCity(detail.cityName || '');
      setPincode(detail.pincode || '');
      setArea(detail.areaSqft != null ? String(detail.areaSqft) : '');
      setBedrooms(detail.numBedrooms != null ? String(detail.numBedrooms) : '');
      setTenantName(detail.tenantName || '');
      setTenantPhone(detail.tenantPhone || '');
      setUtilities((detail.utilityAccounts || []).map((u, i) => ({ id: `u${i}`, label: u.type, value: u.account })));
      setNotes(detail.notes || '');
      setHasPopulated(true);
    }
  }, [detail, propertyId, hasPopulated]);

  const stateId = stateVal ? states.find(s => s.name === stateVal)?.id : null;
  const cityId = city ? cities.find(c => c.name === city)?.id : null;

  const addUtilityRow = () => setUtilities(prev => [...prev, newUtilityRow()]);
  const updateUtilityRow = (id, field, val) =>
    setUtilities(prev => prev.map(u => (u.id === id ? { ...u, [field]: val } : u)));
  const removeUtilityRow = (id) => setUtilities(prev => prev.filter(u => u.id !== id));

  const handleLookupPincode = () => {
    if (!pincode || pincode.trim().length < 4) {
      Alert.alert('Enter Pincode', 'Please enter a valid pincode to look up.');
      return;
    }
    lookupPostalCode(pincode.trim())
      .unwrap()
      .then((result) => {
        const match = result?.results?.[0];
        if (!match) {
          Alert.alert('Not Found', 'No address found for that pincode.');
          return;
        }
        if (match.stateName) setStateVal(match.stateName);
        if (match.cityName) setCity(match.cityName);
      })
      .catch((error) => {
        Alert.alert('Lookup Failed', error?.message || 'Could not look up that pincode. Please try again.');
      });
  };

  const handleSubmit = () => {
    if (!name || !address || !type) {
      Alert.alert('Required', 'Nickname, Property Type and Address are required.');
      return;
    }

    const utilityAccounts = utilities
      .filter(u => u.label.trim())
      .map(u => ({ type: u.label.trim(), account: u.value.trim() }));

    const payload = {
      nickname: name,
      type: PROPERTY_TYPE_TO_API[type],
      address,
      stateId,
      cityId,
      pincode,
      areaSqft: area ? Number(area) : undefined,
      numBedrooms: bedrooms ? Number(bedrooms) : undefined,
      tenantName,
      tenantPhone,
      utilityAccounts,
      notes,
    };

    const action = isEdit
      ? updateProperty({ id: propertyId, ...payload })
      : addProperty(payload);

    dispatch(action)
      .unwrap()
      .then(() => {
        Alert.alert(isEdit ? 'Updated' : 'Added', `${name} has been ${isEdit ? 'updated' : 'added to your properties'}.`);
        navigation.goBack();
      })
      .catch((error) => {
        Alert.alert('Failed', error?.message || `Could not ${isEdit ? 'update' : 'add'} this property.`);
      });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={isEdit ? 'Edit Property' : 'Add Property'} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isEdit && loadingDetail && !hasPopulated ? (
          <View style={styles.detailLoadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.detailLoadingText}>Loading property details…</Text>
          </View>
        ) : isEdit && detailFailed && !hasPopulated ? (
          <TouchableOpacity style={styles.retryBox} onPress={() => fetchDetail(propertyId)}>
            <Text style={styles.retryText}>Couldn't load property details. Tap to retry.</Text>
          </TouchableOpacity>
        ) : (
          <>
            {/* Property Details */}
            <View style={styles.card}>
              <SectionHeader title="Property Details" />

              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Nickname<Text style={styles.required}> *</Text></Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Pune Flat"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <SelectField
                label="Property Type"
                required
                value={type}
                placeholder="Select..."
                options={PROPERTY_TYPE_OPTIONS}
                onSelect={setType}
              />

              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Address<Text style={styles.required}> *</Text></Text>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Complete address in India"
                  multiline
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={styles.row}>
                <SelectField
                  label="State"
                  value={stateVal}
                  placeholder="Select State..."
                  options={stateNames}
                  onSelect={(v) => { setStateVal(v); setCity(''); }}
                  style={styles.rowItem}
                  loading={loadingStates}
                />
                <SelectField
                  label="City"
                  value={city}
                  placeholder="Select City..."
                  options={cityNames}
                  disabled={!stateVal}
                  loading={loadingCities}
                  onSelect={setCity}
                  style={styles.rowItem}
                />
              </View>
              {statesFailed && (
                <TouchableOpacity onPress={retryStates}>
                  <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
                </TouchableOpacity>
              )}
              {citiesFailed && (
                <TouchableOpacity onPress={retryCities}>
                  <Text style={styles.retryText}>Couldn't load cities. Tap to retry.</Text>
                </TouchableOpacity>
              )}

              <View style={styles.fieldWrap}>
                <Text style={styles.inputLabel}>Pincode</Text>
                <View style={styles.pincodeRow}>
                  <TextInput
                    style={[styles.input, styles.pincodeInput]}
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="e.g. 416008"
                    placeholderTextColor="#94A3B8"
                  />
                  <TouchableOpacity style={styles.lookupBtn} onPress={handleLookupPincode} disabled={loadingPostalLookup}>
                    {loadingPostalLookup ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Text style={styles.lookupBtnText}>Find</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.fieldWrap, styles.rowItem]}>
                  <Text style={styles.inputLabel}>Area (sqft)</Text>
                  <TextInput
                    style={styles.input}
                    value={area}
                    onChangeText={setArea}
                    keyboardType="number-pad"
                    placeholder="e.g. 1200"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.fieldWrap, styles.rowItem]}>
                  <Text style={styles.inputLabel}>Bedrooms</Text>
                  <TextInput
                    style={styles.input}
                    value={bedrooms}
                    onChangeText={setBedrooms}
                    keyboardType="number-pad"
                    placeholder="e.g. 3"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>

            {/* Tenant Information */}
            <View style={styles.card}>
              <SectionHeader title="Tenant Information" />
              <View style={styles.row}>
                <View style={[styles.fieldWrap, styles.rowItem]}>
                  <Text style={styles.inputLabel}>Tenant Name</Text>
                  <TextInput
                    style={styles.input}
                    value={tenantName}
                    onChangeText={setTenantName}
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={[styles.fieldWrap, styles.rowItem]}>
                  <Text style={styles.inputLabel}>Tenant Phone</Text>
                  <TextInput
                    style={july14styles.input}
                    value={tenantPhone}
                    onChangeText={setTenantPhone}
                    keyboardType="phone-pad"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>
            </View>

            {/* Utility Accounts */}
            <View style={styles.card}>
              <SectionHeader
                title="Utility Accounts"
                action={
                  <TouchableOpacity style={styles.addUtilityBtn} onPress={addUtilityRow} activeOpacity={0.8}>
                    <Icon name="add" size={16} color="#007AFF" />
                    <Text style={styles.addUtilityBtnText}>Add</Text>
                  </TouchableOpacity>
                }
              />

              {utilities.length === 0 ? (
                <Text style={styles.hint}>e.g. Electricity Board, MSEDCL, gas, water account numbers</Text>
              ) : (
                <View style={{ gap: 10 }}>
                  {utilities.map(u => (
                    <View key={u.id} style={styles.utilityRow}>
                      <TextInput
                        style={[styles.input, styles.utilityLabelInput]}
                        value={u.label}
                        onChangeText={(v) => updateUtilityRow(u.id, 'label', v)}
                        placeholder="Type (e.g. electricity)"
                        placeholderTextColor="#94A3B8"
                      />
                      <TextInput
                        style={[styles.input, styles.utilityValueInput]}
                        value={u.value}
                        onChangeText={(v) => updateUtilityRow(u.id, 'value', v)}
                        placeholder="Account number"
                        placeholderTextColor="#94A3B8"
                      />
                      <TouchableOpacity
                        style={styles.removeUtilityBtn}
                        onPress={() => removeUtilityRow(u.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name="delete-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Notes */}
            <View style={styles.card}>
              <SectionHeader title="Notes" />
              <TextInput
                style={[styles.input, styles.multiline]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes..."
                multiline
                placeholderTextColor="#94A3B8"
              />
            </View>

            {isEdit && <AttachmentsCard propertyId={propertyId} />}

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, submitting && styles.submitBtnDisabled]} onPress={handleSubmit} activeOpacity={0.85} disabled={submitting}>
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name={isEdit ? 'save' : 'check'} size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>{isEdit ? 'Update Property' : 'Add Property'}</Text>
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
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  detailLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  detailLoadingText: { fontSize: 13, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 40 },

  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sectionHeaderText: { fontSize: 15, fontWeight: '800', color: '#1E293B' },

  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },

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
  multiline: { height: 100, textAlignVertical: 'top', paddingVertical: 12 },
  pincodeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pincodeInput: { flex: 1 },
  lookupBtn: { height: 48, minWidth: 64, borderRadius: 10, borderWidth: 1, borderColor: '#007AFF', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 14 },
  lookupBtnText: { color: '#007AFF', fontSize: 13, fontWeight: '700' },

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

  hint: { fontSize: 12.5, color: '#94A3B8' },

  addUtilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#DCEBFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F0F7FF',
  },
  addUtilityBtnText: { color: '#007AFF', fontSize: 12.5, fontWeight: '700' },

  utilityRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  utilityLabelInput: { flex: 1.2 },
  utilityValueInput: { flex: 1 },
  removeUtilityBtn: {
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    height: 48,
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },

  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachmentLabel: { flex: 1, fontSize: 13, color: '#374151' },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  attachBtnText: { color: '#007AFF', fontSize: 13, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 12, paddingTop: 4 },
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

  // ---- dropdown modal ----
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

export default AddProperty;
