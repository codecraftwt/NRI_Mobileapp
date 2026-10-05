import apiClient, { normalizeApiError } from '../client';

export async function getTelecallerCustomers(params = {}) {
  try {
    const response = await apiClient.get('/telecaller/customers', { params });
    const data = response.data?.data || response.data || [];
    const list = Array.isArray(data) ? data : (data.customers || data.data || []);
    return list.map(c => ({
      id: c.id,
      name: c.name || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Customer',
      email: c.email || null,
      phone: c.phone || c.mobile || null,
      city: c.city || c.city_name || null,
      state: c.state || c.state_name || null,
      raw: c,
    }));
  } catch (error) {
    throw normalizeApiError(error);
  }
}
