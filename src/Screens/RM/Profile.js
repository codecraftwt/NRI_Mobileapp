import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { logoutUser, deleteAccount } from '../../Redux/slices/userSlice';
import { getRmProfile } from '../../Api/RM/rmProfileApi';
import { typography } from '../../theme/typography';

// Two-letter initials for the avatar, derived from the RM's own name.
function initialsFor(name) {
  return (name || 'RM').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

const MENU = [
  { id: 'personal', label: 'Personal Information', icon: 'person-outline', color: '#3B82F6', route: 'RMProfilePersonal' },
  { id: 'password', label: 'Change Password', icon: 'lock-outline', color: '#0EA5E9', route: 'RMProfilePassword' },
];

function Profile({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const deletingAccount = useSelector(state => state.user.deleteAccountStatus === 'loading');
  const [profile, setProfile] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getRmProfile().then(p => { if (active) setProfile(p); }).catch(() => {});
      return () => { active = false; };
    }, [])
  );

  const name = profile?.name || user?.name || 'Relationship Manager';
  const email = profile?.email || user?.email || '';
  const territory = [profile?.city?.name, profile?.state?.name].filter(Boolean).join(', ');
  const stats = profile?.stats;

  // Best-effort: revoke the token server-side (POST /auth/logout) and clear the
  // local session, then send the RM back to the shared sign-in screen. The
  // thunk clears local state even if the revoke call fails, so navigate
  // regardless of the result.
  const handleLogout = () => {
    dispatch(logoutUser()).finally(() => {
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    });
  };

  const openDeleteModal = () => {
    setDeletePassword('');
    setShowDeletePassword(false);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = () => {
    if (!deletePassword.trim()) {
      setDeleteError('Please enter your current password to confirm.');
      return;
    }
    setDeleteError(null);
    dispatch(deleteAccount({ currentPassword: deletePassword }))
      .unwrap()
      .then((res) => {
        setShowDeleteModal(false);
        setDeletePassword('');
        Alert.alert('Account Deleted', res?.deleted ? 'Your account has been deleted.' : 'Your account has been deactivated.');
        // Session already cleared in the slice — return to the login screen.
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      })
      .catch((error) => {
        // 422 = wrong password or deletion blocked.
        setDeleteError(error?.message || 'Could not delete your account. Please try again.');
      });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Curved navy header with decorative accents */}
      <View style={styles.header}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.decorCircleSm} pointerEvents="none" />
        <Text style={styles.headerTitle}>My Profile</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Floating profile card */}
        <View style={styles.profileCard}>
          <View style={styles.identityRow}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initialsFor(name)}</Text>
              </View>
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>{name}</Text>
              {!!email && <Text style={styles.email} numberOfLines={1}>{email}</Text>}
              <View style={styles.rolePill}>
                <Icon name="verified-user" size={13} color="#059669" />
                <Text style={styles.roleText}>Relationship Manager</Text>
              </View>
            </View>
          </View>
          {!!territory && (
            <View style={styles.territoryChip}>
              <Icon name="place" size={13} color="#475569" />
              <Text style={styles.territoryText}>{territory}</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="groups" size={20} color="#3B82F6" />
            </View>
            <Text style={styles.statValue}>{stats ? stats.assignedCustomers : '—'}</Text>
            <Text style={styles.statLabel}>Customers</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="workspace-premium" size={20} color="#059669" />
            </View>
            <Text style={styles.statValue}>{stats ? stats.activeMemberships : '—'}</Text>
            <Text style={styles.statLabel}>Active Plans</Text>
          </View>
        </View>

        {/* Menu */}
        <Text style={styles.sectionLabel}>Account</Text>
        <View style={styles.menuBlock}>
          {MENU.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, idx < MENU.length - 1 && styles.menuBorder]}
              activeOpacity={0.6}
              onPress={() => item.route && navigation.navigate(item.route)}
            >
              <View style={[styles.menuIconBg, { backgroundColor: item.color + '18' }]}>
                <Icon name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Icon name="chevron-right" size={22} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.85} onPress={handleLogout}>
          <Icon name="logout" size={20} color="#A64416" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={openDeleteModal} activeOpacity={0.85}>
          <Icon name="delete-outline" size={18} color="#DC2626" />
          <Text style={styles.deleteBtnText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Delete account — password-confirmed, destructive */}
      <Modal visible={showDeleteModal} transparent animationType="fade" onRequestClose={() => !deletingAccount && setShowDeleteModal(false)}>
        <KeyboardAvoidingView style={styles.deleteOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.deleteCard}>
            <View style={styles.deleteIconWrap}>
              <Icon name="warning-amber" size={28} color="#DC2626" />
            </View>
            <Text style={styles.deleteTitle}>Delete Account</Text>
            <Text style={styles.deleteMsg}>
              This permanently deletes your account. If it's linked to existing records it's deactivated instead. This can't be undone. Enter your password to confirm.
            </Text>

            <View style={styles.deleteInputRow}>
              <TextInput
                style={styles.deleteInput}
                placeholder="Current password"
                placeholderTextColor="#94A3B8"
                secureTextEntry={!showDeletePassword}
                autoCapitalize="none"
                value={deletePassword}
                editable={!deletingAccount}
                onChangeText={(t) => { setDeletePassword(t); if (deleteError) setDeleteError(null); }}
              />
              <TouchableOpacity onPress={() => setShowDeletePassword(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name={showDeletePassword ? 'visibility-off' : 'visibility'} size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            {!!deleteError && <Text style={styles.deleteErrorText}>{deleteError}</Text>}

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={[styles.deleteActionBtn, styles.deleteCancelBtn]}
                onPress={() => setShowDeleteModal(false)}
                disabled={deletingAccount}
                activeOpacity={0.8}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteActionBtn, styles.deleteConfirmBtn, deletingAccount && styles.deleteConfirmBtnDisabled]}
                onPress={confirmDeleteAccount}
                disabled={deletingAccount}
                activeOpacity={0.85}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },

  // Curved navy header with soft decorative circles.
  header: {
    height: 150, paddingHorizontal: 24, paddingTop: 58, backgroundColor: '#20304C',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden',
  },
  headerTitle: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  decorCircleLg: { position: 'absolute', top: -60, right: -40, width: 160, height: 160, borderRadius: 80, backgroundColor: 'rgba(255,255,255,0.06)' },
  decorCircleSm: { position: 'absolute', bottom: -30, left: -20, width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(253,230,138,0.08)' },

  // Pull the whole scroll view up so the first card overlaps the header without
  // being clipped (a negative margin on the card itself gets cut by the ScrollView).
  scroll: { marginTop: -44 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },

  // Profile card floats up over the header.
  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18,
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.12, shadowRadius: 24, elevation: 6,
  },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarRing: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center',
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 4,
  },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 26, fontFamily: typography.h2.fontFamily },
  identityText: { flex: 1, gap: 4 },
  name: { fontSize: 19, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  email: { fontSize: 13, color: '#64748B' },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D1FAE5', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, alignSelf: 'flex-start', marginTop: 2 },
  roleText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  territoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, marginTop: 14, alignSelf: 'stretch' },
  territoryText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#475569' },

  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 18, alignItems: 'center', gap: 2,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  statValue: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 24, marginBottom: 10, marginLeft: 4 },
  menuBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 1,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 16, marginTop: 24,
    borderWidth: 1, borderColor: '#A64416',
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#A64416' },

  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 16, borderRadius: 16, marginTop: 12,
    borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2',
  },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },

  deleteOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  deleteCard: { width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center' },
  deleteIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEE2E2', justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  deleteTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center' },
  deleteMsg: { fontSize: 13.5, color: '#64748B', textAlign: 'center', lineHeight: 20, marginTop: 8, marginBottom: 18 },
  deleteInputRow: { flexDirection: 'row', alignItems: 'center', width: '100%', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 50 },
  deleteInput: { flex: 1, fontSize: 15, color: '#1E293B', height: '100%' },
  deleteErrorText: { alignSelf: 'flex-start', fontSize: 12, color: '#DC2626', marginTop: 8 },
  deleteActions: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  deleteActionBtn: { flex: 1, height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deleteCancelBtn: { backgroundColor: '#F1F5F9' },
  deleteCancelText: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  deleteConfirmBtn: { backgroundColor: '#DC2626' },
  deleteConfirmBtnDisabled: { opacity: 0.7 },
  deleteConfirmText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default Profile;
