import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const DOCUMENTS = [
  { id: '1', name: 'Aadhaar Card', icon: 'badge', status: 'Verified' },
  { id: '2', name: 'PAN Card', icon: 'badge', status: 'Verified' },
  { id: '3', name: 'Police Verification Certificate', icon: 'shield', status: 'Pending' },
  { id: '4', name: 'Skill Certification', icon: 'workspace-premium', status: 'Not Uploaded' },
];

function getStatusStyle(status) {
  switch (status) {
    case 'Verified': return { bg: colors.successBackground, text: colors.success };
    case 'Pending': return { bg: colors.warningBackground, text: colors.warning };
    default: return { bg: colors.surfaceSecondary, text: colors.textSecondary };
  }
}

function Documents({ navigation }) {
  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Documents / KYC" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {DOCUMENTS.map(doc => {
          const statusStyle = getStatusStyle(doc.status);
          return (
            <View key={doc.id} style={styles.docCard}>
              <View style={styles.docIconWrap}>
                <Icon name={doc.icon} size={24} color={colors.accent} />
              </View>
              <View style={styles.docInfo}>
                <Text style={styles.docName} numberOfLines={1}>{doc.name}</Text>
                <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusStyle.text }]}>{doc.status}</Text>
                </View>
              </View>
            </View>
          );
        })}

        <TouchableOpacity style={styles.uploadBtn} activeOpacity={0.8}>
          <View style={styles.uploadIconWrap}>
            <Icon name="add" size={20} color={colors.primary} />
          </View>
          <Text style={styles.uploadBtnText}>Upload Document</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },

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
  docInfo: { flex: 1, gap: 6 },
  docName: { ...typography.h4, fontSize: 15, color: colors.textPrimary },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusPillText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily },

  uploadBtn: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight + '10',
    borderRadius: 16,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  uploadIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadBtnText: { ...typography.labelMedium, color: colors.primary },
});

export default Documents;
