import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors, typography, radius, spacing } from '../theme';

// Update prompt shown from a startup version-check (see App.js). Two modes:
// forceUpdate = true blocks the app (no "Later" button, no backdrop/back-button
// dismiss) since current_version is below the admin-configured min_version.
// forceUpdate = false is a dismissible nudge for a merely-available update.
export default function AppUpdateModal({ visible, forceUpdate, message, onUpdate, onClose }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={forceUpdate ? () => {} : onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon name="system-update" size={30} color={colors.primary} />
          </View>
          <Text style={styles.title}>{forceUpdate ? 'Update Required' : 'Update Available'}</Text>
          <Text style={styles.desc}>
            {message ||
              (forceUpdate
                ? 'A new version of NRI Circle is required to continue using the app. Please update now.'
                : 'A new version of NRI Circle is available with improvements and fixes.')}
          </Text>
          <TouchableOpacity style={styles.updateBtn} onPress={onUpdate} activeOpacity={0.85}>
            <Icon name="system-update-alt" size={16} color="#FFFFFF" />
            <Text style={styles.updateBtnText}>Update Now</Text>
          </TouchableOpacity>
          {!forceUpdate && (
            <TouchableOpacity style={styles.laterBtn} onPress={onClose}>
              <Text style={styles.laterBtnText}>Later</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { ...typography.h4, color: '#0F172A', textAlign: 'center' },
  desc: { ...typography.body, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    height: 52,
    borderRadius: radius.full,
    alignSelf: 'stretch',
    marginTop: spacing.lg,
  },
  updateBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: typography.h2.fontFamily },
  laterBtn: { paddingVertical: 12, marginTop: 4 },
  laterBtnText: { ...typography.labelMedium, color: '#64748B' },
});
