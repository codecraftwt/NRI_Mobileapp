import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { changeUserPassword } from '../../Redux/slices/userSlice';
import securityService from '../../Services/securityService';
import PasscodeModal from '../../Components/Security/PasscodeModal';

export default function ProfilePassword({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const token = useSelector(state => state.user.token);
  const changePasswordStatus = useSelector(state => state.user.changePasswordStatus);
  const changingPassword = changePasswordStatus === 'loading';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { showAlert, alertProps } = useAppAlert();

  // Biometric & Passcode State
  const [hasPasscode, setHasPasscode] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);
  const [biometryType, setBiometryType] = useState('Biometrics');
  const [biometricsMessage, setBiometricsMessage] = useState('');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeModalMode, setPasscodeModalMode] = useState('setup');
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);

  const loadSecurityState = useCallback(async () => {
    const userId = user?._id || user?.id || user?.email;
    const isSet = await securityService.isPasscodeSet(userId);
    const bio = await securityService.checkBiometricsAvailable();
    const enabled = await securityService.isBiometricsEnabled();
    const autoLock = await securityService.isAutoLockEnabled();
    setHasPasscode(isSet);
    setBiometricsAvailable(bio.available);
    setBiometryType(bio.biometryType || 'Biometrics');
    setBiometricsEnabled(enabled);
    setBiometricsMessage(bio.message || '');
    setAutoLockEnabled(autoLock);

    if (user) {
      await securityService.saveQuickAuthSession({
        email: user?.email,
        name: user?.name,
        user,
        token,
        role: user?.role,
      });
    }
  }, [user, token]);

  const handleToggleAutoLock = async (value) => {
    await securityService.setAutoLockEnabled(value);
    setAutoLockEnabled(value);
  };

  useEffect(() => {
    loadSecurityState();
  }, [loadSecurityState]);

  const handleToggleBiometrics = async (value) => {
    await securityService.setBiometricsEnabled(value);
    setBiometricsEnabled(value);
    if (user && value) {
      await securityService.saveQuickAuthSession({
        email: user?.email,
        name: user?.name,
        user,
        token,
        role: user?.role,
      });
    }
    showAlert(
      value ? 'Biometrics Enabled' : 'Biometrics Disabled',
      value
        ? `You can now sign in using ${biometryType === 'FaceID' ? 'Face ID' : 'fingerprint'}.${!hasPasscode ? ' We also recommend setting a 4-digit passcode as backup.' : ''}`
        : 'Biometric sign-in has been turned off.'
    );
  };

  const handleRemovePasscode = () => {
    showAlert('Remove Passcode', 'Are you sure you want to remove your 4-digit passcode and biometric login?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await securityService.removePasscode();
          await loadSecurityState();
          showAlert('Passcode Removed', 'Your 4-digit passcode has been removed.');
        },
      },
    ]);
  };

  const clearPasswordError = (field) => {
    if (passwordErrors[field]) setPasswordErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const passwordErrorFor = (field) => {
    const value = passwordErrors[field];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const handleChangePassword = () => {
    const errors = {};
    if (!currentPassword) errors.current_password = 'Current password is required.';
    if (!newPassword) errors.password = 'New password is required.';
    else if (newPassword.length < 8) errors.password = 'New password must be at least 8 characters.';
    if (!confirmPassword) errors.password_confirmation = 'Please confirm your new password.';
    else if (newPassword !== confirmPassword) errors.password_confirmation = 'New password and confirmation do not match.';

    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }
    setPasswordErrors({});

    dispatch(changeUserPassword({
      currentPassword,
      password: newPassword,
      passwordConfirmation: confirmPassword,
    }))
      .unwrap()
      .then(() => {
        if (newPassword) {
          securityService.saveQuickAuthSession({ password: newPassword });
        }
        showAlert('Password Changed', 'Your password has been updated successfully. Other signed-in devices have been logged out.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      })
      .catch((error) => {
        if (error?.errors) {
          setPasswordErrors(error.errors);
        }
        showAlert('Change Password Failed', error?.message || 'Please check your current password and try again.');
      });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Password & Security" showBack={true} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 80}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 1: 4-Digit Passcode & Biometric Security */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Icon name="fingerprint" size={24} color="#20304C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Quick Login & Biometrics</Text>
                <Text style={styles.cardSubtitle}>Extra security layer for app login and quick unlock</Text>
              </View>
            </View>

            {/* Passcode Row */}
            <View style={styles.securityItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>4-Digit Passcode</Text>
                <Text style={styles.itemSubtitle}>
                  {hasPasscode ? 'Passcode is active on this device' : 'Set a passcode for fast sign in'}
                </Text>
              </View>
              {hasPasscode ? (
                <View style={styles.badgeRow}>
                  <View style={styles.activeBadge}>
                    <Icon name="check-circle" size={14} color="#16A34A" />
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                </View>
              ) : null}
            </View>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.outlineBtn, { borderColor: '#20304C' }]}
                onPress={() => {
                  setPasscodeModalMode('setup');
                  setShowPasscodeModal(true);
                }}
                activeOpacity={0.7}
              >
                <Icon name="lock" size={16} color="#20304C" style={{ marginRight: 6 }} />
                <Text style={[styles.outlineBtnText, { color: '#20304C' }]}>
                  {hasPasscode ? 'Change Passcode' : 'Set 4-Digit Passcode'}
                </Text>
              </TouchableOpacity>

              {hasPasscode ? (
                <TouchableOpacity
                  style={[styles.outlineBtn, { borderColor: '#DC2626' }]}
                  onPress={handleRemovePasscode}
                  activeOpacity={0.7}
                >
                  <Icon name="delete-outline" size={16} color="#DC2626" style={{ marginRight: 4 }} />
                  <Text style={[styles.outlineBtnText, { color: '#DC2626' }]}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Biometrics Toggle (if available) */}
            <View style={[styles.securityItemRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 8 }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.itemTitle}>
                  {biometryType === 'FaceID' ? 'Face ID Authentication' : 'Fingerprint Authentication'}
                </Text>
                <Text style={[styles.itemSubtitle, !biometricsAvailable && { color: '#B45309' }]}>
                  {biometricsAvailable
                    ? `Sign in instantly using ${biometryType === 'FaceID' ? 'Face ID' : 'fingerprint'}`
                    : biometricsMessage || 'Biometric hardware is not available on this device'}
                </Text>
              </View>
              <Switch
                value={biometricsEnabled}
                onValueChange={handleToggleBiometrics}
                disabled={!biometricsAvailable}
                trackColor={{ false: '#CBD5E1', true: '#20304C' }}
                thumbColor={biometricsEnabled ? '#FFFFFF' : '#F8FAFC'}
              />
            </View>

            {/* App Lock (Google Pay Style) Row */}
            <View style={[styles.securityItemRow, { borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 16, marginTop: 8 }]}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.itemTitle}>App Lock</Text>
                <Text style={styles.itemSubtitle}>
                  Require fingerprint or passcode whenever you launch NRI Circle
                </Text>
              </View>
              <Switch
                value={autoLockEnabled}
                onValueChange={handleToggleAutoLock}
                disabled={!hasPasscode && !biometricsEnabled}
                trackColor={{ false: '#CBD5E1', true: '#20304C' }}
                thumbColor={autoLockEnabled ? '#FFFFFF' : '#F8FAFC'}
              />
            </View>
          </View>

          {/* Card 2: Account Password */}
          <View style={styles.sectionCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderIcon}>
                <Icon name="lock-outline" size={24} color="#A64416" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>Account Password</Text>
                <Text style={styles.cardSubtitle}>Change your NRI Circle master password</Text>
              </View>
            </View>

            <Text style={styles.inputLabel}>Current Password<Text style={styles.required}> *</Text></Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputWithIcon, passwordErrorFor('current_password') && styles.inputError]}
                value={currentPassword}
                onChangeText={(v) => { setCurrentPassword(v); clearPasswordError('current_password'); }}
                secureTextEntry={!showCurrent}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowCurrent(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name={showCurrent ? 'visibility-off' : 'visibility'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {!!passwordErrorFor('current_password') && <Text style={styles.errorText}>{passwordErrorFor('current_password')}</Text>}

            <Text style={styles.inputLabel}>New Password<Text style={styles.required}> *</Text></Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputWithIcon, passwordErrorFor('password') && styles.inputError]}
                value={newPassword}
                onChangeText={(v) => { setNewPassword(v); clearPasswordError('password'); }}
                secureTextEntry={!showNew}
                placeholder="Minimum 8 characters"
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowNew(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name={showNew ? 'visibility-off' : 'visibility'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {!!passwordErrorFor('password') && <Text style={styles.errorText}>{passwordErrorFor('password')}</Text>}

            <Text style={styles.inputLabel}>Confirm New Password<Text style={styles.required}> *</Text></Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.inputWithIcon, passwordErrorFor('password_confirmation') && styles.inputError]}
                value={confirmPassword}
                onChangeText={(v) => { setConfirmPassword(v); clearPasswordError('password_confirmation'); }}
                secureTextEntry={!showConfirm}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(v => !v)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name={showConfirm ? 'visibility-off' : 'visibility'} size={20} color="#64748B" />
              </TouchableOpacity>
            </View>
            {!!passwordErrorFor('password_confirmation') && <Text style={styles.errorText}>{passwordErrorFor('password_confirmation')}</Text>}

            <TouchableOpacity style={[styles.saveBtn, changingPassword && styles.saveBtnDisabled]} onPress={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Change Password</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Passcode Modal for setup or verify */}
      <PasscodeModal
        visible={showPasscodeModal}
        mode={passcodeModalMode}
        onSuccess={async () => {
          setShowPasscodeModal(false);
          if (user) {
            await securityService.saveQuickAuthSession({
              email: user?.email,
              name: user?.name,
              user,
              token,
              role: user?.role,
            });
          }
          await loadSecurityState();
          showAlert('Passcode Saved', 'Your 4-digit passcode has been set successfully.');
        }}
        onCancel={() => setShowPasscodeModal(false)}
      />

      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 20 },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20,
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06, shadowRadius: 18, elevation: 3,
    borderWidth: 1, borderColor: '#E2E8F0'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  securityItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A34A',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 8,
  },
  outlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  outlineBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 12 },
  required: { color: '#DC2626' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52, fontSize: 16, color: '#0F172A' },
  inputError: { borderColor: '#DC2626', backgroundColor: '#FEF2F2' },
  inputRow: { position: 'relative', justifyContent: 'center' },
  inputWithIcon: { paddingRight: 48 },
  eyeBtn: { position: 'absolute', right: 14, height: 52, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 13, color: '#DC2626', marginTop: 6 },
  saveBtn: { backgroundColor: '#A64416', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});

