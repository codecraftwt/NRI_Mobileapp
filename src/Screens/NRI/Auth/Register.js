import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, StatusBar, Dimensions, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../../Redux/slices/userSlice';
import { lightColors as C } from '../../../theme/colors';
import { spacing, radius } from '../../../theme';

const { width: W, height: H } = Dimensions.get('window');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register({ navigation }) {
  const dispatch = useDispatch();
  const registerStatus = useSelector(state => state.user.registerStatus);
  const submitting = registerStatus === 'loading';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearError = (field) => {
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const errorFor = (field) => {
    const value = fieldErrors[field];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Full name is required.';
    if (!email.trim()) errors.email = 'Email address is required.';
    else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (!phone.trim()) errors.phone = 'Phone number is required.';
    else if (phone.trim().replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid phone number.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) errors.password_confirmation = 'Please confirm your password.';
    else if (password !== confirmPassword) errors.password_confirmation = 'Passwords do not match.';
    return errors;
  };

  const handleCreateAccount = () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    dispatch(registerUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      passwordConfirmation: confirmPassword,
      referralCode: referralCode.trim() || undefined,
      affiliateCode: undefined,
    }))
      .unwrap()
      .then(() => {
        navigation.replace('OnboardingProfile');
      })
      .catch((error) => {
        if (error?.errors) {
          setFieldErrors(error.errors);
          Alert.alert('Check your details', error.message || 'Some information you entered is invalid.');
        } else {
          Alert.alert('Registration Failed', error?.message || 'Something went wrong. Please try again.');
        }
      });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Dynamic Geometric Background Layering */}
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />

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

            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join NRI Circle to start managing everything back home with ease.</Text>
          </View>

          <Text style={styles.inputLabel}>Full Name</Text>
          <View style={[styles.inputWrap, errorFor('name') && styles.inputWrapError]}>
            <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
              <Icon name="person-outline" size={20} color={C.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor={C.textPlaceholder}
              value={name}
              onChangeText={(v) => { setName(v); clearError('name'); }}
            />
          </View>
          {!!errorFor('name') && <Text style={styles.errorText}>{errorFor('name')}</Text>}

          <Text style={styles.inputLabel}>Email Address</Text>
          <View style={[styles.inputWrap, errorFor('email') && styles.inputWrapError]}>
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
              onChangeText={(v) => { setEmail(v); clearError('email'); }}
            />
          </View>
          {!!errorFor('email') && <Text style={styles.errorText}>{errorFor('email')}</Text>}

          <Text style={styles.inputLabel}>Phone Number</Text>
          <View style={[styles.inputWrap, errorFor('phone') && styles.inputWrapError]}>
            <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
              <Icon name="phone-iphone" size={20} color={C.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="+1 555 000 0000"
              placeholderTextColor={C.textPlaceholder}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(v) => { setPhone(v); clearError('phone'); }}
            />
          </View>
          {!!errorFor('phone') && <Text style={styles.errorText}>{errorFor('phone')}</Text>}

          <Text style={styles.inputLabel}>Password</Text>
          <View style={[styles.inputWrap, errorFor('password') && styles.inputWrapError]}>
            <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
              <Icon name="lock-outline" size={20} color={C.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Minimum 8 characters"
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

          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={[styles.inputWrap, errorFor('password_confirmation') && styles.inputWrapError]}>
            <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
              <Icon name="lock-outline" size={20} color={C.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Re-enter your password"
              placeholderTextColor={C.textPlaceholder}
              secureTextEntry={!showConfirm}
              value={confirmPassword}
              onChangeText={(v) => { setConfirmPassword(v); clearError('password_confirmation'); }}
            />
            <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
              <Icon name={showConfirm ? 'visibility-off' : 'visibility'} size={20} color={C.textPlaceholder} />
            </TouchableOpacity>
          </View>
          {!!errorFor('password_confirmation') && <Text style={styles.errorText}>{errorFor('password_confirmation')}</Text>}

          <Text style={styles.inputLabel}>Referral Code <Text style={{fontWeight: 'normal', color: '#94A3B8'}}>(optional)</Text></Text>
          <View style={[styles.inputWrap, errorFor('referral_code') && styles.inputWrapError]}>
            <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
              <Icon name="card-giftcard" size={20} color={C.primary} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Have a friend's code?"
              placeholderTextColor={C.textPlaceholder}
              autoCapitalize="characters"
              value={referralCode}
              onChangeText={(v) => { setReferralCode(v); clearError('referral_code'); }}
            />
          </View>
          {!!errorFor('referral_code') && <Text style={styles.errorText}>{errorFor('referral_code')}</Text>}

          <View style={styles.ctaWrapper}>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: C.accent }, submitting && styles.ctaBtnDisabled]} onPress={handleCreateAccount} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.ctaText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.signUpRow} onPress={() => navigation.navigate('Login')} disabled={submitting}>
            <Text style={styles.signUpText}>Already have an account? <Text style={[styles.signUpLink, { color: C.accent }]}>Sign In</Text></Text>
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
  bgShape3: {
    position: 'absolute',
    top: '40%',
    left: -W * 0.2,
    width: W * 1.5,
    height: H * 0.03,
    backgroundColor: C.primary + '10',
    borderRadius: 10,
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

  // Glowing CTA
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
    opacity: 0.7
  },
  ctaText: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5
  },
  
  // Sign Up Row
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
  
  // Footer
  footer: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 40
  },
});

export default Register;
