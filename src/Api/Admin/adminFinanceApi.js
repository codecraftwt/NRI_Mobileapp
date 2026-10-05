import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

export function mapAdminFinance(raw = {}) {
  const type = raw.received_by_type || {};
  return {
    currency: raw.currency || 'INR',
    moneyReceived: num(raw.money_received),
    grossReceived: num(raw.gross_received),
    refunded: num(raw.refunded),
    gstIncluded: num(raw.gst_included),
    vendorCost: num(raw.vendor_cost),
    afterVendorCost: num(raw.after_vendor_cost),
    awaitingPayment: num(raw.awaiting_payment),
    receivedByType: {
      memberships: num(type.memberships),
      services: num(type.services),
      subscriptions: num(type.subscriptions),
      other: num(type.other),
    },
    raw,
  };
}

// GET /api/v1/super-admin/finance
export async function getAdminFinance() {
  try {
    const response = await apiClient.get('/super-admin/finance');
    const data = response.data?.data || response.data || {};
    return mapAdminFinance(data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
