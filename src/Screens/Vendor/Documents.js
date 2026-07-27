import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const DOCUMENT_TYPES = ['Aadhaar Card', 'PAN Card', 'GST Certificate', 'Business License', 'Cancelled Cheque', 'Police Verification'];

function getStatusStyle(status) {
  switch (status) {
    case 'Verified': return { bg: colors.successBackground, text: colors.success };
    case 'Pending': return { bg: colors.warningBackground, text: colors.warning };
    default: return { bg: colors.surfaceSecondary, text: colors.textSecondary };
  }
}

function Documents({ navigation }) {
  const [documents] = useState([]); // uploaded docs — empty until wired to the API
  const [documentType, setDocumentType] = useState('');
  const [showTypes, setShowTypes] = useState(false);

  const handleUpload = () => {
    if (!documentType) {
      Alert.alert('Select a type', 'Please choose a document type first.');
      return;
    }
    Alert.alert('Upload Document', 'Document upload will be available soon.');
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Documents / KYC" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          {documents.length === 0 ? (
            <Text style={styles.emptyText}>No documents uploaded yet.</Text>
          ) : (
            documents.map(doc => {
              const statusStyle = getStatusStyle(doc.status);
              return (
                <View key={doc.id} style={styles.docCard}>
                  <View style={styles.docIconWrap}>
                    <Icon name="badge" size={22} color={colors.accent} />
                  </View>
                  <View style={styles.docInfo}>
                    <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                    <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                      <Text style={[styles.statusPillText, { color: statusStyle.text }]}>{doc.status}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          <TouchableOpacity style={styles.select} onPress={() => setShowTypes(v => !v)} activeOpacity={0.7}>
            <Text style={[styles.selectText, !documentType && styles.selectPlaceholder]}>{documentType || 'Document type...'}</Text>
            <Icon name={showTypes ? 'expand-less' : 'expand-more'} size={22} color={colors.textSecondary} />
          </TouchableOpacity>
          {showTypes && (
            <View style={styles.dropdown}>
              {DOCUMENT_TYPES.map(type => (
                <TouchableOpacity key={type} style={styles.dropdownItem} onPress={() => { setDocumentType(type); setShowTypes(false); }}>
                  <Text style={styles.dropdownItemText}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.uploadBtn} onPress={handleUpload} activeOpacity={0.8}>
            <Icon name="file-upload" size={18} color={colors.primary} />
            <Text style={styles.uploadBtnText}>Upload document</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },

  emptyText: { ...typography.body, color: colors.textPlaceholder, textAlign: 'center', paddingVertical: 8 },

  docCard: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  docIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.amberBackground, justifyContent: 'center', alignItems: 'center' },
  docInfo: { flex: 1, gap: 6 },
  docName: { ...typography.h4, fontSize: 15, color: colors.textPrimary },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily },

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
  uploadBtnText: { ...typography.labelMedium, color: colors.primary },
});

export default Documents;
