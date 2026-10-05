import { createSlice } from '@reduxjs/toolkit';
import { registerUser } from './userSlice';

// Cross-session onboarding progress, keyed by user id (email fallback). Unlike
// `user.onboarded` (which lives on the user slice and is wiped on logout), this
// slice is PRESERVED across the auth-identity store reset in store.js, so a user
// who signs out mid-onboarding resumes the wizard on their next sign-in instead
// of being dropped onto the dashboard.
const initialState = {
  completedByUser: {}, // { [userId]: boolean }
  stepByUser: {}, // { [userId]: 'OnboardingProfile' | 'OnboardingPayment' }
  draftProfileByUser: {}, // { [userId]: object }
  paymentSubStepByUser: {}, // { [userId]: 'details' | 'summary' }
  cartReqFormByUser: {}, // { [userId]: object }
  // Set when a guest taps "Request a Quote" (Services.js) before signing in —
  // survives the auth-identity store reset (this slice is exempt, see
  // store.js) so OnboardingPayment.js can still see it after
  // registerUser.fulfilled wipes everything else, and use it to auto-request
  // a custom-plan quote (POST /customer/custom-plans) once the wizard reaches
  // the payment step, bundling the fee into membership checkout.
  pendingCustomPlanRequest: false,
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
      if (userId != null) {
        if (!state.completedByUser) state.completedByUser = {};
        state.completedByUser[userId] = true;
        if (state.stepByUser) delete state.stepByUser[userId];
        if (state.draftProfileByUser) delete state.draftProfileByUser[userId];
        if (state.paymentSubStepByUser) delete state.paymentSubStepByUser[userId];
        if (state.cartReqFormByUser) delete state.cartReqFormByUser[userId];
      }
    },
    markOnboardingIncomplete: (state, action) => {
      const userId = action.payload;
      if (userId != null) {
        if (!state.completedByUser) state.completedByUser = {};
        state.completedByUser[userId] = false;
      }
    },
    setOnboardingStep: (state, action) => {
      const { userId, step } = action.payload || {};
      if (userId != null && step) {
        if (!state.stepByUser) state.stepByUser = {};
        state.stepByUser[userId] = step;
      }
    },
    setDraftProfile: (state, action) => {
      const { userId, profile } = action.payload || {};
      if (userId != null && profile) {
        if (!state.draftProfileByUser) state.draftProfileByUser = {};
        state.draftProfileByUser[userId] = profile;
      }
    },
    setOnboardingPaymentSubStep: (state, action) => {
      const { userId, subStep } = action.payload || {};
      if (userId != null && subStep) {
        if (!state.paymentSubStepByUser) state.paymentSubStepByUser = {};
        state.paymentSubStepByUser[userId] = subStep;
      }
    },
    setCartReqForm: (state, action) => {
      const { userId, reqForm } = action.payload || {};
      if (userId != null && reqForm) {
        if (!state.cartReqFormByUser) state.cartReqFormByUser = {};
        state.cartReqFormByUser[userId] = reqForm;
      }
    },
    clearDraftProfile: (state, action) => {
      const userId = action.payload;
      if (userId != null) {
        if (state.draftProfileByUser) delete state.draftProfileByUser[userId];
        if (state.stepByUser) delete state.stepByUser[userId];
        if (state.paymentSubStepByUser) delete state.paymentSubStepByUser[userId];
        if (state.cartReqFormByUser) delete state.cartReqFormByUser[userId];
      }
    },
    setPendingCustomPlanRequest: (state, action) => {
      state.pendingCustomPlanRequest = !!action.payload;
    },
  },
  extraReducers: (builder) => {
    // A freshly registered account has, by definition, not onboarded yet.
    builder.addCase(registerUser.fulfilled, (state, action) => {
      const userId = onboardingUserKey(action.payload.user);
      if (userId != null) {
        if (!state.completedByUser) state.completedByUser = {};
        if (!state.stepByUser) state.stepByUser = {};
        state.completedByUser[userId] = false;
        state.stepByUser[userId] = 'OnboardingProfile';
        if (state.draftProfileByUser) delete state.draftProfileByUser[userId];
        if (state.paymentSubStepByUser) delete state.paymentSubStepByUser[userId];
        if (state.cartReqFormByUser) delete state.cartReqFormByUser[userId];
      }
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

  const membership = user?.membership;
  const hasMembership = !!membership && membership !== 'None';

  const record = state.onboarding?.completedByUser?.[userId];
  if (record !== undefined) {
    if (record) return 'AppHome';
    // Local record says this device left the wizard mid-flow — but if the
    // server now reports an active membership (e.g. it was activated on
    // another device/session, or a first checkout attempt actually succeeded
    // even though this device's own success screen was never reached), that's
    // definitive proof the wizard already finished. Trust it over the stale
    // local flag instead of sending an already-active member back through
    // registration, where POST /membership/checkout would just reject them
    // for already having one.
    if (hasMembership) return 'AppHome';

    const step = state.onboarding?.stepByUser?.[userId];
    if (step === 'OnboardingPayment') return 'OnboardingPayment';
    return 'OnboardingProfile';
  }

  // No local record. Only trust an explicitly-false `onboarded` flag (the flag
  // is otherwise a client-side guess that defaults to `true`); the definitive
  // server-side signal is an active/purchased membership.
  if (user?.onboarded === false) {
    const step = state.onboarding?.stepByUser?.[userId];
    if (step === 'OnboardingPayment') return 'OnboardingPayment';
    return 'OnboardingProfile';
  }
  if (hasMembership) return 'AppHome';
  
  const step = state.onboarding?.stepByUser?.[userId];
  if (step === 'OnboardingPayment') return 'OnboardingPayment';
  return 'OnboardingProfile';
}

// Root route for an authenticated user, accounting for account role FIRST —
// vendor / relationship-manager / admin accounts get their own app shells,
// everyone else falls through to the customer onboarding/dashboard flow. Keep
// this in sync with the role routing in Login.handleSignIn (both read
// `user.role`). Without the admin branch, reloading the app on an admin
// session fell through to the customer onboarding flow, which calls
// GET /customer/cart — a 403 ("User does not have the right roles") for an
// admin token.
export function selectAuthenticatedRoute(state) {
  const role = String(state.user.user?.role || '').toLowerCase();
  const roles = (state.user.user?.roles || []).map(r => String(r?.name || r || '').toLowerCase());
  // State/District/Taluka-Admin all share the StateAdminHome shell — must
  // come before the generic /admin/ check below (see Login.handleSignIn).
  if (/(state|district|taluka)[-_ ]?admin/i.test(role) || roles.some(r => /(state|district|taluka)[-_ ]?admin/i.test(r))) return 'StateAdminHome';
  if (/vendor/i.test(role) || roles.some(r => /vendor/i.test(r))) return 'VendorHome';
  if (/relationship|manager|\brm\b/i.test(role) || roles.some(r => /relationship|manager|\brm\b/i.test(r))) return 'RMHome';
  if (/telecaller/i.test(role) || roles.some(r => /telecaller/i.test(r))) return 'TelecallerHome';
  if (/admin/i.test(role) || roles.some(r => /admin/i.test(r))) return 'AdminHome';
  return selectOnboardingRoute(state);
}

export const {
  markOnboardingComplete,
  markOnboardingIncomplete,
  setOnboardingStep,
  setDraftProfile,
  setOnboardingPaymentSubStep,
  setCartReqForm,
  clearDraftProfile,
  setPendingCustomPlanRequest,
} = onboardingSlice.actions;
export default onboardingSlice.reducer;
