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
// the persistent per-user record; when there's no local onboarding history at
// all (a pre-existing account signing in on this device for the first time),
// falls back to the user slice's `onboarded` flag.
export function selectOnboardingRoute(state) {
  const user = state.user.user;
  const userId = onboardingUserKey(user);
  if (userId == null) return 'AppHome';

  const record = state.onboarding.completedByUser[userId];
  if (record === undefined) {
    return user?.onboarded === false ? 'OnboardingProfile' : 'AppHome';
  }
  return record ? 'AppHome' : 'OnboardingProfile';
}

export const { markOnboardingComplete, markOnboardingIncomplete } = onboardingSlice.actions;
export default onboardingSlice.reducer;
