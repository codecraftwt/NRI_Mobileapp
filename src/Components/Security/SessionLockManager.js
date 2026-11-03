import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import securityService from '../../Services/securityService';
import PasscodeModal from './PasscodeModal';
import { logoutUser } from '../../Redux/slices/userSlice';
import { navigationRef } from '../../Navigations/navigationRef';

const EXCLUDED_ROUTES = [
  'Splash',
  'Onboarding',
  'Login',
  'Register',
  'ForgotPassword',
  'ResetVerifyOtp',
  'ResetPassword',
  'VerifyEmail',
  'OnboardingProfile',
  'OnboardingPayment',
  'OnboardingWelcome',
  'OnboardingWelcome',
];

export default function SessionLockManager({ children }) {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(state => state.user.isAuthenticated);
  const user = useSelector(state => state.user.user);

  const [isLocked, setIsLocked] = useState(false);
  const [hasSecuritySetup, setHasSecuritySetup] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(true);

  const isLockedRef = useRef(false);
  const initialColdStartDoneRef = useRef(false);
  const lastUnlockedAtRef = useRef(0);

  // Sync isLockedRef with state
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // Check if device has passcode or biometrics configured
  const checkSecurityConfig = useCallback(async () => {
    if (!isAuthenticated) {
      setHasSecuritySetup(false);
      setIsLocked(false);
      return;
    }
    try {
      const hasPasscode = await securityService.isPasscodeSet();
      const bio = await securityService.checkBiometricsAvailable();
      const bioEnabled = await securityService.isBiometricsEnabled();
      const lockEnabled = await securityService.isAutoLockEnabled();

      const hasSec = hasPasscode || (bio.available && bioEnabled);
      setHasSecuritySetup(hasSec);
      setAppLockEnabled(lockEnabled);
    } catch (e) {
      console.log('[SessionLockManager] checkSecurityConfig error:', e);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    checkSecurityConfig();
  }, [checkSecurityConfig]);

  // Lock session helper
  const triggerLock = useCallback(() => {
    if (!isAuthenticated || !hasSecuritySetup || !appLockEnabled || isLockedRef.current) {
      return;
    }
    // Prevent immediate re-locking right after successful unlock (5-second grace window)
    if (Date.now() - lastUnlockedAtRef.current < 5000) {
      return;
    }
    // Never lock if on public auth screens
    if (navigationRef.isReady()) {
      const currentRoute = navigationRef.getCurrentRoute()?.name;
      if (currentRoute && EXCLUDED_ROUTES.includes(currentRoute)) {
        return;
      }
    }
    isLockedRef.current = true;
    setIsLocked(true);
  }, [isAuthenticated, hasSecuritySetup, appLockEnabled]);

  // Handle successful unlock
  const handleUnlockSuccess = useCallback(() => {
    isLockedRef.current = false;
    setIsLocked(false);
    lastUnlockedAtRef.current = Date.now();
  }, []);

  // Handle fallback or logout from lock screen
  const handleFallbackLogout = useCallback(() => {
    isLockedRef.current = false;
    setIsLocked(false);
    dispatch(logoutUser());
    if (navigationRef.isReady()) {
      navigationRef.reset({ index: 0, routes: [{ name: 'Login' }] });
    }
  }, [dispatch]);

  // Cold-start lock (Google Pay behavior):
  // Triggers ONLY when app was completely closed/cleared and opened fresh.
  // Minimizing and switching apps remains unlocked and opens directly.

  // 2. Cold-start check (When app was cleared / killed and opened fresh, like GPay)
  useEffect(() => {
    if (!isAuthenticated || !hasSecuritySetup || !appLockEnabled) return;
    if (initialColdStartDoneRef.current) return;

    let timer = null;
    let unsub = null;

    const evaluateColdStartLock = () => {
      if (initialColdStartDoneRef.current) return;
      if (!navigationRef.isReady()) return;

      const currentRoute = navigationRef.getCurrentRoute()?.name;
      if (!currentRoute) return;

      // Do not lock while on splash or auth/onboarding screens
      if (EXCLUDED_ROUTES.includes(currentRoute)) return;

      initialColdStartDoneRef.current = true;
      if (timer) clearInterval(timer);
      if (typeof unsub === 'function') {
        unsub();
        unsub = null;
      }

      if (!securityService.isJustLoggedIn()) {
        triggerLock();
      }
    };

    timer = setInterval(evaluateColdStartLock, 200);
    unsub = navigationRef.addListener?.('state', evaluateColdStartLock);

    return () => {
      if (timer) clearInterval(timer);
      if (typeof unsub === 'function') unsub();
    };
  }, [isAuthenticated, hasSecuritySetup, appLockEnabled, triggerLock]);

  return (
    <View style={styles.container}>
      {children}

      {/* GPay Style Security Overlay */}
      {isLocked ? (
        <PasscodeModal
          visible={isLocked}
          mode="verify"
          title="App Locked"
          subtitle={user?.name ? `Welcome back, ${user.name}` : 'Verify your identity to resume'}
          userProfile={{ name: user?.name, email: user?.email }}
          onSuccess={handleUnlockSuccess}
          onCancel={handleFallbackLogout}
          onFallbackToPassword={handleFallbackLogout}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
