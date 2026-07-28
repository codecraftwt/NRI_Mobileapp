import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, StatusBar, Dimensions, SafeAreaView, KeyboardAvoidingView, Platform, Animated, Pressable } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../../../Redux/slices/userSlice';
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
const OTP_LENGTH = 4;

function ResetVerifyOtp({ route, navigation }) {
  const dispatch = useDispatch();
  const { showAlert, alertProps } = useAppAlert();
  const forgotPasswordStatus = useSelector(state => state.user.forgotPasswordStatus);
  const sending = forgotPasswordStatus === 'loading';

  const email = route.params?.email || '';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  // The OTP was already sent on the previous (email) screen, so start the
  // resend cooldown straight away rather than firing another send here.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  const inputRef = useRef(null);
  const caret = useRef(new Animated.Value(0)).current;
  const complete = otp.length === OTP_LENGTH;

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // Blinking caret shown inside the active (next-to-fill) cell.
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(caret, { toValue: 1, duration: 550, useNativeDriver: true }),
        Animated.timing(caret, { toValue: 0, duration: 550, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [caret]);

  const focusInput = () => inputRef.current?.focus();

  const handleResend = () => {
    if (cooldown > 0 || sending) return;
    dispatch(forgotPassword({ email }))
      .unwrap()
      .then(() => {
        setCooldown(RESEND_COOLDOWN_SECONDS);
        showAlert('Code Sent', `A new OTP has been sent to ${email}.`);
      })
      .catch((err) => {
        showAlert('Please Wait', err?.message || 'Could not resend the code. Please try again.');
      });
  };

  // No dedicated verify endpoint exists — the code is validated by the reset
  // step (POST /auth/reset-password), so here we just check the length and
  // carry the OTP forward to the set-new-password screen.
  const handleVerify = () => {
    if (otp.trim().length !== OTP_LENGTH) {
      setError('Enter the 4-digit code.');
      return;
    }
    setError('');
    navigation.navigate('ResetPassword', { email, otp: otp.trim() });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.headerSection}>
            <View style={styles.badgeOuter}>
              <View style={styles.badgeInner}>
                <Icon name="lock-clock" size={34} color={C.accent} />
              </View>
            </View>
            <Text style={styles.title}>Verify OTP</Text>
            <Text style={styles.subtitle}>
              We've sent a 4-digit code to <Text style={styles.subtitleStrong}>{email}</Text>. Enter it below to reset your password.
            </Text>
          </View>

          <View style={styles.otpWrapper}>
            {/* The whole row is a single tap target that focuses the hidden input. */}
            <Pressable style={styles.otpContainer} onPress={focusInput}>
              {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                const char = otp[index] || '';
                const isFilled = index < otp.length;
                const isActive = focused && index === otp.length && !complete;
                return (
                  <View
                    key={index}
                    style={[
                      styles.otpBox,
                      isFilled && styles.otpBoxFilled,
                      isActive && styles.otpBoxActive,
                      !!error && styles.otpBoxError,
                    ]}
                  >
                    {char ? (
                      <Text style={styles.otpText}>{char}</Text>
                    ) : isActive ? (
                      <Animated.View style={[styles.caret, { opacity: caret }]} />
                    ) : (
                      <View style={styles.placeholderDot} />
                    )}
                  </View>
                );
              })}
              <TextInput
                ref={inputRef}
                style={styles.hiddenInput}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                value={otp}
                onChangeText={(v) => { setOtp(v.replace(/\D/g, '')); if (error) setError(''); }}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                caretHidden
                autoFocus
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                importantForAutofill="yes"
              />
            </Pressable>
            {!!error && (
              <View style={styles.errorRow}>
                <Icon name="error-outline" size={15} color="#EF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          <View style={styles.ctaWrapper}>
            <TouchableOpacity
              style={[styles.ctaBtn, { backgroundColor: C.accent }, !complete && styles.ctaBtnDisabled]}
              onPress={handleVerify}
              activeOpacity={0.85}
            >
              <Text style={styles.ctaText}>Verify</Text>
              <Icon name="check-circle" size={20} color="white" style={styles.ctaIcon} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resendRow} onPress={handleResend} disabled={cooldown > 0 || sending}>
            <Text style={styles.resendText}>
              Didn't receive the code?{' '}
              <Text style={[styles.resendLink, (cooldown > 0 || sending) && styles.resendLinkDisabled]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend it'}
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
  flex: { flex: 1 },
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
  badgeOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: C.accent + '12',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
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
  subtitleStrong: {
    fontFamily: 'Poppins-SemiBold',
    color: '#1E293B',
  },
  otpWrapper: {
    marginTop: 4,
    alignItems: 'center',
    width: '100%',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 14,
    position: 'relative',
  },
  otpBox: {
    flex: 1,
    maxWidth: 74,
    aspectRatio: 0.84,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  otpBoxActive: {
    borderWidth: 2,
    borderColor: C.accent,
    backgroundColor: '#FFFFFF',
    elevation: 10,
    shadowColor: C.accent,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    transform: [{ translateY: -2 }],
  },
  otpBoxFilled: {
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: '#F8FAFC',
  },
  otpBoxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  otpText: {
    fontSize: 30,
    fontFamily: 'Montserrat-Bold',
    color: C.primary,
  },
  placeholderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E2E8F0',
  },
  caret: {
    width: 2.5,
    height: 30,
    borderRadius: 2,
    backgroundColor: C.accent,
  },
  hiddenInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
  },
  errorText: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#EF4444',
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
    opacity: 0.45,
    elevation: 0,
    shadowOpacity: 0,
  },
  ctaText: {
    color: 'white',
    fontSize: 17,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  ctaIcon: {
    marginLeft: 8,
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
    color: C.accent,
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

export default ResetVerifyOtp;
