import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Modal, ActivityIndicator, StatusBar, Dimensions, SafeAreaView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, syncDeviceToken, login, logout, fetchCurrentUser } from '../../../Redux/slices/userSlice';
import { selectOnboardingRoute, setPendingCustomPlanRequest } from '../../../Redux/slices/onboardingSlice';
import { isQuotedItem } from '../../../Redux/slices/cartSlice';
import { store } from '../../../Redux/store';
import { lightColors as baseColors } from '../../../theme/colors';
import { spacing, radius } from '../../../theme';
import securityService from '../../../Services/securityService';
import PasscodeModal from '../../../Components/Security/PasscodeModal';

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};

const { width: W, height: H } = Dimensions.get('window');

function Login({ navigation, route }) {
  const dispatch = useDispatch();
  const loginStatus = useSelector(state => state.user.loginStatus);
  const submitting = loginStatus === 'loading';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorDialog, setErrorDialog] = useState(null);

  // Security layer states (Fingerprint & Passcode)
  const [quickAuthInfo, setQuickAuthInfo] = useState(null);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showPasscodeSetupPrompt, setShowPasscodeSetupPrompt] = useState(false);
  const [showPasscodeSetupModal, setShowPasscodeSetupModal] = useState(false);
  const [pendingLoginResult, setPendingLoginResult] = useState(null);

  const checkQuickAuth = useCallback(async () => {
    try {
      const saved = await securityService.getQuickAuthSession();
      const hasPasscode = await securityService.isPasscodeSet();
      const bio = await securityService.checkBiometricsAvailable();
      const bioEnabled = await securityService.isBiometricsEnabled();

      // Show quick unlock card whenever:
      // 1. Device has biometric hardware available (bio.available)
      // 2. OR user has a 4-digit passcode configured (hasPasscode)
      // 3. OR user has enabled biometrics (bioEnabled)
      // 4. OR device has a saved profile/email from previous session
      if (bio.available || hasPasscode || bioEnabled || saved?.email || saved?.user) {
        setQuickAuthInfo({
          ...saved,
          email: saved?.email || '',
          name: saved?.name || '',
          hasPasscode,
          bioAvailable: bio.available,
          bioEnabled: bioEnabled && bio.available,
          biometryType: bio.biometryType || 'Biometrics',
        });
      } else {
        setQuickAuthInfo(null);
      }
    } catch (e) {
      console.log('[Login] checkQuickAuth error:', e);
    }
  }, []);

  useEffect(() => {
    checkQuickAuth();
  }, [checkQuickAuth]);

  useFocusEffect(
    useCallback(() => {
      checkQuickAuth();
    }, [checkQuickAuth])
  );

  const clearError = (field) => {
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const errorFor = (field) => {
    const value = fieldErrors[field];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const isQuickAuthenticatingRef = useRef(false);

  const quickAuthUserProfile = useMemo(() => ({
    name: quickAuthInfo?.name,
    email: quickAuthInfo?.email,
  }), [quickAuthInfo?.name, quickAuthInfo?.email]);

  // Reusable post-login destination routing
  const navigatePostLogin = useCallback((resultUser, token, isQuickUnlock = false) => {
    securityService.setJustLoggedIn(true);
    dispatch(syncDeviceToken());
    const role = String(resultUser?.role || '').toLowerCase();
    const roles = (resultUser?.roles || []).map(r => String(r?.name || r || '').toLowerCase());

    if (/(state|district|taluka)[-_ ]?admin/i.test(role) || roles.some(r => /(state|district|taluka)[-_ ]?admin/i.test(r))) {
      navigation.reset({ index: 0, routes: [{ name: 'StateAdminHome' }] });
      return;
    }
    if (/vendor/.test(role) || roles.some(r => /vendor/.test(r))) {
      if (resultUser?.emailVerified === false) {
        navigation.reset({ index: 1, routes: [{ name: 'Login' }, { name: 'VerifyEmail', params: { email: resultUser?.email || email.trim(), nextRoute: 'VendorHome' } }] });
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'VendorHome' }] });
      return;
    }
    if (/relationship|manager|\brm\b/.test(role) || roles.some(r => /relationship|manager|\brm\b/.test(r))) {
      if (resultUser?.emailVerified === false) {
        navigation.reset({ index: 1, routes: [{ name: 'Login' }, { name: 'VerifyEmail', params: { email: resultUser?.email || email.trim(), nextRoute: 'RMHome' } }] });
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'RMHome' }] });
      return;
    }
    if (/telecaller/.test(role) || roles.some(r => /telecaller/.test(r))) {
      if (resultUser?.emailVerified === false) {
        navigation.reset({ index: 1, routes: [{ name: 'Login' }, { name: 'VerifyEmail', params: { email: resultUser?.email || email.trim(), nextRoute: 'TelecallerHome' } }] });
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'TelecallerHome' }] });
      return;
    }
    if (/admin/.test(role) || roles.some(r => /admin/.test(r))) {
      if (resultUser?.emailVerified === false) {
        navigation.reset({ index: 1, routes: [{ name: 'Login' }, { name: 'VerifyEmail', params: { email: resultUser?.email || email.trim(), nextRoute: 'AdminHome' } }] });
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'AdminHome' }] });
      return;
    }

    if (resultUser?.emailVerified === false) {
      navigation.reset({ index: 1, routes: [{ name: 'Login' }, { name: 'VerifyEmail', params: { email: resultUser?.email || email.trim(), nextRoute: 'AppHome' } }] });
      return;
    }

    const onboardingTargetRoute = selectOnboardingRoute(store.getState());
    // Existing user quick-unlocking with biometrics/passcode navigates straight to AppHome
    if (isQuickUnlock || onboardingTargetRoute === 'AppHome') {
      const state = store.getState();
      const cartItems = state.cart?.items || [];
      const hasQuotedItem = cartItems.some(isQuotedItem);
      const pendingQuoted = state.cart?.pendingQuotedService || route?.params?.service || route?.params?.quotedService;
      const user = resultUser || state.user?.user;
      const membership = user?.membership;
      const hasMembership = (!!membership && membership !== 'None' && membership !== 'none') || (user?.membershipStatus === 'active') || (user?.has_membership === true);

      if ((hasQuotedItem || pendingQuoted) && hasMembership) {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'AppHome',
              params: {
                screen: 'Services',
                params: {
                  screen: 'Cart',
                  params: {
                    service: pendingQuoted,
                    isQuoted: true,
                  },
                },
              },
            },
          ],
        });
        return;
      }

      if (route?.params?.nextRoute === 'CustomPlanNew') {
        dispatch(setPendingCustomPlanRequest(false));
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'AppHome',
              params: {
                screen: 'Services',
                params: {
                  screen: 'CustomPlanNew',
                  params: {
                    service: route?.params?.customPlanService,
                  },
                },
              },
            },
          ],
        });
        return;
      }

      navigation.reset({ index: 0, routes: [{ name: 'AppHome' }] });
    } else {
      navigation.reset({ index: 1, routes: [{ name: 'Login' }, { name: onboardingTargetRoute }] });
    }
  }, [navigation, route, dispatch, email]);

  // Handle Quick Sign In with Fingerprint or Passcode
  const handleQuickUnlockSuccess = useCallback(async () => {
    if (isQuickAuthenticatingRef.current) return;
    isQuickAuthenticatingRef.current = true;
    setShowVerifyModal(false);

    try {
      // 1. Fetch latest stored session directly from storage
      const saved = await securityService.getQuickAuthSession();
      const currentEmail = saved?.email || quickAuthInfo?.email || email.trim();
      const currentPassword = saved?.password || quickAuthInfo?.password || password;
      const currentUser = saved?.user || quickAuthInfo?.user;
      const currentToken = saved?.token || quickAuthInfo?.token;

      // 2. If we have saved email & password, authenticate with backend for a fresh valid token
      if (currentEmail && currentPassword) {
        try {
          const result = await dispatch(
            loginUser({ login: currentEmail, password: currentPassword })
          ).unwrap();

          await securityService.saveQuickAuthSession({
            email: currentEmail,
            password: currentPassword,
            name: result?.user?.name,
            token: result?.token,
            user: result?.user,
            role: result?.user?.role,
          });

          navigatePostLogin(result?.user, result?.token, true);
          return;
        } catch (err) {
          console.log('[Login] Auto-login with saved credentials failed, falling back to session user/token:', err);
        }
      }

      // 3. No saved password (e.g. biometrics was enabled without a password-based
      // sign-in) — the cached token may already be server-revoked (e.g. by a prior
      // logout), so it must be validated via /auth/me before trusting it. Never
      // navigate into the app on an unverified token.
      if (currentUser && currentToken) {
        dispatch(login({ user: currentUser, token: currentToken }));
        try {
          const result = await dispatch(fetchCurrentUser()).unwrap();
          navigatePostLogin(result?.user || currentUser, currentToken, true);
          return;
        } catch (err) {
          console.log('[Login] Cached token is no longer valid, falling back to password prompt:', err);
          dispatch(logout());
        }
      }

      // 4. Fallback when no valid saved session is available for this device
      if (currentEmail) {
        setEmail(currentEmail);
      }
      setErrorDialog({
        type: 'info',
        title: 'Sign In Once to Link Account',
        message: 'Please sign in with your password once below to link your account. After this, fingerprint unlock will log you in directly!',
        btnText: 'Enter Password',
      });
    } finally {
      isQuickAuthenticatingRef.current = false;
    }
  }, [quickAuthInfo, email, password, dispatch, navigatePostLogin]);

  const handleOpenQuickAuth = useCallback(() => {
    if (!quickAuthInfo?.hasPasscode && !quickAuthInfo?.bioEnabled && !quickAuthInfo?.email && !email.trim()) {
      setErrorDialog({
        type: 'info',
        title: 'Sign In Once to Link Account',
        message: 'Please enter your email and password below and tap Sign In once. Your fingerprint and passcode will then be linked for instant 1-touch sign in!',
        btnText: 'Understood',
      });
      return;
    }
    setShowVerifyModal(true);
  }, [quickAuthInfo, email]);

  const handleSignIn = () => {
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
      .then(async (result) => {
        const newUserId = result?.user?._id || result?.user?.id;
        const newEmail = (result?.user?.email || email.trim()).toLowerCase();

        // 1. Detect if the device had credentials from a DIFFERENT user
        const previousSession = await securityService.getQuickAuthSession();
        const prevUserId = previousSession?.user?._id || previousSession?.user?.id;
        const prevEmail = (previousSession?.email || '').toLowerCase();

        const isDifferentUser = (prevUserId && newUserId && String(prevUserId) !== String(newUserId)) ||
                                (prevEmail && newEmail && prevEmail !== newEmail);

        if (isDifferentUser) {
          // Purge previous user's passcode, biometrics, and lock settings
          await securityService.resetAllSecurityCredentials();
        }

        // 2. Save current user's session
        await securityService.saveQuickAuthSession({
          email: email.trim(),
          password,
          name: result?.user?.name,
          user: result?.user,
          token: result?.token,
          role: result?.user?.role,
        });

        // 3. Check if THIS user already has a passcode
        const hasPasscode = await securityService.isPasscodeSet(newUserId || newEmail);
        if (!hasPasscode) {
          // Offer 4-digit passcode & fingerprint setup
          setPendingLoginResult(result);
          setShowPasscodeSetupPrompt(true);
        } else {
          navigatePostLogin(result?.user, result?.token);
        }
      })
      .catch((error) => {
        if (error?.errors) {
          setFieldErrors(error.errors);
        }
        setErrorDialog({
          title: 'Sign In Failed',
          message: error?.message || 'Email or password is incorrect.',
        });
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
          <View style={styles.logoCenterWrap}>
            <Image source={require('../../../Assets/images/logo.png')} style={styles.logoImage} />
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
          <TouchableOpacity onPress={handleForgotPassword} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.forgotText, { color: C.primary }]}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ctaRow}>
          {quickAuthInfo ? (
            <TouchableOpacity
              style={styles.biometricActionBtn}
              onPress={handleOpenQuickAuth}
              activeOpacity={0.8}
            >
              <View style={styles.biometricActionIconWrap}>
                {Platform.OS === 'ios' && quickAuthInfo.biometryType === 'FaceID' ? (
                  <MCIcon name="face-recognition" size={26} color={C.primary} />
                ) : (
                  <Icon name="fingerprint" size={26} color={C.primary} />
                )}
              </View>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={[
              styles.ctaBtn,
              { backgroundColor: C.accent },
              submitting && styles.ctaBtnDisabled,
            ]}
            onPress={handleSignIn}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.ctaText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signUpRow} onPress={() => navigation.navigate('Register')} disabled={submitting}>
          <Text style={styles.signUpText}>New to NRI Circle? <Text style={[styles.signUpLink, { color: C.accent }]}>Create an account</Text></Text>
        </TouchableOpacity>

        <Text style={styles.footer}>© 2026 NRI Circle. All rights reserved.</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Styled Dialog */}
      <Modal
        visible={!!errorDialog}
        transparent
        animationType="fade"
        onRequestClose={() => setErrorDialog(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={[styles.dialogIconWrap, errorDialog?.type === 'info' && { backgroundColor: '#EFF6FF' }]}>
              <Icon
                name={errorDialog?.type === 'info' ? 'check-circle' : 'error-outline'}
                size={34}
                color={errorDialog?.type === 'info' ? '#2563EB' : '#EF4444'}
              />
            </View>
            <Text style={styles.dialogTitle}>{errorDialog?.title}</Text>
            <Text style={styles.dialogMessage}>{errorDialog?.message}</Text>
            <TouchableOpacity
              style={[styles.dialogBtn, { backgroundColor: errorDialog?.type === 'info' ? C.primary : C.accent }]}
              onPress={() => setErrorDialog(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.dialogBtnText}>{errorDialog?.btnText || 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Post-Login Setup Passcode Prompt Modal */}
      <Modal
        visible={showPasscodeSetupPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPasscodeSetupPrompt(false);
          if (pendingLoginResult) navigatePostLogin(pendingLoginResult.user, pendingLoginResult.token);
        }}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.setupPromptCard}>
            <View style={styles.setupPromptIconWrap}>
              <Icon name="fingerprint" size={28} color={C.primary} />
            </View>
            <Text style={styles.setupPromptTitle}>Enable Fast Unlock?</Text>
            <Text style={styles.setupPromptMessage}>
              Use a 4-digit PIN or fingerprint to sign in quickly without typing your password.
            </Text>
            <TouchableOpacity
              style={styles.setupPromptPrimaryBtn}
              onPress={() => {
                setShowPasscodeSetupPrompt(false);
                setShowPasscodeSetupModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.setupPromptPrimaryBtnText}>Set Up Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.setupPromptSkipBtn}
              onPress={() => {
                setShowPasscodeSetupPrompt(false);
                if (pendingLoginResult) navigatePostLogin(pendingLoginResult.user, pendingLoginResult.token);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.setupPromptSkipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Quick Unlock Verification Modal */}
      <PasscodeModal
        visible={showVerifyModal}
        mode="verify"
        userProfile={quickAuthUserProfile}
        onSuccess={handleQuickUnlockSuccess}
        onCancel={() => setShowVerifyModal(false)}
        onFallbackToPassword={() => setShowVerifyModal(false)}
      />

      {/* Passcode Setup Modal */}
      <PasscodeModal
        visible={showPasscodeSetupModal}
        mode="setup"
        onSuccess={async () => {
          setShowPasscodeSetupModal(false);
          await checkQuickAuth();
          if (pendingLoginResult) {
            navigatePostLogin(pendingLoginResult.user, pendingLoginResult.token);
          }
        }}
        onCancel={() => {
          setShowPasscodeSetupModal(false);
          if (pendingLoginResult) {
            navigatePostLogin(pendingLoginResult.user, pendingLoginResult.token);
          }
        }}
      />
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
  
  // Logo Design
  logoCenterWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: 9,
    marginTop: 8,
    elevation: 10,
    shadowColor: C.primaryLight,
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
    height: 60,
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
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 10,
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

  // Glowing CTA Row
  ctaRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 22,
  },
  biometricActionBtn: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    elevation: 4,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  biometricActionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Glowing CTA
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
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

  // Styled Error Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  dialogIconWrap: {
    width: 68,
    height: 68,
    borderRadius: radius.full,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  dialogTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    fontFamily: 'Poppins-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  dialogBtn: {
    width: '100%',
    height: 52,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  dialogBtnText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins-Bold',
    letterSpacing: 0.5,
  },
  setupPromptCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  setupPromptIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#EEF2F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  setupPromptTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 6,
  },
  setupPromptMessage: {
    fontSize: 13,
    fontFamily: 'Poppins-Regular',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  setupPromptPrimaryBtn: {
    width: '100%',
    height: 46,
    borderRadius: 23,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  setupPromptPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  setupPromptSkipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  setupPromptSkipText: {
    color: '#64748B',
    fontSize: 13,
    fontFamily: 'Poppins-Medium',
  },
});

export default Login;
