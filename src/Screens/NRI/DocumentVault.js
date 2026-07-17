import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
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
  const { showAlert, alertProps } = useAppAlert();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  // `retry` is a new function reference every render (not memoized by the
  // hook) — keeping it out of these deps avoids an infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const toggleShare = (doc) => {
    dispatch(toggleShareDocument(doc.id)).unwrap().catch((error) => {
      showAlert('Failed', error?.message || 'Could not update sharing for this document.');
    });
  };

  const handleDelete = (doc) => {
    showAlert('Delete', `Delete "${doc.documentName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          dispatch(removeDocument(doc.id)).unwrap().catch((error) => {
            showAlert('Failed', error?.message || 'Could not delete this document.');
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
      showAlert('Download Complete', `"${doc.documentName}" has been saved to your Downloads folder.`);
    } catch (error) {
      showAlert('Download Failed', error?.message || 'Could not download this document.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Document Vault" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={styles.loadingText}>Loading documents…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load documents. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {documents.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Icon name="folder-open" size={64} color="#94A3B8" />
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubText}>Upload your first document to get started.</Text>
          </View>
        ) : (
          documents.map(doc => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docIconWrap}>
                <Icon name="description" size={24} color="#A64416" />
              </View>
              
              <View style={styles.docInfo}>
                <Text style={styles.docName} numberOfLines={1}>{doc.documentName}</Text>
                
                <View style={styles.docSubRow}>
                  <Text style={styles.docType}>{DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}</Text>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.docExpiry}>
                    {doc.expiryDate || 'No Expiry'}
                  </Text>
                  {doc.isExpired && <Text style={styles.expiredBadge}>Expired</Text>}
                  {doc.expiringSoon && !doc.isExpired && <Text style={styles.expiringSoonBadge}>Soon</Text>}
                </View>

                <TouchableOpacity onPress={() => toggleShare(doc)} activeOpacity={0.7} style={styles.compactPillWrap}>
                  <View style={[styles.compactPill, doc.sharedWithRm && styles.compactPillActive]}>
                    <Icon
                      name={doc.sharedWithRm ? 'check-circle' : 'lock'}
                      size={12}
                      color={doc.sharedWithRm ? '#16A34A' : '#64748B'}
                    />
                    <Text style={[styles.compactPillText, doc.sharedWithRm && styles.compactPillTextActive]}>
                      {doc.sharedWithRm ? 'Shared with RM' : 'Private'}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.actionCol}>
                {downloadingId === doc.id ? (
                  <View style={styles.actionBtn}>
                    <ActivityIndicator size="small" color="#1E3A8A" />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDownload(doc)}>
                    <Icon name="file-download" size={18} color="#1E3A8A" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(doc)}>
                  <Icon name="delete-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.uploadBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('UploadDocument')}
        >
          <View style={styles.uploadIconWrap}>
            <Icon name="add" size={22} color="#1E3A8A" />
          </View>
          <Text style={styles.uploadBtnText}>Upload Document</Text>
        </TouchableOpacity>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  loadingText: { fontSize: 15, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  emptySubText: { fontSize: 15, color: '#94A3B8' },

  docCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  docIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
    gap: 6,
  },
  docName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  docSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  docType: { fontSize: 13, color: '#64748B' },
  bullet: { fontSize: 13, color: '#94A3B8' },
  docExpiry: { fontSize: 13, color: '#64748B' },
  expiredBadge: { fontSize: 11, fontWeight: '700', color: '#DC2626', backgroundColor: '#FEF2F2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  expiringSoonBadge: { fontSize: 11, fontWeight: '700', color: '#D97706', backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  
  compactPillWrap: {
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
  },
  compactPillActive: { borderColor: '#16A34A', backgroundColor: '#DCFCE7' },
  compactPillText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  compactPillTextActive: { color: '#16A34A' },

  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
  },

  uploadBtn: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    borderStyle: 'dashed',
  },
  uploadIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: { fontSize: 15, fontWeight: '700', color: '#1E3A8A' },
});

export default DocumentVault;
