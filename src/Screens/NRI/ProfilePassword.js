import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { changeUserPassword } from '../../Redux/slices/userSlice';

export default function ProfilePassword({ navigation }) {
  const dispatch = useDispatch();
  const changePasswordStatus = useSelector(state => state.user.changePasswordStatus);
  const changingPassword = changePasswordStatus === 'loading';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordErrors, setPasswordErrors] = useState({});
  const { showAlert, alertProps } = useAppAlert();

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
      <Header navigation={navigation} title="Change Password" showBack={true} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionCard}>
          <Text style={styles.inputLabel}>Current Password<Text style={styles.required}> *</Text></Text>
          <TextInput
            style={[styles.input, passwordErrorFor('current_password') && styles.inputError]}
            value={currentPassword}
            onChangeText={(v) => { setCurrentPassword(v); clearPasswordError('current_password'); }}
            secureTextEntry
            placeholderTextColor={colors.textPlaceholder}
          />
          {!!passwordErrorFor('current_password') && <Text style={styles.errorText}>{passwordErrorFor('current_password')}</Text>}

          <Text style={styles.inputLabel}>New Password<Text style={styles.required}> *</Text></Text>
          <TextInput
            style={[styles.input, passwordErrorFor('password') && styles.inputError]}
            value={newPassword}
            onChangeText={(v) => { setNewPassword(v); clearPasswordError('password'); }}
            secureTextEntry
            placeholder="Minimum 8 characters"
            placeholderTextColor={colors.textPlaceholder}
          />
          {!!passwordErrorFor('password') && <Text style={styles.errorText}>{passwordErrorFor('password')}</Text>}

          <Text style={styles.inputLabel}>Confirm New Password<Text style={styles.required}> *</Text></Text>
          <TextInput
            style={[styles.input, passwordErrorFor('password_confirmation') && styles.inputError]}
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); clearPasswordError('password_confirmation'); }}
            secureTextEntry
            placeholderTextColor={colors.textPlaceholder}
          />
          {!!passwordErrorFor('password_confirmation') && <Text style={styles.errorText}>{passwordErrorFor('password_confirmation')}</Text>}

          <TouchableOpacity style={[styles.saveBtn, changingPassword && styles.saveBtnDisabled]} onPress={handleChangePassword} disabled={changingPassword}>
            {changingPassword ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Change Password</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  inputLabel: { ...typography.labelMedium, color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
  required: { color: colors.error },
  input: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, height: 50, ...typography.body, color: colors.textPrimary },
  inputError: { borderColor: colors.error, backgroundColor: colors.errorBackground || '#FEF2F2' },
  errorText: { ...typography.labelMedium, color: colors.error, marginTop: 6 },
  saveBtn: { backgroundColor: '#D94625', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFFFFF', ...typography.labelLarge },
});
