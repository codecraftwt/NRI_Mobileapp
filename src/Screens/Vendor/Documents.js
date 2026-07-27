import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, PermissionsAndroid, Linking, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useVendorProfile } from '../../Hooks/useVendorProfile';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function getStatusStyle(status) {
  switch ((status || '').toLowerCase()) {
    case 'verified': return { bg: colors.successBackground, text: colors.success };
    case 'pending': return { bg: colors.warningBackground, text: colors.warning };
    case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: colors.surfaceSecondary, text: colors.textSecondary };
  }
}

function Documents({ navigation }) {
  const { profile, loading, actionLoading, uploadDocument, deleteDocument, documentTypes, documentTypesLoading } = useVendorProfile();
  const [documentType, setDocumentType] = useState('');
  const [showTypes, setShowTypes] = useState(false);

  const documents = profile?.documents || [];

  // Label for a stored/selected type, resolved from the fetched enum list.
  const typeLabel = (t) =>
    documentTypes.find(d => d.value === (t || '').toLowerCase())?.label || (t || 'Document');

  const requestPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const permission = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    if (await PermissionsAndroid.check(permission)) return true;
    const result = await PermissionsAndroid.request(permission, {
      title: 'Allow File Access',
      message: 'NRI Circle needs access to your files so you can upload verification documents.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert('Permission Required', 'File access is blocked. Enable it from app settings.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]);
    }
    return false;
  };

  const handleUpload = async () => {
    if (!documentType) {
      Alert.alert('Select a type', 'Please choose a document type first.');
      return;
    }
    if (!(await requestPermission())) return;
    try {
      const results = await pick({ type: [docTypes.images, docTypes.pdf], allowMultiSelection: false, copyTo: 'cachesDirectory' });
      const picked = results[0];
      if (!picked) return;
      if (picked.size && picked.size > MAX_SIZE_BYTES) {
        Alert.alert('File Too Large', 'Please choose a file under 5 MB.');
        return;
      }
      await uploadDocument({
        documentType,
        file: { uri: picked.fileCopyUri || picked.uri, name: picked.name, type: picked.type },
      }).unwrap();
      setDocumentType('');
      Alert.alert('Uploaded', 'Document uploaded — pending verification.');
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Upload Failed', err?.message || 'Could not upload the document. Please try again.');
    }
  };

  const handleDelete = (doc) => {
    Alert.alert('Remove Document?', `Remove your ${typeLabel(doc.documentType)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(doc.id).unwrap();
          } catch (e) {
            Alert.alert('Remove Failed', e?.message || 'Could not remove the document.');
          }
        },
      },
    ]);
  };

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Documents / KYC" showBack />
        <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Documents / KYC" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {documents.length === 0 ? (
          <Text style={styles.emptyText}>No documents uploaded yet.</Text>
        ) : (
          documents.map(doc => {
            const st = getStatusStyle(doc.status);
            return (
              <View key={doc.id} style={styles.docCard}>
                <View style={styles.docIconWrap}>
                  <Icon name="description" size={22} color={colors.accent} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={1}>{typeLabel(doc.documentType)}</Text>
                  <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                    <Text style={[styles.statusPillText, { color: st.text }]}>{doc.status || 'Pending'}</Text>
                  </View>
                  {!!doc.rejectionReason && <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>}
                </View>
                <TouchableOpacity onPress={() => handleDelete(doc)} disabled={actionLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="delete-outline" size={22} color="#DC2626" />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={styles.uploadCard}>
          <TouchableOpacity style={styles.select} onPress={() => setShowTypes(v => !v)} activeOpacity={0.7} disabled={documentTypesLoading}>
            <Text style={[styles.selectText, !documentType && styles.selectPlaceholder]}>
              {documentType ? typeLabel(documentType) : (documentTypesLoading ? 'Loading types...' : 'Document type...')}
            </Text>
            {documentTypesLoading
              ? <ActivityIndicator size="small" color={colors.textSecondary} />
              : <Icon name={showTypes ? 'expand-less' : 'expand-more'} size={22} color={colors.textSecondary} />}
          </TouchableOpacity>
          {showTypes && (
            <View style={styles.dropdown}>
              {documentTypes.length === 0 ? (
                <Text style={[styles.dropdownItemText, { padding: 14, color: colors.textPlaceholder }]}>No document types available.</Text>
              ) : (
                documentTypes.map(t => (
                  <TouchableOpacity key={t.value} style={styles.dropdownItem} onPress={() => { setDocumentType(t.value); setShowTypes(false); }}>
                    <Text style={styles.dropdownItemText}>{t.label}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
          <TouchableOpacity style={[styles.uploadBtn, actionLoading && styles.uploadBtnDisabled]} onPress={handleUpload} disabled={actionLoading} activeOpacity={0.8}>
            {actionLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Icon name="file-upload" size={18} color={colors.primary} />
                <Text style={styles.uploadBtnText}>Upload document</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.hint}>PDF, JPG or PNG — max 5 MB.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },

  emptyText: { ...typography.body, color: colors.textPlaceholder, textAlign: 'center', paddingVertical: 12 },

  docCard: {
    backgroundColor: colors.surface, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
  },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.amberBackground, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1, gap: 6 },
  docName: { ...typography.h4, fontSize: 15, color: colors.textPrimary },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },
  rejectionText: { fontSize: 12, color: '#DC2626' },

  uploadCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  select: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 13,
  },
  selectText: { ...typography.body, color: colors.textPrimary },
  selectPlaceholder: { color: colors.textPlaceholder },
  dropdown: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, overflow: 'hidden', marginTop: -6 },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  dropdownItemText: { ...typography.body, color: colors.textPrimary },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1.5, borderColor: colors.primaryLight, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 15,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { ...typography.labelMedium, color: colors.primary },
  hint: { ...typography.small, color: colors.textPlaceholder, textAlign: 'center' },
});

export default Documents;
