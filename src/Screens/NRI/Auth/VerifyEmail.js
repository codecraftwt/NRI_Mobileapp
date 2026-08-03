import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, StatusBar, Dimensions, SafeAreaView, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { sendEmailOtp, verifyEmailOtp } from '../../../Redux/slices/userSlice';
import { lightColors as baseColors } from '../../../theme/colors';
import { spacing, radius } from '../../../theme';
import AppAlert, { useAppAlert } from '../../../Components/AppAlert';

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};

const { width: W, height: H } = Dimensions.get('window');
const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmail({ route, navigation }) {
  const dispatch = useDispatch();
  const { showAlert, alertProps } = useAppAlert();
  const user = useSelector(state => state.user.user);
  const otpSendStatus = useSelector(state => state.user.otpSendStatus);
  const otpVerifyStatus = useSelector(state => state.user.otpVerifyStatus);
  const verifying = otpVerifyStatus === 'loading';
  const sending = otpSendStatus === 'loading';

  const email = route.params?.email || user?.email || '';

  const [digits, setDigits] = useState(['', '', '', '']);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const hasSentInitialCode = useRef(false);
  const inputs = useRef([]);

  const otp = digits.join('');

  // iOS often ignores `autoFocus` during the screen-transition animation, so
  // the keyboard never opens — focus the first box once the screen has settled.
  useEffect(() => {
    const t = setTimeout(() => inputs.current[0]?.focus(), 450);
    return () => clearTimeout(t);
  }, []);

  // Each box is its own input: typing a digit advances to the next box, and a
  // full code (autofill/paste) dropped into any box spreads across the rest.
  const handleChange = (text, index) => {
    const clean = text.replace(/\D/g, '');
    if (error) setError('');

    if (clean.length > 1) {
      const arr = [...digits];
      let i = index;
      clean.slice(0, 4 - index).split('').forEach((ch) => { arr[i] = ch; i += 1; });
      setDigits(arr);
      inputs.current[Math.min(i, 3)]?.focus();
      return;
    }

    const arr = [...digits];
    arr[index] = clean;
    setDigits(arr);
    if (clean && index < 3) inputs.current[index + 1]?.focus();
  };

  // Backspace on an empty box jumps back and clears the previous one.
  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      const arr = [...digits];
      arr[index - 1] = '';
      setDigits(arr);
      inputs.current[index - 1]?.focus();
    }
  };

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
        showAlert('Code Sent', `A new verification code has been sent to ${email}.`);
      })
      .catch((err) => {
        setCooldown(err?.retryAfter || 0);
        showAlert('Please Wait', err?.message || 'Please wait before requesting another code.');
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

          <View style={styles.otpWrapper}>
            <View style={styles.otpContainer}>
              {[0, 1, 2, 3].map((index) => (
                <TextInput
                  key={index}
                  ref={(el) => { inputs.current[index] = el; }}
                  style={[
                    styles.otpBox,
                    focusedIndex === index && styles.otpBoxActive,
                    !!digits[index] && styles.otpBoxFilled,
                    !!error && styles.otpBoxError,
                  ]}
                  keyboardType="number-pad"
                  maxLength={index === 0 ? 4 : 1}
                  value={digits[index]}
                  onChangeText={(t) => handleChange(t, index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  onFocus={() => setFocusedIndex(index)}
                  onBlur={() => setFocusedIndex(-1)}
                  textAlign="center"
                  returnKeyType="done"
                  selectionColor={C.primary}
                  textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                  autoComplete={index === 0 ? 'one-time-code' : 'off'}
                />
              ))}
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}
          </View>

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
  otpWrapper: {
    marginTop: 10,
    alignItems: 'center',
    width: '100%',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 10,
    position: 'relative',
  },
  otpBox: {
    width: 65,
    height: 75,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 28,
    fontFamily: 'Montserrat-Bold',
    color: '#1E293B',
    padding: 0,
    elevation: 2,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  otpBoxActive: {
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: '#FFFFFF',
    elevation: 8,
    shadowColor: C.primary,
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  otpBoxFilled: {
    borderWidth: 1.5,
    borderColor: C.primary,
    backgroundColor: '#F8FAFC',
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#EF4444',
    marginTop: 12,
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
