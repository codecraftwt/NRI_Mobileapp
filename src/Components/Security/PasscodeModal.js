import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  Animated,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import securityService from '../../Services/securityService';
import PasscodeKeypad from './PasscodeKeypad';

export default function PasscodeModal({
  visible,
  mode = 'verify', // 'verify' | 'setup'
  title,
  subtitle,
  userProfile,
  onSuccess,
  onCancel,
  onFallbackToPassword,
}) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(
    insets?.top || 0,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );

  const [passcode, setPasscode] = useState('');
  const [setupFirstCode, setSetupFirstCode] = useState('');
  const [setupStep, setSetupStep] = useState(1); // 1: enter, 2: confirm, 3: enable biometrics
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);

  // Biometrics hardware state
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometryType, setBiometryType] = useState('Biometrics');
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Animations and execution tracking
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const autoPromptTimerRef = useRef(null);
  const hasPromptedBioRef = useRef(false);
  const isCompletedRef = useRef(false);
  const isPromptingBioRef = useRef(false);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const triggerShake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -12, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  // Check hardware biometrics and user preferences
  useEffect(() => {
    let mounted = true;
    const checkSecurityState = async () => {
      const bio = await securityService.checkBiometricsAvailable();
      const enabled = await securityService.isBiometricsEnabled();
      if (mounted) {
        setBiometricAvailable(bio.available);
        setBiometryType(bio.biometryType || 'Biometrics');
        setBiometricsEnabled(enabled);
      }
    };

    if (visible) {
      hasPromptedBioRef.current = false;
      isCompletedRef.current = false;
      isPromptingBioRef.current = false;
      if (autoPromptTimerRef.current) clearTimeout(autoPromptTimerRef.current);
      checkSecurityState();
      setPasscode('');
      setSetupFirstCode('');
      setSetupStep(1);
      setErrorMessage('');
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoPromptTimerRef.current) clearTimeout(autoPromptTimerRef.current);
    };
  }, [visible, fadeAnim]);

  // Attempt biometric prompt in verify mode
  const handleTriggerBiometrics = useCallback(async () => {
    if (!biometricAvailable || !biometricsEnabled || isLocked || isPromptingBioRef.current || isCompletedRef.current) {
      return;
    }

    isPromptingBioRef.current = true;
    setLoading(true);
    try {
      const result = await securityService.promptBiometrics(
        `Sign in to NRI Circle with ${biometryType === 'FaceID' ? 'Face ID' : 'Fingerprint'}`
      );
      if (result.success && !isCompletedRef.current) {
        isCompletedRef.current = true;
        setPasscode('');
        if (onSuccessRef.current) onSuccessRef.current({ method: 'biometrics' });
      }
    } catch (e) {
      console.log('[PasscodeModal] Biometric prompt error:', e);
    } finally {
      isPromptingBioRef.current = false;
      setLoading(false);
    }
  }, [biometricAvailable, biometricsEnabled, isLocked, biometryType]);

  // Auto-prompt biometrics ONCE when verify modal opens
  useEffect(() => {
    if (
      visible &&
      mode === 'verify' &&
      biometricAvailable &&
      biometricsEnabled &&
      !isLocked &&
      !hasPromptedBioRef.current &&
      !isCompletedRef.current
    ) {
      hasPromptedBioRef.current = true;
      if (autoPromptTimerRef.current) clearTimeout(autoPromptTimerRef.current);
      autoPromptTimerRef.current = setTimeout(() => {
        handleTriggerBiometrics();
      }, 350);
    }
  }, [visible, mode, biometricAvailable, biometricsEnabled, isLocked, handleTriggerBiometrics]);

  // Lockout countdown timer
  const startLockoutTimer = (seconds) => {
    setIsLocked(true);
    setLockCountdown(seconds);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setLockCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setIsLocked(false);
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Keypad press handler
  const handleDigitPress = (digit) => {
    if (isLocked || loading || passcode.length >= 4) return;
    const nextCode = passcode + digit;
    setPasscode(nextCode);
    setErrorMessage('');

    if (nextCode.length === 4) {
      handleComplete(nextCode);
    }
  };

  const handleBackspace = () => {
    if (isLocked || loading || passcode.length === 0) return;
    setPasscode((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  // When 4 digits are completed
  const handleComplete = async (code) => {
    if (mode === 'verify') {
      if (isCompletedRef.current || loading) return;
      setLoading(true);
      const result = await securityService.verifyPasscode(code);
      setLoading(false);

      if (result.success && !isCompletedRef.current) {
        isCompletedRef.current = true;
        setPasscode('');
        if (onSuccessRef.current) onSuccessRef.current({ method: 'passcode' });
      } else if (result.locked) {
        setPasscode('');
        triggerShake();
        startLockoutTimer(result.remainingLockSeconds || 30);
        setErrorMessage(`Too many failed attempts. Locked for ${result.remainingLockSeconds || 30}s.`);
      } else {
        setPasscode('');
        triggerShake();
        const remaining = result.remainingAttempts;
        setErrorMessage(
          remaining !== undefined
            ? `Incorrect passcode. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
            : 'Incorrect passcode. Please try again.'
        );
      }
    } else {
      // Setup mode
      if (setupStep === 1) {
        setSetupFirstCode(code);
        setPasscode('');
        setSetupStep(2);
      } else if (setupStep === 2) {
        if (code === setupFirstCode) {
          try {
            await securityService.savePasscode(code);
            // Check if device supports biometrics to ask step 3
            if (biometricAvailable) {
              setSetupStep(3);
            } else {
              if (onSuccess) onSuccess({ method: 'passcode_setup' });
            }
          } catch (e) {
            triggerShake();
            setErrorMessage('Failed to save passcode. Please try again.');
            setPasscode('');
            setSetupStep(1);
          }
        } else {
          triggerShake();
          setErrorMessage("Passcodes didn't match. Please start over.");
          setPasscode('');
          setSetupFirstCode('');
          setSetupStep(1);
        }
      }
    }
  };

  const handleEnableBiometrics = async (enable) => {
    await securityService.setBiometricsEnabled(enable);
    setBiometricsEnabled(enable);
    if (onSuccess) onSuccess({ method: 'setup_complete', biometrics: enable });
  };

  const renderDots = () => {
    const dots = [0, 1, 2, 3];
    return (
      <Animated.View style={[styles.dotsContainer, { transform: [{ translateX: shakeAnim }] }]}>
        {dots.map((index) => {
          const filled = index < passcode.length;
          return (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                errorMessage && styles.dotError,
              ]}
            />
          );
        })}
      </Animated.View>
    );
  };

  const getHeaderInfo = () => {
    if (mode === 'setup') {
      if (setupStep === 1) {
        return {
          title: title || 'Set 4-Digit Passcode',
          subtitle: subtitle || 'Create a passcode for fast and extra secure login',
        };
      }
      if (setupStep === 2) {
        return {
          title: 'Confirm Passcode',
          subtitle: 'Re-enter your 4-digit passcode to confirm',
        };
      }
      return {
        title: `Enable ${biometryType === 'FaceID' ? 'Face ID' : 'Fingerprint'}?`,
        subtitle: `Use your device's biometric sensor for instant 1-touch sign in`,
      };
    }

    return {
      title: title || 'Enter Passcode',
      subtitle: subtitle || (userProfile?.name ? `Welcome back, ${userProfile.name}` : 'Enter your 4-digit passcode or use fingerprint to continue'),
    };
  };

  if (!visible) return null;

  const header = getHeaderInfo();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      statusBarTranslucent={true}
      onRequestClose={onCancel || (() => {})}
    >
      <View style={[styles.safeArea, { paddingTop: topPadding }]}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

        {/* Top bar with Cancel */}
        <View style={styles.topBar}>
          {onCancel ? (
            <TouchableOpacity
              onPress={onCancel}
              style={styles.cancelBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel="Close"
            >
              <Icon name="close" size={20} color="#475569" />
            </TouchableOpacity>
          ) : (
            <View style={styles.topBarPlaceholder} />
          )}

          <View style={styles.logoBadge}>
            <Icon name="shield" size={15} color="#20304C" />
            <Text style={styles.logoBadgeText}>Security Verification</Text>
          </View>

          <View style={styles.topBarPlaceholder} />
        </View>

        {/* Main Content */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Step 3: Biometric Prompt in Setup Mode */}
          {mode === 'setup' && setupStep === 3 ? (
            <View style={styles.biometricPromptCard}>
              <View style={styles.bioIconCircle}>
                <Icon
                  name={biometryType === 'FaceID' ? 'face' : 'fingerprint'}
                  size={46}
                  color="#20304C"
                />
              </View>
              <Text style={styles.mainTitle}>{header.title}</Text>
              <Text style={styles.subTitle}>{header.subtitle}</Text>

              <View style={styles.bioActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.primaryBtn]}
                  onPress={() => handleEnableBiometrics(true)}
                  activeOpacity={0.8}
                >
                  <Icon name="check" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>
                    Enable {biometryType === 'FaceID' ? 'Face ID' : 'Fingerprint'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bioSkipBtn}
                  onPress={() => handleEnableBiometrics(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.bioSkipText}>Skip for Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Avatar / Shield Icon */}
              <View style={styles.headerIconContainer}>
                <View style={styles.shieldCircle}>
                  <Icon name="lock" size={32} color="#20304C" />
                </View>
              </View>

              <Text style={styles.mainTitle}>{header.title}</Text>
              <Text style={styles.subTitle}>{header.subtitle}</Text>

              {/* Dots */}
              {renderDots()}

              {/* Error / Lockout Message */}
              <View style={styles.errorContainer}>
                {loading ? (
                  <ActivityIndicator size="small" color="#20304C" />
                ) : errorMessage ? (
                  <View style={styles.errorRow}>
                    <Icon name="error-outline" size={16} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                ) : isLocked ? (
                  <Text style={styles.lockoutText}>Try again in {lockCountdown} seconds</Text>
                ) : null}
              </View>

              {/* Keypad */}
              <PasscodeKeypad
                onDigitPress={handleDigitPress}
                onBackspace={handleBackspace}
                onBiometricPress={handleTriggerBiometrics}
                showBiometric={mode === 'verify' && biometricAvailable && biometricsEnabled}
                biometryType={biometryType}
                disabled={isLocked || loading}
              />

              {/* Fallback to Email & Password */}
              {mode === 'verify' && onFallbackToPassword && (
                <TouchableOpacity
                  style={styles.fallbackBtn}
                  onPress={onFallbackToPassword}
                  activeOpacity={0.7}
                >
                  <Text style={styles.fallbackText}>Forgot passcode? Sign in with password</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  cancelBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBarPlaceholder: {
    width: 36,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2F6',
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 16,
  },
  logoBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#20304C',
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerIconContainer: {
    marginBottom: 16,
  },
  shieldCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#20304C',
    textAlign: 'center',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    marginBottom: 14,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
    transform: [{ scale: 1.15 }],
  },
  dotError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEE2E2',
  },
  errorContainer: {
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '500',
  },
  lockoutText: {
    fontSize: 13,
    color: '#B45309',
    fontWeight: '600',
  },
  fallbackBtn: {
    marginTop: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  fallbackText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#20304C',
    textDecorationLine: 'underline',
  },
  biometricPromptCard: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  bioIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bioActions: {
    width: '100%',
    maxWidth: 290,
    marginTop: 24,
    alignItems: 'center',
  },
  actionBtn: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  primaryBtn: {
    backgroundColor: '#20304C',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bioSkipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  bioSkipText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
});
