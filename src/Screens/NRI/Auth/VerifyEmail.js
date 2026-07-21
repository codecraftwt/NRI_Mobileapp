import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, StatusBar, Dimensions, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { sendEmailOtp, verifyEmailOtp } from '../../../Redux/slices/userSlice';
import { lightColors as baseColors } from '../../../theme/colors';
import { spacing, radius } from '../../../theme';

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};

const { width: W, height: H } = Dimensions.get('window');
const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmail({ route, navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const otpSendStatus = useSelector(state => state.user.otpSendStatus);
  const otpVerifyStatus = useSelector(state => state.user.otpVerifyStatus);
  const verifying = otpVerifyStatus === 'loading';
  const sending = otpSendStatus === 'loading';

  const email = route.params?.email || user?.email || '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const hasSentInitialCode = useRef(false);

  // Send the first code as soon as this screen mounts, right after account creation.
  useEffect(() => {
    if (hasSentInitialCode.current) return;
    hasSentInitialCode.current = true;
    dispatch(sendEmailOtp())
      .unwrap()
      .then(() => setCooldown(RESEND_COOLDOWN_SECONDS))
      .catch((err) => {
        setCooldown(err?.retryAfter || 0);
      });
  }, [dispatch]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleResend = () => {
    if (cooldown > 0 || sending) return;
    dispatch(sendEmailOtp())
      .unwrap()
      .then(() => {
        setCooldown(RESEND_COOLDOWN_SECONDS);
        Alert.alert('Code Sent', `A new verification code has been sent to ${email}.`);
      })
      .catch((err) => {
        setCooldown(err?.retryAfter || 0);
        Alert.alert('Please Wait', err?.message || 'Please wait before requesting another code.');
      });
  };

  const handleVerify = () => {
    if (otp.trim().length !== 4) {
      setError('Enter the 4-digit code.');
      return;
    }
    setError('');
    dispatch(verifyEmailOtp({ otp: otp.trim() }))
      .unwrap()
      .then(() => {
        navigation.replace('OnboardingProfile');
      })
      .catch((err) => {
        setError(err?.message || 'Invalid or expired code.');
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
            <Text style={styles.title}>Verify your email</Text>
            <Text style={styles.subtitle}>
              We've sent a 4-digit code to <Text style={{ fontFamily: 'Poppins-SemiBold', color: '#1E293B' }}>{email}</Text>. Please enter it below to verify your account.
            </Text>
          </View>

          <Text style={styles.inputLabel}>Verification Code</Text>
          <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
            <View style={[styles.iconFloat, { backgroundColor: C.primaryLight + '15' }]}>
              <Icon name="verified-user" size={20} color={C.primary} />
            </View>
            <TextInput
              style={styles.otpInput}
              placeholder="----"
              placeholderTextColor={C.textPlaceholder}
              keyboardType="number-pad"
              maxLength={4}
              value={otp}
              onChangeText={(v) => { setOtp(v.replace(/\D/g, '')); if (error) setError(''); }}
            />
          </View>
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.ctaWrapper}>
            <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: C.accent }, verifying && styles.ctaBtnDisabled]} onPress={handleVerify} disabled={verifying}>
              {verifying ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Verify</Text>
                  <Icon name="check-circle" size={20} color="white" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resendRow} onPress={handleResend} disabled={cooldown > 0 || sending}>
            <Text style={styles.resendText}>
              Didn't receive the code?{' '}
              <Text style={[styles.resendLink, (cooldown > 0 || sending) && styles.resendLinkDisabled]}>
                {cooldown > 0 ? `Resend it (${cooldown}s)` : 'Resend it'}
              </Text>
            </Text>
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
    paddingTop: 100,
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
    marginBottom: 32,
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
  otpInput: {
    flex: 1,
    fontSize: 22,
    fontFamily: 'Montserrat-Bold',
    color: '#1E293B',
    height: '100%',
    textAlign: 'center',
    letterSpacing: 12,
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
  resendRow: {
    alignItems: 'center',
    marginTop: 32,
  },
  resendText: {
    fontSize: 15,
    fontFamily: 'Poppins-Regular',
    color: '#64748B',
  },
  resendLink: {
    fontFamily: 'Poppins-Bold',
    color: '#2563EB',
  },
  resendLinkDisabled: {
    color: '#94A3B8',
  },
  footer: {
    fontSize: 12,
    fontFamily: 'Poppins-Regular',
    color: '#CBD5E1',
    textAlign: 'center',
    marginTop: 40,
  },
});

export default VerifyEmail;
