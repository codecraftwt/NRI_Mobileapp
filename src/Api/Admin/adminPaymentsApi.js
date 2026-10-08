import apiClient, { normalizeApiError } from '../client';
import { mapAdminPayment, mapAdminPaymentsMeta } from '../adminPaymentShared';

// GET /super-admin/payments — super-admin only. `q` matches customer name,
// receipt number or gateway reference. An invalid `status`/`gateway` value
// 422s — normalizeApiError already surfaces the backend's message as-is.
// Page size is fixed server-side at 25.
export async function getSuperAdminPayments({ q, customerId, status, gateway, from, to, page } = {}) {
  try {
    const params = {};
    if (q) params.q = q;
    if (customerId) params.customer_id = customerId;
    if (status) params.status = status;
    if (gateway) params.gateway = gateway;
    if (from) params.from = from;
    if (to) params.to = to;
    if (page) params.page = page;
    const response = await apiClient.get('/super-admin/payments', { params });
    const list = response.data?.data || [];
    return { payments: list.map(mapAdminPayment), meta: mapAdminPaymentsMeta(response, list.length) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
