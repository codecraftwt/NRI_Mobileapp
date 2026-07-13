import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Dimensions, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../../../Redux/slices/userSlice';
import { lightColors as C } from '../../../theme/colors';
import { spacing, radius } from '../../../theme';

const { width: W, height: H } = Dimensions.get('window');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword({ navigation }) {
  const dispatch = useDispatch();
  const forgotPasswordStatus = useSelector(state => state.user.forgotPasswordStatus);
  const submitting = forgotPasswordStatus === 'loading';

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSendResetLink = () => {
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');

    dispatch(forgotPassword({ email: email.trim() }))
      .unwrap()
      .then(() => {
        setSent(true);
      })
      .catch((err) => {
        const message = err?.errors?.email?.[0] || err?.message || 'Something went wrong. Please try again.';
        setError(err?.errors?.email ? message : '');
        Alert.alert('Could Not Send Reset Link', message);
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

          {sent ? (
            <>
              <View style={styles.checkCircleWrap}>
                <View style={styles.checkCircle}>
                  <Icon name="mark-email-read" size={36} color={C.accent} />
                </View>
              </View>
              
              <Text style={styles.title}>Check your email</Text>
              <Text style={styles.subtitle}>
                We've sent a password reset link to <Text style={{fontFamily: 'Poppins-SemiBold', color: '#1E293B'}}>{email.trim()}</Text>. Click the link in the email to reset your password.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.title}>Forgot Password?</Text>
              <Text style={styles.subtitle}>Enter your email address and we'll send you a link to reset your password securely.</Text>
            </>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {sent ? (
            <>
              <View style={styles.ctaWrapper}>
                <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: C.primary }, submitting && styles.ctaBtnDisabled]} onPress={handleSendResetLink} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.ctaText}>Resend Email</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.signInRow} onPress={() => navigation.navigate('Login')}>
                <Text style={styles.signInText}>Back to <Text style={[styles.signInLink, { color: C.accent }]}>Sign in</Text></Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>Email Address</Text>
              <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
                <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
                  <Icon name="mail-outline" size={20} color={C.primary} />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={C.textPlaceholder}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (error) setError(''); }}
                />
              </View>
              {!!error && <Text style={styles.errorText}>{error}</Text>}

              <View style={styles.ctaWrapper}>
                <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: C.accent }, submitting && styles.ctaBtnDisabled]} onPress={handleSendResetLink} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.ctaText}>Send Reset Link</Text>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.signInRow} onPress={() => navigation.navigate('Login')} disabled={submitting}>
                <Text style={styles.signInText}>Remembered your password? <Text style={[styles.signInLink, { color: C.accent }]}>Sign in</Text></Text>
              </TouchableOpacity>
            </>
          )}

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
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
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
    marginBottom: spacing.xxl,
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
  
  // State 2: Sent checkmark
  checkCircleWrap: {
    alignItems: 'center',
    marginBottom: 20,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
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

  // Sign In Row
  signInRow: {
    alignItems: 'center',
    marginTop: 32
  },
  signInText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#64748B'
  },
  signInLink: {
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

export default ForgotPassword;
