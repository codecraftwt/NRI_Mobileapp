import apiClient, { normalizeApiError } from './client';

function toRegisterRequestBody({ name, email, phone, password, passwordConfirmation, referralCode, affiliateCode, deviceName }) {
  return {
    name,
    email,
    phone,
    password,
    password_confirmation: passwordConfirmation,
    referral_code: referralCode || undefined,
    affiliate_code: affiliateCode || undefined,
    device_name: deviceName,
  };
}

function toLoginRequestBody({ login: loginId, password, deviceName }) {
  return {
    login: loginId,
    password,
    device_name: deviceName,
  };
}

function initialsFor(name) {
  return (name || 'RM').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
}

// Maps the API's auth-payload response into this app's canonical
// `state.user.user` shape (see userSlice.js). Handles two response shapes
// interchangeably: { token, user, customer } (register/login) and
// { user, customer, membership, rm } (auth/me — membership & RM contact may
// arrive as siblings of `customer` rather than nested inside it).
//
// `onboarded` is deliberately OMITTED from the returned user object unless we
// know it for certain:
//   - `onboardedOverride` forces a value regardless of what the backend says
//     (registration always starts unonboarded, no matter what `customer` has).
//   - `customer.onboarded`, if the backend ever starts returning it explicitly.
// None of register/login/me currently promise an `onboarded` field, so most
// of the time this key is left out entirely. That's intentional: onboarding
// completion (finishing the profile/plan/add-ons/payment wizard) is tracked
// purely client-side via `setOnboarded`. If we defaulted a guessed value here,
// every `/auth/me` refresh (e.g. on app restart, mid-wizard) would clobber the
// correct locally-tracked "not yet onboarded" state with a wrong guess —
// which is exactly the bug where refreshing mid-signup jumped straight to the
// Dashboard. The reducers in userSlice.js decide what to do when this key is
// absent, since only they know the existing local value.
function mapAuthResponse(data, { onboardedOverride } = {}) {
  const apiUser = data?.user || {};
  const customer = data?.customer || {};
  const membership = data?.membership ?? customer.membership_plan ?? customer.membership;
  const relationshipManager = data?.rm ?? customer.relationship_manager;

  const user = {
    id: apiUser.id,
    customerId: customer.id ?? null,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone || '',
    role: apiUser.role || 'Customer',
    membership: membership || 'None',
    membershipExpiry: customer.membership_expiry || null,
    language: customer.language || 'English',
    countryOfResidence: customer.country_of_residence || customer.country || null,
    city: customer.city || null,
    homeState: customer.home_state || customer.state || null,
    referredByCode: customer.referred_by_code || customer.referral_code || null,
    rm: relationshipManager
      ? {
          name: relationshipManager.name,
          email: relationshipManager.email,
          phone: relationshipManager.phone,
          avatar: initialsFor(relationshipManager.name),
        }
      : null,
  };

  if (onboardedOverride !== undefined) {
    user.onboarded = onboardedOverride;
  } else if (typeof customer.onboarded === 'boolean') {
    user.onboarded = customer.onboarded;
  }

  return { token: data?.token, user };
}

export async function register(payload) {
  try {
    const response = await apiClient.post('/auth/register', toRegisterRequestBody(payload));
    return mapAuthResponse(response.data?.data || response.data, { onboardedOverride: false });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function login(payload) {
  try {
    const response = await apiClient.post('/auth/login', toLoginRequestBody(payload));
    return mapAuthResponse(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function logout() {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function me() {
  try {
    const response = await apiClient.get('/auth/me');
    return mapAuthResponse(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function changePassword({ currentPassword, password, passwordConfirmation }) {
  try {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      password,
      password_confirmation: passwordConfirmation,
    });
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function forgotPassword({ email }) {
  try {
    await apiClient.post('/auth/forgot-password', { email });
  } catch (error) {
    throw normalizeApiError(error);
  }
}
