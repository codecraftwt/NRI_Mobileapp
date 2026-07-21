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
  PermissionsAndroid,
  Linking,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { typography, spacing, radius } from '../../theme';
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
            <ActivityIndicator size="small" color="#D94625" />
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
                  {item === value && <Icon name="check" size={18} color="#D94625" />}
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

async function requestFilePermission(showAlert) {
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
    showAlert(
      'Permission Required',
      'Photo & document access is blocked. Please enable it from app settings to attach files.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
    );
  } else {
    showAlert('Permission Denied', 'Photo & document access is required to attach files.');
  }
  return false;
}

async function requestCameraPermission(showAlert) {
  if (Platform.OS !== 'android') return true;
  const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
  if (already) return true;

  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: 'Allow Camera Access',
    message: 'NRI Circle needs access to your camera to take a photo of the property.',
    buttonPositive: 'Allow',
    buttonNegative: 'Deny',
  });

  if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

  if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
    showAlert(
      'Permission Required',
      'Camera access is blocked. Please enable it from app settings to take a photo.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
    );
  } else {
    showAlert('Permission Denied', 'Camera access is required to take a photo.');
  }
  return false;
}

function AttachmentsCard({ propertyId }) {
  const [label, setLabel] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const { detail, uploadingAttachment, uploadAttachment, removeAttachment } = usePropertyDetail();
  const attachments = detail?.id === propertyId ? detail.attachments : [];
  const { showAlert, alertProps } = useAppAlert();

  const handleTakePhoto = async () => {
    setShowPhotoModal(false);
    const allowed = await requestCameraPermission(showAlert);
    if (!allowed) return;
    launchCamera({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      const name = response.assets?.[0]?.fileName || `photo_${Date.now()}.jpg`;
      const type = response.assets?.[0]?.type || 'image/jpeg';
      if (uri) {
        uploadAttachment(propertyId, 'photo', label.trim(), { uri, name, type })
          .unwrap()
          .then(() => setLabel(''))
          .catch((error) => {
            showAlert('Upload Failed', error?.message || 'Could not upload this photo.');
          });
      }
    });
  };

  const handleChooseFromGallery = async () => {
    setShowPhotoModal(false);
    const allowed = await requestFilePermission(showAlert);
    if (!allowed) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      const name = response.assets?.[0]?.fileName || `photo_${Date.now()}.jpg`;
      const type = response.assets?.[0]?.type || 'image/jpeg';
      if (uri) {
        uploadAttachment(propertyId, 'photo', label.trim(), { uri, name, type })
          .unwrap()
          .then(() => setLabel(''))
          .catch((error) => {
            showAlert('Upload Failed', error?.message || 'Could not upload this photo.');
          });
      }
    });
  };

  const pickAndUpload = async (kind) => {
    const allowed = await requestFilePermission(showAlert);
    if (!allowed) return;
    try {
      const [result] = await pick({
        type: [docTypes.images, docTypes.pdf],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });
      if (!result) return;
      if (result.size && result.size > 10 * 1024 * 1024) {
        showAlert('File Too Large', 'Attachments must be 10 MB or smaller.');
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
          showAlert('Upload Failed', error?.message || 'Could not upload this file.');
        });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      showAlert('Error', 'Could not select the file. Please try again.');
    }
  };

  const handleRemove = (attachmentId) => {
    showAlert('Remove Attachment', 'Are you sure you want to remove this attachment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeAttachment(propertyId, attachmentId).unwrap().catch((error) => {
            showAlert('Failed', error?.message || 'Could not remove this attachment.');
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
              <Icon name={a.type === 'photo' ? 'image' : 'description'} size={18} color="#1E3A8A" />
              <Text style={styles.attachmentLabel} numberOfLines={1}>{a.label || (a.type === 'photo' ? 'Photo' : 'Document')}</Text>
              <TouchableOpacity onPress={() => handleRemove(a.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="delete-outline" size={18} color="#DC2626" />
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
        <TouchableOpacity style={[styles.attachBtn, styles.rowItem]} onPress={() => setShowPhotoModal(true)} disabled={uploadingAttachment}>
          {uploadingAttachment ? <ActivityIndicator size="small" color="#D94625" /> : <Icon name="add-a-photo" size={16} color="#D94625" />}
          <Text style={styles.attachBtnText}>Add Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.attachBtn, styles.rowItem]} onPress={() => pickAndUpload('document')} disabled={uploadingAttachment}>
          {uploadingAttachment ? <ActivityIndicator size="small" color="#D94625" /> : <Icon name="note-add" size={16} color="#D94625" />}
          <Text style={styles.attachBtnText}>Add Document</Text>
        </TouchableOpacity>
      </View>
      <AppAlert {...alertProps} />

      <Modal visible={showPhotoModal} transparent animationType="fade" onRequestClose={() => setShowPhotoModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPhotoModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Add Photo</Text>
            
            <TouchableOpacity style={[styles.modalOption, { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]} onPress={handleTakePhoto}>
              <View style={styles.modalOptionLeft}>
                <View style={styles.menuIconBox}>
                  <Icon name="photo-camera" size={20} color="#1E3A8A" />
                </View>
                <Text style={styles.menuLabel}>Take Photo</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalOption} onPress={handleChooseFromGallery}>
              <View style={styles.modalOptionLeft}>
                <View style={styles.menuIconBox}>
                  <Icon name="photo-library" size={20} color="#1E3A8A" />
                </View>
                <Text style={styles.menuLabel}>Choose from Gallery</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  const { showAlert, alertProps } = useAppAlert();

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
      showAlert('Enter Pincode', 'Please enter a valid pincode to look up.');
      return;
    }
    lookupPostalCode(pincode.trim())
      .unwrap()
      .then((result) => {
        const match = result?.results?.[0];
        if (!match) {
          showAlert('Not Found', 'No address found for that pincode.');
          return;
        }
        if (match.stateName) setStateVal(match.stateName);
        if (match.cityName) setCity(match.cityName);
      })
      .catch((error) => {
        showAlert('Lookup Failed', error?.message || 'Could not look up that pincode. Please try again.');
      });
  };

  const handleSubmit = () => {
    if (!name || !address || !type) {
      showAlert('Required', 'Nickname, Property Type and Address are required.');
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
        showAlert(isEdit ? 'Updated' : 'Added', `${name} has been ${isEdit ? 'updated' : 'added to your properties'}.`, [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      })
      .catch((error) => {
        showAlert('Failed', error?.message || `Could not ${isEdit ? 'update' : 'add'} this property.`);
      });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={isEdit ? 'Edit Property' : 'Add Property'} showBack />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={true}
        extraScrollHeight={200}
        extraHeight={200}
      >
        {isEdit && loadingDetail && !hasPopulated ? (
          <View style={styles.detailLoadingBox}>
            <ActivityIndicator size="small" color="#D94625" />
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
                      <ActivityIndicator size="small" color="#D94625" />
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
                    style={styles.input}
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
                    <Icon name="add" size={16} color="#D94625" />
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
                <Icon name="delete-outline" size={18} color="#DC2626" />
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
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Icon name={isEdit ? 'save' : 'check'} size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>{isEdit ? 'Update Property' : 'Add Property'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  modalOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 14, color: '#0F172A', fontWeight: '500' },
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { padding: 20, paddingBottom: spacing.xxl, gap: spacing.md },

  detailLoadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
  detailLoadingText: { ...typography.body, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: spacing.xxl },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
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
  sectionHeaderText: { fontSize: 18, fontFamily: typography.labelMedium.fontFamily, color: '#1A1A1A' },

  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },

  fieldWrap: { gap: 6 },
  inputLabel: { ...typography.labelMedium, color: '#334155' },
  required: { color: '#DC2626' },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    height: 52,
    color: '#0F172A',
    ...typography.body,
  },
  multiline: { height: 100, textAlignVertical: 'top', paddingVertical: 14 },
  pincodeRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  pincodeInput: { flex: 1 },
  lookupBtn: { height: 52, minWidth: 70, borderRadius: 14, borderWidth: 1.5, borderColor: '#D94625', justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.md, backgroundColor: '#FBEAE5' },
  lookupBtnText: { color: '#D94625', ...typography.labelMedium },

  selectBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  selectBoxDisabled: { backgroundColor: '#F1F5F9' },
  selectText: { ...typography.body, color: '#0F172A', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  retryText: { ...typography.labelMedium, color: '#DC2626' },

  hint: { ...typography.small, color: '#64748B' },

  addUtilityBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1.5,
    borderColor: '#D94625',
    borderRadius: radius.search,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FBEAE5',
  },
  addUtilityBtnText: { color: '#D94625', ...typography.labelMedium },

  utilityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  utilityLabelInput: { flex: 1.2 },
  utilityValueInput: { flex: 1 },
  removeUtilityBtn: {
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 14,
    height: 52,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
  },

  attachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  attachmentLabel: { flex: 1, ...typography.body, color: '#0F172A' },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#D94625',
    backgroundColor: '#FBEAE5',
  },
  attachBtnText: { color: '#D94625', ...typography.labelMedium },

  actions: { flexDirection: 'row', gap: spacing.md, paddingTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: radius['2xl'],
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  cancelBtnText: { color: '#64748B', ...typography.labelLarge },
  submitBtn: {
    flex: 1.5,
    height: 52,
    borderRadius: radius['2xl'],
    backgroundColor: '#D94625',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    shadowColor: '#D94625',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', ...typography.labelLarge },

  // ---- dropdown modal ----
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    maxHeight: '60%',
    paddingBottom: spacing.lg,
    paddingTop: 12,
  },
  modalHandle: { width: 48, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontFamily: typography.labelMedium.fontFamily, color: '#1A1A1A', paddingHorizontal: spacing.md + 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md + 4,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalOptionText: { ...typography.body, color: '#0F172A' },
});

export default AddProperty;
