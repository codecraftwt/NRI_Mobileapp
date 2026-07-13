import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useDocuments } from '../../Hooks/useDocuments';
import { toggleShareDocument, removeDocument } from '../../Redux/slices/documentsSlice';
import { getDocumentDownloadUrl } from '../../Api/documentApi';
import { downloadDocumentFile } from '../../Utils/fileDownload';

const DOCUMENT_TYPE_LABELS = {
  passport: 'Passport',
  pan_card: 'PAN Card',
  aadhaar_card: 'Aadhaar Card',
  property_papers: 'Property Papers',
  will: 'Will',
  power_of_attorney: 'Power of Attorney',
  insurance_policy: 'Insurance Policy',
  other: 'Other',
};

function DocumentVault({ navigation }) {
  const dispatch = useDispatch();
  const { documents, loading, failed, retry } = useDocuments();
  const token = useSelector(state => state.user.token);
  const [downloadingId, setDownloadingId] = useState(null);

  const toggleShare = (doc) => {
    dispatch(toggleShareDocument(doc.id)).unwrap().catch((error) => {
      Alert.alert('Failed', error?.message || 'Could not update sharing for this document.');
    });
  };

  const handleDelete = (doc) => {
    Alert.alert('Delete', `Delete "${doc.documentName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch(removeDocument(doc.id)).unwrap().catch((error) => {
            Alert.alert('Failed', error?.message || 'Could not delete this document.');
          });
        },
      },
    ]);
  };

  const handleDownload = async (doc) => {
    setDownloadingId(doc.id);
    try {
      await downloadDocumentFile({
        url: getDocumentDownloadUrl(doc.id),
        filename: doc.documentName,
        token,
      });
      Alert.alert('Download Complete', `"${doc.documentName}" has been saved to your Downloads folder.`);
    } catch (error) {
      Alert.alert('Download Failed', error?.message || 'Could not download this document.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Document Vault" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backToCustomerBtn} onPress={() => navigation.navigate('Customer')} activeOpacity={0.7}>
          <Icon name="arrow-back" size={16} color="#374151" />
          <Text style={styles.backToCustomerText}>Back to Customer</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading documents…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load documents. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {documents.length > 0 && (
          <View style={styles.tableHeader}>
            <Text style={[styles.thCell, { flex: 1.5 }]}>Document</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Type</Text>
            <Text style={[styles.thCell, { flex: 0.8 }]}>Expiry</Text>
            <Text style={[styles.thCell, { flex: 1 }]}>Shared with RM</Text>
            <Text style={[styles.thCell, { flex: 0.7, textAlign: 'center' }]}>Actions</Text>
          </View>
        )}

        {documents.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Icon name="folder-open" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubText}>Upload your first document to get started.</Text>
          </View>
        ) : (
          documents.map(doc => (
            <View key={doc.id} style={styles.tableRow}>
              <View style={{ flex: 1.5 }}>
                <Text style={styles.cellName} numberOfLines={1}>{doc.documentName}</Text>
                {doc.isExpired ? (
                  <Text style={styles.expiredBadge}>Expired</Text>
                ) : doc.expiringSoon ? (
                  <Text style={styles.expiringSoonBadge}>Expiring soon</Text>
                ) : null}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cellText}>{DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}</Text>
              </View>
              <View style={{ flex: 0.8 }}>
                <Text style={styles.cellText}>{doc.expiryDate || '—'}</Text>
              </View>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => toggleShare(doc)}
                activeOpacity={0.7}
              >
                <View style={[styles.pill, doc.sharedWithRm && styles.pillActive]}>
                  <Icon
                    name={doc.sharedWithRm ? 'check-circle' : 'block'}
                    size={12}
                    color={doc.sharedWithRm ? '#10B981' : '#94A3B8'}
                  />
                  <Text style={[styles.pillText, doc.sharedWithRm && styles.pillTextActive]}>
                    {doc.sharedWithRm ? 'Shared' : 'Private'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={{ flex: 0.7, flexDirection: 'row', justifyContent: 'center', gap: 12 }}>
                {downloadingId === doc.id ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <TouchableOpacity onPress={() => handleDownload(doc)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="file-download" size={18} color="#007AFF" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(doc)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="delete-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.uploadBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('UploadDocument')}
        >
          <Icon name="upload-file" size={18} color="#fff" />
          <Text style={styles.uploadBtnText}>Upload Document</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 8 },

  backToCustomerBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginBottom: 4,
  },
  backToCustomerText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: '700', color: '#64748B' },
  emptySubText: { fontSize: 13, color: '#94A3B8' },

  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thCell: { fontSize: 11, fontWeight: '800', color: '#64748B', textTransform: 'uppercase' },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cellName: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  cellText: { fontSize: 12.5, color: '#64748B' },
  expiredBadge: { fontSize: 10.5, color: '#EF4444', fontWeight: '700', marginTop: 2 },
  expiringSoonBadge: { fontSize: 10.5, color: '#F59E0B', fontWeight: '700', marginTop: 2 },

  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  pillActive: { borderColor: '#BBF7D0', backgroundColor: '#F0FDF4' },
  pillText: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
  pillTextActive: { color: '#10B981' },

  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 12,
  },
  uploadBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

export default DocumentVault;
