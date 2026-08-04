import { createSlice } from '@reduxjs/toolkit';
import { registerUser } from './userSlice';

// Cross-session onboarding progress, keyed by user id (email fallback). Unlike
// `user.onboarded` (which lives on the user slice and is wiped on logout), this
// slice is PRESERVED across the auth-identity store reset in store.js, so a user
// who signs out mid-onboarding resumes the wizard on their next sign-in instead
// of being dropped onto the dashboard.
const initialState = {
  completedByUser: {}, // { [userId]: boolean }
};

// Stable key for a user across register/login (id preferred, email fallback).
export function onboardingUserKey(user) {
  return user?.id ?? user?.email ?? null;
}

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState,
  reducers: {
    markOnboardingComplete: (state, action) => {
      const userId = action.payload;
      if (userId != null) state.completedByUser[userId] = true;
    },
    markOnboardingIncomplete: (state, action) => {
      const userId = action.payload;
      if (userId != null) state.completedByUser[userId] = false;
    },
  },
  extraReducers: (builder) => {
    // A freshly registered account has, by definition, not onboarded yet.
    builder.addCase(registerUser.fulfilled, (state, action) => {
      const userId = onboardingUserKey(action.payload.user);
      if (userId != null) state.completedByUser[userId] = false;
    });
  },
});

// Route to send an authenticated user to after login/splash resolves. Prefers
// the persistent per-user record (written when registration/completion happened
// on THIS device). When there's no local history — an account registered on
// another device or the web — it falls back to server-derived state instead of
// guessing: the onboarding wizard always ends with a membership purchase, so a
// user with no membership was left mid-flow and must resume the wizard rather
// than being dropped onto the dashboard.
export function selectOnboardingRoute(state) {
  const user = state.user.user;
  const userId = onboardingUserKey(user);
  if (userId == null) return 'AppHome';

  // Email must be verified before onboarding can proceed (the backend marks it
  // on POST /auth/otp/verify). When the payload says the account is unverified,
  // route to VerifyEmail — its OTP send/verify calls are token-authenticated,
  // so they work on the logged-in user's own email. Once verified it replaces
  // itself with the wizard step below.
  if (user?.emailVerified === false) return 'VerifyEmail';

  const record = state.onboarding.completedByUser[userId];
  if (record !== undefined) return record ? 'AppHome' : 'OnboardingProfile';

  // No local record. Only trust an explicitly-false `onboarded` flag (the flag
  // is otherwise a client-side guess that defaults to `true`); the definitive
  // server-side signal is an active/purchased membership.
  if (user?.onboarded === false) return 'OnboardingProfile';
  const membership = user?.membership;
  return membership && membership !== 'None' ? 'AppHome' : 'OnboardingProfile';
}

// Root route for an authenticated user, accounting for account role FIRST —
// vendor / relationship-manager accounts get their own app shells, everyone
// else falls through to the customer onboarding/dashboard flow. Keep this in
// sync with the role routing in Login.handleSignIn (both read `user.role`).
export function selectAuthenticatedRoute(state) {
  const role = String(state.user.user?.role || '').toLowerCase();
  if (/vendor/.test(role)) return 'VendorHome';
  if (/relationship|manager|\brm\b/.test(role)) return 'RMHome';
  return selectOnboardingRoute(state);
}

export const { markOnboardingComplete, markOnboardingIncomplete } = onboardingSlice.actions;
export default onboardingSlice.reducer;
