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
// `state.user.user` shape (see userSlice.js). Verified live against
// GET /auth/me and PUT /auth/profile — the real shape nests the customer
// profile inside `data.user.customer` (not as a sibling `data.customer`),
// `roles` is an array (not a singular `role` string), and the NRI-specific
// fields are `nri_country`/`nri_city`/`preferred_language`/`timezone` on the
// customer object, while the home state is a separate `{id, name}` object
// (or null) at `data.user.state`, not nested under customer at all.
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
  const customer = apiUser.customer || data?.customer || {};
  const homeState = apiUser.state || null;
  const membership = data?.membership ?? customer.membership_plan ?? customer.membership;
  const relationshipManager = data?.rm ?? customer.rm ?? customer.relationship_manager;
  const roles = Array.isArray(apiUser.roles) ? apiUser.roles : null;

  const user = {
    id: apiUser.id,
    customerId: customer.id ?? null,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone || '',
    role: apiUser.role || (roles?.[0] ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1) : 'Customer'),
    membership: membership || 'None',
    membershipExpiry: customer.membership_expiry || null,
    language: customer.preferred_language || customer.language || 'en',
    timezone: customer.timezone || null,
    countryOfResidence: customer.nri_country || customer.country_of_residence || customer.country || null,
    city: customer.nri_city || customer.city || null,
    homeState: homeState?.name || customer.home_state || customer.state || null,
    homeStateId: homeState?.id ?? null,
    referredByCode: customer.referred_by_code || null,
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

// Also serves as onboarding step 1 (collects NRI country + home state before
// plan checkout). Verified live: the backend only touches keys that are
// actually present in the body (a partial update, not a full overwrite), so
// callers only need to send the fields relevant to whichever form they're
// saving — `|| undefined` on each optional field keeps axios/JSON.stringify
// from sending it at all when unset.
export async function updateProfile({ name, phone, nriCountry, nriCity, preferredLanguage, timezone, stateId }) {
  try {
    const response = await apiClient.put('/auth/profile', {
      name: name || undefined,
      phone: phone || undefined,
      nri_country: nriCountry || undefined,
      nri_city: nriCity || undefined,
      preferred_language: preferredLanguage || undefined,
      timezone: timezone || undefined,
      state_id: stateId || undefined,
    });
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
