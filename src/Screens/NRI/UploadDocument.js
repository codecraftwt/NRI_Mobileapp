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
  ActivityIndicator,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import Header from '../../Components/Header';
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
        <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
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

  const handleChooseFile = async () => {
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
              placeholderTextColor="#94A3B8"
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
              <Icon name="event" size={18} color="#94A3B8" />
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
              placeholderTextColor="#94A3B8"
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },

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
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1E293B' },

  fieldWrap: { gap: 6 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  required: { color: '#EF4444' },
  hint: { fontSize: 11.5, color: '#9CA3AF', fontWeight: '400' },

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
  multiline: { height: 90, textAlignVertical: 'top', paddingVertical: 12 },

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
  selectText: { fontSize: 14, color: '#1E293B', flex: 1 },
  placeholderText: { color: '#94A3B8' },

  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
    height: 48,
  },
  chooseFileBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    height: '100%',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  chooseFileBtnText: { fontSize: 13.5, fontWeight: '700', color: '#334155' },
  fileNameText: { flex: 1, fontSize: 13.5, color: '#64748B', paddingHorizontal: 12 },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  checkboxLabel: { flex: 1, fontSize: 13.5, color: '#334155', fontWeight: '500' },

  actions: { flexDirection: 'row', gap: 12 },
  submitBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#9CC7FF' },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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

export default UploadDocument;
