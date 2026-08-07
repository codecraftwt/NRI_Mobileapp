import apiClient, { normalizeApiError } from '../client';

// RM self-service profile: contact info, assigned territory (state/city) and
// book stats (assigned customers / active memberships).
function mapRmProfile(raw = {}) {
  const region = raw.region || {};
  const stats = raw.stats || {};
  return {
    id: raw.id,
    name: raw.name || '',
    email: raw.email || '',
    phone: raw.phone || '',
    whatsapp: raw.whatsapp_number || '',
    photo: raw.profile_photo || null,
    role: raw.role || 'rm',
    state: region.state ? { id: region.state.id, name: region.state.name } : null,
    city: region.city ? { id: region.city.id, name: region.city.name } : null,
    stats: {
      assignedCustomers: Number(stats.assigned_customers || 0),
      activeMemberships: Number(stats.active_memberships || 0),
    },
  };
}

// GET /rm/profile — my RM profile. 403 if the account isn't an RM.
export async function getRmProfile() {
  try {
    const response = await apiClient.get('/rm/profile');
    const data = response.data?.data || response.data || {};
    return mapRmProfile(data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// PUT /rm/profile — update name / phone / whatsapp / assigned territory.
// Only sends the keys provided; returns the refreshed profile.
export async function updateRmProfile({ name, phone, whatsapp, stateId, cityId } = {}) {
  try {
    const body = {};
    if (name != null) body.name = name;
    if (phone != null) body.phone = phone;
    if (whatsapp != null) body.whatsapp_number = whatsapp;
    if (stateId != null) body.state_id = stateId;
    if (cityId != null) body.city_id = cityId;
    const response = await apiClient.put('/rm/profile', body);
    const data = response.data?.data || response.data || {};
    return mapRmProfile(data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
