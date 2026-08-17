import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { pick, types as docTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { resolveLocalCopies } from '../../Utils/localFileCopy';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useAttachmentViewer } from '../../Components/useAttachmentViewer';
import { typography } from '../../theme/typography';
import { useVendorProfile } from '../../Hooks/Vendor/useVendorProfile';

const MAX_SIZE_BYTES = 5 * 1024 * 1024;

function getStatusStyle(status) {
  switch ((status || '').toLowerCase()) {
    case 'verified': return { bg: '#DCFCE7', text: '#16A34A' };
    case 'pending': return { bg: '#FEF3C7', text: '#D97706' };
    case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#F1F5F9', text: '#64748B' };
  }
}

function Documents({ navigation }) {
  const { profile, loading, actionLoading, uploadDocument, deleteDocument, documentTypes, documentTypesLoading } = useVendorProfile();
  const { showAlert, alertProps } = useAppAlert();
  const { openAttachment, preview: attachmentPreview } = useAttachmentViewer();
  const [documentType, setDocumentType] = useState('');
  const [showTypes, setShowTypes] = useState(false);

  const documents = profile?.documents || [];

  // Label for a stored/selected type, resolved from the fetched enum list.
  const typeLabel = (t) =>
    documentTypes.find(d => d.value === (t || '').toLowerCase())?.label || (t || 'Document');

  const handleUpload = async () => {
    if (!documentType) {
      showAlert('Select a type', 'Please choose a document type first.');
      return;
    }
    try {
      const results = await pick({ type: [docTypes.images, docTypes.pdf], allowMultiSelection: false });
      const picked = results[0];
      if (!picked) return;
      if (picked.size && picked.size > MAX_SIZE_BYTES) {
        showAlert('File Too Large', 'Please choose a file under 5 MB.');
        return;
      }
      const [local] = await resolveLocalCopies([picked]);
      await uploadDocument({
        documentType,
        file: { uri: local.uri, name: picked.name, type: picked.type },
      }).unwrap();
      setDocumentType('');
      showAlert('Uploaded', 'Document uploaded — pending verification.');
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      showAlert('Upload Failed', err?.message || 'Could not upload the document. Please try again.');
    }
  };

  const handleDelete = (doc) => {
    showAlert('Remove Document?', `Remove your ${typeLabel(doc.documentType)}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDocument(doc.id).unwrap();
          } catch (e) {
            showAlert('Remove Failed', e?.message || 'Could not remove the document.');
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

        {/* Uploaded documents */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Documents</Text>
          <Text style={styles.cardSub}>Uploaded documents and their verification status.</Text>

          {documents.length === 0 ? (
            <Text style={styles.emptyText}>No documents uploaded yet.</Text>
          ) : (
            documents.map((doc, i) => {
              const st = getStatusStyle(doc.status);
              return (
                <View key={doc.id} style={[styles.docRow, i < documents.length - 1 && styles.docRowBorder]}>
                  <View style={styles.docIconWrap}>
                    <Icon name="description" size={22} color="#D94625" />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>{typeLabel(doc.documentType)}</Text>
                    <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                      <Text style={[styles.statusPillText, { color: st.text }]}>{doc.status || 'Pending'}</Text>
                    </View>
                    {!!doc.rejectionReason && <Text style={styles.rejectionText}>{doc.rejectionReason}</Text>}
                  </View>
                  <View style={styles.docActions}>
                    {!!doc.url && (
                      <TouchableOpacity onPress={() => openAttachment(doc.url, typeLabel(doc.documentType))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name="visibility" size={22} color="#2563EB" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(doc)} disabled={actionLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="delete-outline" size={22} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Upload a document */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upload a document</Text>

          <TouchableOpacity style={styles.select} onPress={() => setShowTypes(v => !v)} activeOpacity={0.7} disabled={documentTypesLoading}>
            <Text style={[styles.selectText, !documentType && styles.selectPlaceholder]}>
              {documentType ? typeLabel(documentType) : (documentTypesLoading ? 'Loading types...' : 'Document type...')}
            </Text>
            {documentTypesLoading
              ? <ActivityIndicator size="small" color="#94A3B8" />
              : <Icon name={showTypes ? 'expand-less' : 'expand-more'} size={22} color="#94A3B8" />}
          </TouchableOpacity>
          {showTypes && (
            <View style={styles.dropdown}>
              {documentTypes.length === 0 ? (
                <Text style={[styles.dropdownItemText, { padding: 14, color: '#94A3B8' }]}>No document types available.</Text>
              ) : (
                documentTypes.map((t, i) => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.dropdownItem, i < documentTypes.length - 1 && styles.dropdownItemBorder]}
                    onPress={() => { setDocumentType(t.value); setShowTypes(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownItemText}>{t.label}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          <TouchableOpacity style={[styles.uploadBtn, actionLoading && styles.btnDisabled]} onPress={handleUpload} disabled={actionLoading} activeOpacity={0.8}>
            {actionLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="file-upload" size={18} color="#FFFFFF" />
                <Text style={styles.uploadBtnText}>Upload document</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.hint}>PDF, JPG or PNG — max 5 MB.</Text>
        </View>
      </ScrollView>
      <AppAlert {...alertProps} />
      {attachmentPreview}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16, gap: 16 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 8 },

  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 16 },

  docRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
  docRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(217, 70, 37, 0.1)', justifyContent: 'center', alignItems: 'center' },
  docActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  docInfo: { flex: 1, gap: 6 },
  docName: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },
  rejectionText: { fontSize: 12, color: '#DC2626' },

  select: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13,
  },
  selectText: { fontSize: 14, color: '#0F172A' },
  selectPlaceholder: { color: '#94A3B8' },
  dropdown: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, overflow: 'hidden', marginTop: 8 },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 13 },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { fontSize: 14, color: '#0F172A' },

  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#D94625', borderRadius: 12, paddingVertical: 14, marginTop: 16,
  },
  btnDisabled: { opacity: 0.6 },
  uploadBtnText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  hint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 12 },
});

export default Documents;
