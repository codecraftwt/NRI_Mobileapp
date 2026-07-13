import apiClient, { normalizeApiError } from './client';

function mapFamilyMember(raw) {
  return {
    id: raw.id,
    name: raw.name,
    relationship: raw.relationship,
    phone: raw.phone || '',
    address: raw.address || '',
    stateId: raw.state_id ?? null,
    cityId: raw.city_id ?? null,
    stateName: raw.state?.name || null,
    cityName: raw.city?.name || null,
    dateOfBirth: raw.date_of_birth ? raw.date_of_birth.slice(0, 10) : null,
    healthNotes: raw.health_notes || '',
    emergencyContact: raw.emergency_contact || '',
    isActive: raw.is_active !== false,
  };
}

function toPayload({ name, relationship, phone, address, stateId, cityId, dateOfBirth, healthNotes, emergencyContact }) {
  return {
    name,
    relationship,
    phone: phone || undefined,
    address: address || undefined,
    state_id: stateId || undefined,
    city_id: cityId || undefined,
    date_of_birth: dateOfBirth || undefined,
    health_notes: healthNotes || undefined,
    emergency_contact: emergencyContact || undefined,
  };
}

export async function getFamilyMembers() {
  try {
    const response = await apiClient.get('/customer/family-members');
    const list = response.data?.data || response.data || [];
    return list.map(mapFamilyMember);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getFamilyMember(id) {
  try {
    const response = await apiClient.get(`/customer/family-members/${id}`);
    return mapFamilyMember(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function createFamilyMember(data) {
  try {
    const response = await apiClient.post('/customer/family-members', toPayload(data));
    return mapFamilyMember(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function updateFamilyMember(id, data) {
  try {
    const response = await apiClient.put(`/customer/family-members/${id}`, toPayload(data));
    return mapFamilyMember(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function deleteFamilyMember(id) {
  try {
    await apiClient.delete(`/customer/family-members/${id}`);
    return id;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
