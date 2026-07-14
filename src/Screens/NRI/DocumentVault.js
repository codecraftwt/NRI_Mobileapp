import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
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
            <Icon name="folder-open" size={64} color={colors.textPlaceholder} />
            <Text style={styles.emptyText}>No documents yet</Text>
            <Text style={styles.emptySubText}>Upload your first document to get started.</Text>
          </View>
        ) : (
          documents.map(doc => (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docIconWrap}>
                <Icon name="description" size={24} color={colors.accent} />
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
                      color={doc.sharedWithRm ? colors.success : colors.textSecondary}
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
                    <ActivityIndicator size="small" color={colors.primary} />
                  </View>
                ) : (
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleDownload(doc)}>
                    <Icon name="file-download" size={18} color={colors.primary} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(doc)}>
                  <Icon name="delete-outline" size={18} color={colors.error} />
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
          <Icon name="add" size={24} color={colors.onAccent} />
          <Text style={styles.uploadBtnText}>Upload Document</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { ...typography.labelMedium, color: colors.error },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { ...typography.h3, color: colors.textSecondary },
  emptySubText: { ...typography.body, color: colors.textPlaceholder },

  docCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.amberBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  docInfo: {
    flex: 1,
    gap: 6,
  },
  docName: { ...typography.h4, fontSize: 15, color: colors.textPrimary },
  docSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  docType: { ...typography.small, color: colors.textSecondary },
  bullet: { ...typography.small, color: colors.textPlaceholder },
  docExpiry: { ...typography.small, color: colors.textSecondary },
  expiredBadge: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: colors.error, backgroundColor: '#FEE2E2', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  expiringSoonBadge: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: colors.warning, backgroundColor: colors.warningBackground, paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 },
  
  compactPillWrap: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  compactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  compactPillActive: { borderColor: colors.success, backgroundColor: colors.successBackground },
  compactPillText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: colors.textSecondary },
  compactPillTextActive: { color: colors.success },

  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: '#FEE2E2',
  },

  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 24,
    paddingVertical: 16,
    marginTop: 8,
  },
  uploadBtnText: { color: colors.onAccent, ...typography.labelLarge },
});

export default DocumentVault;
