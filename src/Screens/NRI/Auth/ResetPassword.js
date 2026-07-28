import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StatusBar, Dimensions, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword } from '../../../Redux/slices/userSlice';
import { lightColors as baseColors } from '../../../theme/colors';
import { spacing, radius } from '../../../theme';
import AppAlert, { useAppAlert } from '../../../Components/AppAlert';

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};

const { width: W, height: H } = Dimensions.get('window');
const MIN_PASSWORD_LENGTH = 8;

function ResetPassword({ route, navigation }) {
  const dispatch = useDispatch();
  const { showAlert, alertProps } = useAppAlert();
  const resetPasswordStatus = useSelector(state => state.user.resetPasswordStatus);
  const submitting = resetPasswordStatus === 'loading';

  const email = route.params?.email || '';
  const otp = route.params?.otp || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});

  const handleReset = () => {
    const nextErrors = {};
    if (!password) {
      nextErrors.password = 'Password is required.';
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!confirm) {
      nextErrors.confirm = 'Please confirm your password.';
    } else if (password !== confirm) {
      nextErrors.confirm = 'Passwords do not match.';
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});

    dispatch(resetPassword({ email, otp, password, passwordConfirmation: confirm }))
      .unwrap()
      .then(() => {
        showAlert(
          'Password Reset',
          'Your password has been reset successfully. You have been logged out of all devices. Please sign in with your new password.',
          [{ text: 'Sign In', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]
        );
      })
      .catch((err) => {
        const apiErrors = err?.errors || {};
        // Surface field-level 422s inline; anything else (expired OTP, unknown
        // account) goes to an alert so the user knows to restart the flow.
        const mapped = {};
        if (apiErrors.password) mapped.password = apiErrors.password[0];
        if (apiErrors.password_confirmation) mapped.confirm = apiErrors.password_confirmation[0];
        if (Object.keys(mapped).length) {
          setErrors(mapped);
        } else {
          showAlert('Could Not Reset Password', apiErrors.otp?.[0] || apiErrors.email?.[0] || err?.message || 'Invalid or expired code. Please request a new OTP.');
        }
      });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.headerSection}>
            <View style={styles.lockCircleWrap}>
              <View style={styles.lockCircle}>
                <Icon name="lock-reset" size={36} color={C.accent} />
              </View>
            </View>
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>Create a strong new password for your account. You'll be signed out everywhere and need to log in again.</Text>
          </View>

          <Text style={styles.inputLabel}>New Password</Text>
          <View style={[styles.inputWrap, !!errors.password && styles.inputWrapError]}>
            <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
              <Icon name="lock-outline" size={20} color={C.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Enter new password"
              placeholderTextColor={C.textPlaceholder}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={(v) => { setPassword(v); if (errors.password) setErrors(e => ({ ...e, password: undefined })); }}
            />
            <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={styles.eyeBtn}>
              <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={C.textPlaceholder} />
            </TouchableOpacity>
          </View>
          {!!errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={[styles.inputWrap, !!errors.confirm && styles.inputWrapError]}>
            <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
              <Icon name="lock-outline" size={20} color={C.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Re-enter new password"
              placeholderTextColor={C.textPlaceholder}
              secureTextEntry={!showConfirm}
              autoCapitalize="none"
              value={confirm}
              onChangeText={(v) => { setConfirm(v); if (errors.confirm) setErrors(e => ({ ...e, confirm: undefined })); }}
            />
            <TouchableOpacity onPress={() => setShowConfirm(s => !s)} style={styles.eyeBtn}>
              <Icon name={showConfirm ? 'visibility-off' : 'visibility'} size={20} color={C.textPlaceholder} />
            </TouchableOpacity>
          </View>
          {!!errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}

          <View style={styles.ctaWrapper}>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: C.accent }, submitting && styles.ctaBtnDisabled]} onPress={handleReset} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.ctaText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signInRow} onPress={() => navigation.navigate('Login')} disabled={submitting}>
            <Text style={styles.signInText}>Back to <Text style={[styles.signInLink, { color: C.accent }]}>Sign in</Text></Text>
          </TouchableOpacity>

          <Text style={styles.footer}>© 2026 NRI Circle. All rights reserved.</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <AppAlert {...alertProps} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  bgShape1: {
    position: 'absolute',
    top: -H * 0.25,
    right: -W * 0.4,
    width: W * 2,
    height: H * 0.7,
    backgroundColor: C.primaryLight + '15',
    borderRadius: 80,
    transform: [{ rotate: '-35deg' }],
  },
  bgShape2: {
    position: 'absolute',
    bottom: -H * 0.35,
    left: -W * 0.6,
    width: W * 2,
    height: H * 0.5,
    backgroundColor: C.accent + '15',
    borderRadius: 60,
    transform: [{ rotate: '-35deg' }],
  },
  headerSection: {
    paddingTop: 90,
    alignItems: 'center',
    zIndex: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'flex-start',
    zIndex: 2,
  },
  lockCircleWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  lockCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    fontFamily: 'Montserrat-Bold',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#64748B',
    marginTop: 8,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold',
    color: '#334155',
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.sm,
    height: 64,
    elevation: 8,
    shadowColor: C.primaryLight,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  inputWrapError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
    shadowColor: '#EF4444',
  },
  iconFloat: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#1E293B',
    height: '100%',
  },
  eyeBtn: {
    padding: 8,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#EF4444',
    marginTop: 8,
    marginLeft: 8,
  },
  ctaWrapper: {
    marginTop: 40,
    position: 'relative',
    alignItems: 'center',
  },
  ctaBtn: {
    flexDirection: 'row',
    height: 60,
    width: '100%',
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  signInRow: {
    alignItems: 'center',
    marginTop: 32,
  },
  signInText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#64748B',
  },
  signInLink: {
    fontFamily: 'Poppins-Bold',
  },
  footer: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default ResetPassword;
