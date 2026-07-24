import apiClient, { normalizeApiError, API_BASE_URL } from './client';

// Server origin (strip the trailing /api/v1) — used to turn a relative photo
// path from the backend (e.g. "storage/profile-photos/x.jpg") into an absolute
// URL that <Image> can actually load.
const API_ORIGIN = String(API_BASE_URL || '').replace(/\/api\/v1\/?$/, '');

function toAbsolutePhotoUrl(url) {
  if (!url || typeof url !== 'string') return null;
  if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
  return `${API_ORIGIN}/${url.replace(/^\/+/, '')}`;
}

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
  // `customer.membership` (or `data.membership`) is NOT a plan-name string —
  // for an account with an active membership it's a nested object shaped
  // like {id, plan:{id,name,slug}, status, starts_at, expires_at, auto_renew,
  // renewal_due} (verified live for the equivalent GET /customer/dashboard
  // field). Assigning that object straight to `user.membership` crashed
  // every screen that renders it as text ("Objects are not valid as a React
  // child") — so pull out just the plan name/expiry here instead.
  const membershipRaw = data?.membership ?? customer.membership_plan ?? customer.membership;
  const membershipName = membershipRaw && typeof membershipRaw === 'object'
    ? membershipRaw.plan?.name || membershipRaw.name || null
    : membershipRaw || null;
  const membershipExpiry = (membershipRaw && typeof membershipRaw === 'object' ? membershipRaw.expires_at : null) || customer.membership_expiry || null;
  const relationshipManager = data?.rm ?? customer.rm ?? customer.relationship_manager;
  const roles = Array.isArray(apiUser.roles) ? apiUser.roles : null;

  const user = {
    id: apiUser.id,
    customerId: customer.id ?? null,
    name: apiUser.name,
    email: apiUser.email,
    phone: apiUser.phone || '',
    // Persist the saved profile photo across sessions — the upload sets this in
    // Redux, but on re-login the user is rebuilt from here, so it must be read
    // back from the auth payload (checked on both the user and customer object).
    avatarUri: extractPhotoUrl(apiUser) || extractPhotoUrl(customer) || null,
    role: apiUser.role || (roles?.[0] ? roles[0].charAt(0).toUpperCase() + roles[0].slice(1) : 'Customer'),
    membership: membershipName || 'None',
    membershipExpiry,
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
    if (__DEV__) console.log('[auth/login] user payload:', JSON.stringify(response.data?.data?.user || response.data?.user));
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
    const payload = response.data?.data || response.data;
    const mapped = mapAuthResponse(payload);
    return mapped;
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

// Response schema isn't in the backend's OpenAPI spec (description-only, no
// `content`), so this stays tolerant of a few plausible shapes for where the
// updated photo URL comes back — either nested under `user`/`customer` like
// the rest of the auth payloads, or as a flat top-level field.
function extractPhotoUrl(data) {
  if (!data) return null;
  // Check the object itself FIRST, then any nested user/customer. The old code
  // unwrapped `data.user || data.customer || data`, which — when passed a user
  // object that has a nested `customer` — descended into customer and missed a
  // user-level `profile_photo`, leaving the avatar null even though /auth/me
  // returned a valid URL.
  const candidates = [data, data.user, data.customer].filter(Boolean);
  for (const obj of candidates) {
    const raw = obj.photo_url || obj.avatar_url || obj.photo || obj.avatar
      || obj.profile_photo_url || obj.profile_photo || obj.image_url || obj.image;
    if (raw) return toAbsolutePhotoUrl(raw);
  }
  return null;
}

// Verified live via the backend's OpenAPI spec (GET /docs?api-docs.json):
// POST /auth/profile/photo, multipart field `photo` (binary, required).
export async function uploadProfilePhoto(file) {
  try {
    const formData = new FormData();
    const filePart = { uri: file.uri, name: file.name || 'photo.jpg', type: file.type || 'image/jpeg' };
    // The stored field is `profile_photo` (see GET /auth/me); include both keys
    // so whichever the endpoint expects receives the file.
    formData.append('profile_photo', filePart);
    formData.append('photo', filePart);
    const response = await apiClient.post('/auth/profile/photo', formData, {
      // Do NOT hard-set 'multipart/form-data' — that omits the boundary and the
      // server can't parse the upload. Stripping it lets RN set the boundary.
      transformRequest: (data, headers) => {
        if (headers) { delete headers['Content-Type']; delete headers['content-type']; }
        return data;
      },
    });
    if (__DEV__) console.log('[auth/profile/photo] response:', JSON.stringify(response.data));
    const data = response.data?.data || response.data || {};
    return { photoUrl: extractPhotoUrl(data), message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Verified live: DELETE /auth/profile/photo, no body.
export async function removeProfilePhoto() {
  try {
    const response = await apiClient.delete('/auth/profile/photo');
    return { message: response.data?.message };
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

// Sends (or resends) the 4-digit email-verification OTP to the signed-in
// user's own email — 429s with `retry_after` seconds if called again inside
// the 60-second resend throttle window.
export async function sendEmailOtp() {
  try {
    const response = await apiClient.post('/auth/otp/send');
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function verifyEmailOtp({ otp }) {
  try {
    const response = await apiClient.post('/auth/otp/verify', { otp });
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
