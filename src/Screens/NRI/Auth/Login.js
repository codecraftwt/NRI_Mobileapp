import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, StatusBar, Dimensions, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../../Redux/slices/userSlice';
import { store } from '../../../Redux/store';
import { lightColors as baseColors } from '../../../theme/colors';
import { spacing, radius } from '../../../theme';

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};

const { width: W, height: H } = Dimensions.get('window');

function Login({ navigation }) {
  const dispatch = useDispatch();
  const loginStatus = useSelector(state => state.user.loginStatus);
  const submitting = loginStatus === 'loading';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearError = (field) => {
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const errorFor = (field) => {
    const value = fieldErrors[field];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const handleSignIn = () => {
    // TEMPORARY: vendor UI preview shortcut, no backend role routing yet.
    // Remove once real vendor accounts/role-based routing are wired up.
    if (email.trim().toLowerCase() === 'vendor@test.com' && password === 'vendor123') {
      navigation.replace('VendorHome');
      return;
    }

    const errors = {};
    if (!email.trim()) errors.login = 'Email is required.';
    if (!password) errors.password = 'Password is required.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    dispatch(loginUser({ login: email.trim(), password }))
      .unwrap()
      .then(() => {
        const onboarded = store.getState().user.user?.onboarded;
        navigation.replace(onboarded ? 'AppHome' : 'OnboardingProfile');
      })
      .catch((error) => {
        if (error?.errors) {
          setFieldErrors(error.errors);
        }
        Alert.alert('Sign In Failed', error?.message || 'Email or password is incorrect.');
      });
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Dynamic Geometric Background Layering */}
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.headerSection}>
          {/* Enhanced Concentric Logo Design */}
          <View style={styles.logoCenterWrap}>
            <View style={styles.logoOuterRing}>
              <View style={styles.logoInnerRing}>
                <View style={[styles.iconContainer, { backgroundColor: C.surface }]}>
                  <Icon name="public" size={32} color={C.primary} />
                </View>
              </View>
            </View>
            <Text style={styles.brandText}>NRI <Text style={{ color: C.primary }}>Circle</Text></Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Enter your credentials to access your dashboard and manage your properties.</Text>
        </View>

        <Text style={styles.inputLabel}>Email Address</Text>
        <View style={[styles.inputWrap, errorFor('login') && styles.inputWrapError]}>
          <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
            <Icon name="mail-outline" size={20} color={C.primary} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="name@domain.com"
            placeholderTextColor={C.textPlaceholder}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('login'); }}
          />
        </View>
        {!!errorFor('login') && <Text style={styles.errorText}>{errorFor('login')}</Text>}

        <Text style={styles.inputLabel}>Password</Text>
        <View style={[styles.inputWrap, errorFor('password') && styles.inputWrapError]}>
          <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
            <Icon name="lock-outline" size={20} color={C.primary} />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor={C.textPlaceholder}
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); }}
          />
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={styles.eyeBtn}>
            <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={20} color={C.textPlaceholder} />
          </TouchableOpacity>
        </View>
        {!!errorFor('password') && <Text style={styles.errorText}>{errorFor('password')}</Text>}

        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setKeepSignedIn(v => !v)} activeOpacity={0.7}>
            <View style={[styles.checkbox, keepSignedIn && { backgroundColor: C.accent, borderColor: C.accent }]}>
              {keepSignedIn && <Icon name="check" size={14} color="white" />}
            </View>
            <Text style={styles.checkboxLabel}>Keep me signed in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={[styles.forgotText, { color: C.primary }]}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: C.accent }, submitting && styles.ctaBtnDisabled]} onPress={handleSignIn} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.ctaText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signUpRow} onPress={() => navigation.navigate('Register')} disabled={submitting}>
          <Text style={styles.signUpText}>New to NRI Circle? <Text style={[styles.signUpLink, { color: C.accent }]}>Create an account</Text></Text>
        </TouchableOpacity>

        <Text style={styles.footer}>© 2026 NRI Circle. All rights reserved.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
  },

  // Dynamic Background Layers
  bgShape1: {
    position: 'absolute',
    top: -H * 0.25,
    right: -W * 0.4,
    width: W * 2,
    height: H * 0.7,
    backgroundColor: C.primaryLight + '15',
    borderRadius: 80, 
    transform: [{ rotate: '-35deg' }]
  },
  bgShape2: {
    position: 'absolute',
    bottom: -H * 0.35,
    left: -W * 0.6,
    width: W * 2,
    height: H * 0.5,
    backgroundColor: C.accent + '15',
    borderRadius: 60,
    transform: [{ rotate: '-35deg' }]
  },

  headerSection: {
    paddingTop: 60,
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
  
  // Concentric Logo Design
  logoCenterWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoOuterRing: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    backgroundColor: C.primaryLight + '10',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoInnerRing: {
    width: 78,
    height: 78,
    borderRadius: radius.full,
    backgroundColor: C.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
  },
  brandText: {
    fontSize: 26,
    fontFamily: 'Montserrat-Bold',
    color: '#1A1A1A',
    letterSpacing: -0.5
  },
  title: {
    fontSize: 34,
    fontFamily: 'Montserrat-Bold',
    color: '#1A1A1A',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#64748B',
    marginTop: 8,
    lineHeight: 24,
    marginBottom: 32,
    textAlign: 'center',
    paddingHorizontal: 10,
  },

  // Premium Inputs
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
    borderColor: '#FFFFFF'
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
    padding: 10,
    marginRight: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#EF4444',
    marginTop: 8,
    marginLeft: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  checkboxLabel: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#475569'
  },
  forgotText: {
    fontSize: 14,
    fontFamily: 'Poppins-SemiBold'
  },

  // Glowing CTA
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
    marginTop: 40,
  },
  ctaBtnDisabled: {
    opacity: 0.7
  },
  ctaText: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5
  },
  signUpRow: {
    alignItems: 'center',
    marginTop: 32
  },
  signUpText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#64748B'
  },
  signUpLink: {
    fontFamily: 'Poppins-Bold'
  },
  footer: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 40
  },
});

export default Login;
