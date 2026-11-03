import { NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256, generateSalt } from '../Utils/securityHash';

// Dynamic import so it never crashes if running on an environment where native module isn't linked
let ReactNativeBiometrics = null;
try {
  const BiometricsPkg = require('react-native-biometrics');
  ReactNativeBiometrics = BiometricsPkg.default || BiometricsPkg;
} catch (e) {
  console.log('[SecurityService] Biometrics native module not available:', e?.message);
}

const STORAGE_KEYS = {
  PASSCODE_DATA: '@nri_security_passcode_data',
  BIOMETRICS_ENABLED: '@nri_security_biometrics_enabled',
  FAILED_ATTEMPTS: '@nri_security_failed_attempts',
  LOCKOUT_UNTIL: '@nri_security_lockout_until',
  QUICK_AUTH_PROFILE: '@nri_security_quick_auth_profile',
  AUTO_LOCK_ENABLED: '@nri_security_auto_lock_enabled',
  AUTO_LOCK_TIMEOUT_MINUTES: '@nri_security_auto_lock_timeout_minutes',
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds

class SecurityService {
  constructor() {
    this.biometricsInstance = ReactNativeBiometrics ? new ReactNativeBiometrics() : null;
  }

  /**
   * Check if the device hardware supports biometrics (Fingerprint, Face ID, etc.)
   * @returns {Promise<{ available: boolean, biometryType: string | null, reason?: string, message?: string }>}
   */
  async checkBiometricsAvailable() {
    const bridge = NativeModules?.ReactNativeBiometrics;
    if (!bridge) {
      console.log('[SecurityService] NativeModules.ReactNativeBiometrics is missing. App rebuild required (npm run android).');
      return {
        available: false,
        biometryType: null,
        reason: 'NATIVE_MODULE_NOT_LINKED',
        message: 'Rebuild required: run "npm run android" to compile the new biometric library.',
      };
    }

    if (!this.biometricsInstance) {
      return {
        available: false,
        biometryType: null,
        reason: 'NOT_INITIALIZED',
        message: 'Biometrics module failed to initialize.',
      };
    }

    try {
      const result = await this.biometricsInstance.isSensorAvailable();
      if (!result.available) {
        if (result.error === 'BIOMETRIC_ERROR_NONE_ENROLLED') {
          return {
            available: false,
            biometryType: result.biometryType || 'Fingerprint',
            reason: 'NONE_ENROLLED',
            message: 'Sensor detected, but no fingerprint is registered in your phone settings.',
          };
        }
        if (result.error === 'BIOMETRIC_ERROR_NO_HARDWARE') {
          return {
            available: false,
            biometryType: null,
            reason: 'NO_HARDWARE',
            message: 'No fingerprint/biometric sensor found on this device.',
          };
        }
        return {
          available: false,
          biometryType: result.biometryType || null,
          reason: result.error || 'UNAVAILABLE',
          message: result.error || 'Biometric hardware is currently unavailable.',
        };
      }

      return {
        available: true,
        biometryType: result.biometryType || 'Biometrics',
        reason: null,
        message: null,
      };
    } catch (err) {
      console.log('[SecurityService] checkBiometricsAvailable error:', err);
      return {
        available: false,
        biometryType: null,
        reason: 'ERROR',
        message: err?.message || 'Error detecting biometric hardware.',
      };
    }
  }

  /**
   * Trigger the native fingerprint / Face ID prompt
   * @param {string} promptMessage
   * @returns {Promise<{ success: boolean, error?: string }>}
   */
  async promptBiometrics(promptMessage = 'Authenticate using your fingerprint or biometric sensor') {
    if (!this.biometricsInstance) {
      return { success: false, error: 'Biometrics hardware not available on this device' };
    }
    try {
      const { success } = await this.biometricsInstance.simplePrompt({
        promptMessage,
        cancelButtonText: 'Use Passcode',
      });
      return { success: !!success };
    } catch (err) {
      // User cancelled or biometric failed
      return { success: false, error: err?.message || 'Biometric authentication cancelled' };
    }
  }

  /**
   * Check if user has enabled biometrics in app settings
   */
  async isBiometricsEnabled() {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.BIOMETRICS_ENABLED);
      if (val === 'false') return false;
      if (val === 'true') return true;
      // If not explicitly set, default to enabled if hardware is available
      const bio = await this.checkBiometricsAvailable();
      return !!bio.available;
    } catch (e) {
      return false;
    }
  }

  /**
   * Toggle user's biometric setting
   */
  async setBiometricsEnabled(enabled) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.BIOMETRICS_ENABLED, enabled ? 'true' : 'false');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Check if user has a 4-digit passcode configured (optionally matching a specific user ID or email)
   */
  async isPasscodeSet(forUserId = null) {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PASSCODE_DATA);
      if (!data) return false;
      if (!forUserId) return true;
      const parsed = JSON.parse(data);
      if (!parsed?.ownerId) return true;
      return String(parsed.ownerId).toLowerCase() === String(forUserId).toLowerCase();
    } catch (e) {
      return false;
    }
  }

  /**
   * Save a new 4-digit passcode with salt & SHA-256 hash (optionally bound to ownerUserId)
   */
  async savePasscode(passcode, ownerUserId = null) {
    if (typeof passcode !== 'string' || !/^\d{4}$/.test(passcode)) {
      throw new Error('Passcode must be exactly 4 digits');
    }
    try {
      let ownerId = ownerUserId;
      if (!ownerId) {
        const session = await this.getQuickAuthSession();
        ownerId = session?.user?._id || session?.user?.id || session?.email || null;
      }
      const salt = generateSalt(16);
      const hash = sha256(`${salt}:${passcode}`);
      const payload = JSON.stringify({ salt, hash, ownerId, createdAt: Date.now() });

      await AsyncStorage.setItem(STORAGE_KEYS.PASSCODE_DATA, payload);
      await AsyncStorage.multiRemove([STORAGE_KEYS.FAILED_ATTEMPTS, STORAGE_KEYS.LOCKOUT_UNTIL]);
      return true;
    } catch (err) {
      console.log('[SecurityService] savePasscode error:', err);
      throw err;
    }
  }

  /**
   * Verify a 4-digit passcode against the stored hash
   * @returns {Promise<{ success: boolean, locked?: boolean, remainingLockSeconds?: number, remainingAttempts?: number }>}
   */
  async verifyPasscode(passcode) {
    try {
      // 1. Check lockout status
      const lockoutUntilStr = await AsyncStorage.getItem(STORAGE_KEYS.LOCKOUT_UNTIL);
      if (lockoutUntilStr) {
        const lockoutUntil = parseInt(lockoutUntilStr, 10);
        const now = Date.now();
        if (now < lockoutUntil) {
          const remainingLockSeconds = Math.ceil((lockoutUntil - now) / 1000);
          return {
            success: false,
            locked: true,
            remainingLockSeconds,
          };
        } else {
          // Lockout period expired - clear it
          await AsyncStorage.multiRemove([STORAGE_KEYS.FAILED_ATTEMPTS, STORAGE_KEYS.LOCKOUT_UNTIL]);
        }
      }

      // 2. Fetch stored salt + hash
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.PASSCODE_DATA);
      if (!raw) {
        return { success: false, error: 'No passcode configured' };
      }

      const { salt, hash } = JSON.parse(raw);
      const testHash = sha256(`${salt}:${passcode}`);

      if (testHash === hash) {
        // Success: Reset failed count
        await AsyncStorage.multiRemove([STORAGE_KEYS.FAILED_ATTEMPTS, STORAGE_KEYS.LOCKOUT_UNTIL]);
        return { success: true };
      }

      // Failed match: Increment attempt counter
      const failedStr = (await AsyncStorage.getItem(STORAGE_KEYS.FAILED_ATTEMPTS)) || '0';
      const failedCount = parseInt(failedStr, 10) + 1;

      if (failedCount >= MAX_FAILED_ATTEMPTS) {
        const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
        await AsyncStorage.setItem(STORAGE_KEYS.LOCKOUT_UNTIL, String(lockoutUntil));
        await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, String(failedCount));
        return {
          success: false,
          locked: true,
          remainingLockSeconds: Math.ceil(LOCKOUT_DURATION_MS / 1000),
        };
      } else {
        await AsyncStorage.setItem(STORAGE_KEYS.FAILED_ATTEMPTS, String(failedCount));
        return {
          success: false,
          remainingAttempts: MAX_FAILED_ATTEMPTS - failedCount,
        };
      }
    } catch (err) {
      console.log('[SecurityService] verifyPasscode error:', err);
      return { success: false, error: 'Verification failed' };
    }
  }

  /**
   * Remove passcode and reset security credentials
   */
  async removePasscode() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PASSCODE_DATA,
        STORAGE_KEYS.BIOMETRICS_ENABLED,
        STORAGE_KEYS.FAILED_ATTEMPTS,
        STORAGE_KEYS.LOCKOUT_UNTIL,
        STORAGE_KEYS.QUICK_AUTH_PROFILE,
      ]);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Completely reset all security credentials on account switch or logout
   */
  async resetAllSecurityCredentials() {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.PASSCODE_DATA,
        STORAGE_KEYS.BIOMETRICS_ENABLED,
        STORAGE_KEYS.AUTO_LOCK_ENABLED,
        STORAGE_KEYS.FAILED_ATTEMPTS,
        STORAGE_KEYS.LOCKOUT_UNTIL,
        STORAGE_KEYS.QUICK_AUTH_PROFILE,
      ]);
      return true;
    } catch (e) {
      console.log('[SecurityService] resetAllSecurityCredentials error:', e);
      return false;
    }
  }

  /**
   * Save quick-authentication session for fast fingerprint/passcode unlock
   */
  async saveQuickAuthSession(profile) {
    if (!profile) return;
    try {
      const existing = await this.getQuickAuthSession();
      const merged = { ...(existing || {}), ...profile };
      Object.keys(merged).forEach((k) => {
        if (merged[k] === undefined) delete merged[k];
      });
      await AsyncStorage.setItem(STORAGE_KEYS.QUICK_AUTH_PROFILE, JSON.stringify(merged));
    } catch (e) {
      console.log('[SecurityService] saveQuickAuthSession error:', e);
    }
  }

  /**
   * Get the saved quick-authentication profile
   */
  async getQuickAuthSession() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.QUICK_AUTH_PROFILE);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clear quick auth session profile (e.g. on full sign out)
   */
  async clearQuickAuthSession() {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.QUICK_AUTH_PROFILE);
    } catch (e) {
      // ignore
    }
  }

  /**
   * Check if auto-lock is enabled
   */
  async isAutoLockEnabled() {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOCK_ENABLED);
      // Default to enabled (true)
      return val !== 'false';
    } catch (e) {
      return true;
    }
  }

  /**
   * Toggle auto-lock
   */
  async setAutoLockEnabled(enabled) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOCK_ENABLED, enabled ? 'true' : 'false');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get auto-lock inactivity timeout in minutes (default: 5)
   */
  async getAutoLockTimeoutMinutes() {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEYS.AUTO_LOCK_TIMEOUT_MINUTES);
      const parsed = parseInt(val, 10);
      return !isNaN(parsed) && parsed > 0 ? parsed : 5;
    } catch (e) {
      return 5;
    }
  }

  /**
   * Set auto-lock inactivity timeout in minutes
   */
  async setAutoLockTimeoutMinutes(minutes) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTO_LOCK_TIMEOUT_MINUTES, String(minutes));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Set or get in-memory justLoggedIn flag
   * Prevents instant auto-lock right when a user has just typed their credentials on Login screen
   */
  setJustLoggedIn(value) {
    this._justLoggedIn = Boolean(value);
    if (this._justLoggedIn) {
      if (this._justLoggedInTimer) clearTimeout(this._justLoggedInTimer);
      this._justLoggedInTimer = setTimeout(() => {
        this._justLoggedIn = false;
      }, 45000); // 45 seconds window to complete initial navigation
    }
  }

  isJustLoggedIn() {
    return Boolean(this._justLoggedIn);
  }
}

export const securityService = new SecurityService();
export default securityService;
