import apiClient, { normalizeApiError } from './client';

function mapAttachment(raw) {
  return {
    id: raw.id,
    type: raw.type,
    label: raw.label || '',
    url: raw.url,
    createdAt: raw.created_at,
  };
}

function mapUtilityAccount(raw) {
  return { type: raw.type, account: raw.account };
}

function mapProperty(raw) {
  return {
    id: raw.id,
    nickname: raw.nickname,
    type: raw.type,
    address: raw.address,
    stateId: raw.state?.id ?? null,
    cityId: raw.city?.id ?? null,
    stateName: raw.state?.name || null,
    cityName: raw.city?.name || null,
    pincode: raw.pincode || '',
    areaSqft: raw.area_sqft ?? null,
    numBedrooms: raw.num_bedrooms ?? null,
    tenantName: raw.tenant_name || '',
    tenantPhone: raw.tenant_phone || '',
    utilityAccounts: (raw.utility_accounts || []).map(mapUtilityAccount),
    notes: raw.notes || '',
    attachments: (raw.attachments || []).map(mapAttachment),
    tickets: raw.tickets || [],
  };
}

function toPayload({ nickname, type, address, stateId, cityId, pincode, areaSqft, numBedrooms, tenantName, tenantPhone, utilityAccounts, notes }) {
  return {
    nickname,
    type,
    address,
    state_id: stateId || undefined,
    city_id: cityId || undefined,
    pincode: pincode || undefined,
    area_sqft: areaSqft || undefined,
    num_bedrooms: numBedrooms || undefined,
    tenant_name: tenantName || undefined,
    tenant_phone: tenantPhone || undefined,
    utility_accounts: utilityAccounts && utilityAccounts.length > 0 ? utilityAccounts : undefined,
    notes: notes || undefined,
  };
}

export async function getProperties() {
  try {
    const response = await apiClient.get('/customer/properties');
    const list = response.data?.data || response.data || [];
    return list.map(mapProperty);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getProperty(id) {
  try {
    const response = await apiClient.get(`/customer/properties/${id}`);
    return mapProperty(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function createProperty(data) {
  try {
    const response = await apiClient.post('/customer/properties', toPayload(data));
    return mapProperty(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function updateProperty(id, data) {
  try {
    const response = await apiClient.put(`/customer/properties/${id}`, toPayload(data));
    return mapProperty(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function deleteProperty(id) {
  try {
    await apiClient.delete(`/customer/properties/${id}`);
    return id;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function uploadAttachment(propertyId, { type, label, file }) {
  try {
    const formData = new FormData();
    formData.append('type', type);
    if (label) formData.append('label', label);
    formData.append('file', file);
    const response = await apiClient.post(`/customer/properties/${propertyId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return mapAttachment(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function deleteAttachment(propertyId, attachmentId) {
  try {
    await apiClient.delete(`/customer/properties/${propertyId}/attachments/${attachmentId}`);
    return attachmentId;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
