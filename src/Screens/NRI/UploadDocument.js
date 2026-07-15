import React, { useState } from 'react';
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
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { uploadDocument } from '../../Redux/slices/documentsSlice';

const DOCUMENT_TYPE_OPTIONS = ['Passport', 'PAN Card', 'Aadhaar Card', 'Property Papers', 'Will', 'Power of Attorney', 'Insurance Policy', 'Other'];
const DOCUMENT_TYPE_TO_API = {
  Passport: 'passport',
  'PAN Card': 'pan_card',
  'Aadhaar Card': 'aadhaar_card',
  'Property Papers': 'property_papers',
  Will: 'will',
  'Power of Attorney': 'power_of_attorney',
  'Insurance Policy': 'insurance_policy',
  Other: 'other',
};

function SelectField({ label, required, value, placeholder, options, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TouchableOpacity style={styles.selectBox} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
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
                  <Text style={[styles.modalOptionText, item === value && { color: colors.primary, fontFamily: typography.labelLarge.fontFamily }]}>{item}</Text>
                  {item === value && <Icon name="check" size={20} color={colors.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function UploadDocument({ navigation }) {
  const dispatch = useDispatch();
  const [documentType, setDocumentType] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [file, setFile] = useState(null);
  const [expiryDate, setExpiryDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [shareWithRM, setShareWithRM] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formattedExpiry = expiryDate
    ? expiryDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : '';

  const isValid = documentType && documentName.trim().length > 0 && !!file;

  const requestFilePermission = async () => {
    if (Platform.OS !== 'android') return true;
    const permission = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;

    const result = await PermissionsAndroid.request(permission, {
      title: 'Allow Photo & Document Access',
      message: 'NRI Circle needs access to your photos and documents so you can upload this file.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;

    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert(
        'Permission Required',
        'Photo & document access is blocked. Please enable it from app settings to upload a file.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
    } else {
      Alert.alert('Permission Denied', 'Photo & document access is required to upload a file.');
    }
    return false;
  };

  const handleChooseFile = async () => {
    const allowed = await requestFilePermission();
    if (!allowed) return;
    try {
      const [res] = await pick({
        type: [docTypes.pdf, docTypes.images],
        allowMultiSelection: false,
        copyTo: 'cachesDirectory',
      });
      if (res.size && res.size > 10 * 1024 * 1024) {
        Alert.alert('File too large', 'Please choose a file under 10 MB.');
        return;
      }
      setFile({ name: res.name, uri: res.fileCopyUri || res.uri, type: res.type, size: res.size });
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', 'Could not select the file. Please try again.');
    }
  };

  const handleUpload = () => {
    if (!isValid) return;
    setSubmitting(true);
    dispatch(uploadDocument({
      documentType: DOCUMENT_TYPE_TO_API[documentType],
      documentName: documentName.trim(),
      file: { uri: file.uri, name: file.name, type: file.type || 'application/octet-stream' },
      expiryDate: expiryDate ? expiryDate.toISOString().slice(0, 10) : undefined,
      sharedWithRm: shareWithRM,
      notes,
    }))
      .unwrap()
      .then(() => {
        navigation.goBack();
      })
      .catch((error) => {
        setSubmitting(false);
        Alert.alert('Upload Failed', error?.message || 'Could not upload this document.');
      });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Upload Document" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Document Details</Text>

          <SelectField
            label="Document Type"
            required
            value={documentType}
            placeholder="Select..."
            options={DOCUMENT_TYPE_OPTIONS}
            onSelect={setDocumentType}
          />

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>Document Name<Text style={styles.required}> *</Text></Text>
            <TextInput
              style={styles.input}
              value={documentName}
              onChangeText={setDocumentName}
              placeholder="e.g. Passport — Rahul Sharma"
              placeholderTextColor={colors.textPlaceholder}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>File<Text style={styles.required}> *</Text></Text>
            <TouchableOpacity style={styles.fileRow} onPress={handleChooseFile} activeOpacity={0.7}>
              <View style={styles.chooseFileBtn}>
                <Text style={styles.chooseFileBtnText}>Choose File</Text>
              </View>
              <Text style={styles.fileNameText} numberOfLines={1}>
                {file ? file.name : 'No file chosen'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.hint}>PDF, JPG or PNG. Max 10 MB.</Text>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>Expiry Date <Text style={styles.hint}>(optional)</Text></Text>
            <TouchableOpacity style={styles.selectBox} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <Text style={[styles.selectText, !formattedExpiry && styles.placeholderText]}>
                {formattedExpiry || 'dd-mm-yyyy'}
              </Text>
              <Icon name="event" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={expiryDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selected) => {
                  setShowDatePicker(false);
                  if (selected) setExpiryDate(selected);
                }}
              />
            )}
          </View>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setShareWithRM(prev => !prev)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, shareWithRM && styles.checkboxChecked]}>
              {shareWithRM && <Icon name="check" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>Share this document with my Relationship Manager</Text>
          </TouchableOpacity>

          <View style={styles.fieldWrap}>
            <Text style={styles.inputLabel}>Notes <Text style={styles.hint}>(optional)</Text></Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={notes}
              onChangeText={setNotes}
              placeholder=""
              multiline
              placeholderTextColor={colors.textPlaceholder}
            />
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.submitBtn, (!isValid || submitting) && styles.submitBtnDisabled]}
            disabled={!isValid || submitting}
            onPress={handleUpload}
            activeOpacity={0.85}
          >
            {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.submitBtnText}>Upload</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={submitting}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionTitle: { ...typography.sectionTitle, color: colors.textPrimary },

  fieldWrap: { gap: 6 },
  inputLabel: { ...typography.labelMedium, color: colors.textPrimary },
  required: { color: colors.error },
  hint: { ...typography.tiny, color: colors.textSecondary },

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
  multiline: { height: 100, textAlignVertical: 'top', paddingVertical: 12 },

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
  selectText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  placeholderText: { color: colors.textPlaceholder },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    overflow: 'hidden',
    height: 52,
  },
  chooseFileBtn: {
    backgroundColor: colors.surfaceHighlight,
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  chooseFileBtnText: { ...typography.labelMedium, color: colors.primary },
  fileNameText: { flex: 1, ...typography.body, color: colors.textSecondary, paddingHorizontal: 12 },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { flex: 1, ...typography.small, color: colors.textPrimary },

  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  submitBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: colors.accent + '80' },
  submitBtnText: { color: colors.onAccent, ...typography.labelLarge },
  cancelBtn: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  cancelBtnText: { color: colors.primary, ...typography.labelLarge },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 40,
    paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 12 },
  modalTitle: { ...typography.sectionTitle, color: colors.textPrimary, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.surfaceSecondary },
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

export default UploadDocument;
