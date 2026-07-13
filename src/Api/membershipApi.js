import apiClient, { normalizeApiError } from './client';
import { verifyPayment as verifyPaymentGeneric } from './paymentsApi';

function mapUsage(raw) {
  if (!raw) return null;
  return {
    requestsUsed: raw.requests_used,
    requestsLimit: raw.requests_limit,
    waiversUsed: raw.waivers_used,
    waiversLimit: raw.waivers_limit,
    visitsUsed: raw.visits_used,
    visitsLimit: raw.visits_limit,
    inspectionsRemaining: raw.inspections_remaining,
  };
}

function mapFeature(raw) {
  return { id: raw.id, name: raw.name, slug: raw.slug, value: raw.value };
}

// NOTE: the backend only documents "membership or null" without a field-level
// schema, and this account has never held a paid membership to verify a real
// payload against — so this mapper is defensive/best-effort on field names,
// following the same snake_case conventions confirmed elsewhere (plans, usage).
function mapMembership(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    planId: raw.plan_id ?? raw.plan?.id ?? null,
    planName: raw.plan?.name || raw.plan_name || null,
    price: raw.price ?? raw.plan?.price ?? null,
    status: raw.status || null,
    startDate: raw.start_date || raw.starts_at || null,
    endDate: raw.end_date || raw.expires_at || null,
    autoRenew: !!raw.auto_renew,
    paymentStatus: raw.payment_status || null,
    features: (raw.plan?.features || raw.features || []).map(mapFeature),
  };
}

export async function getMembership() {
  try {
    const response = await apiClient.get('/customer/membership');
    const data = response.data?.data || response.data || {};
    return {
      membership: mapMembership(data.membership),
      usage: mapUsage(data.usage),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getMembershipHistory() {
  try {
    const response = await apiClient.get('/customer/memberships');
    const list = response.data?.data || response.data || [];
    return list.map(mapMembership);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function validateMembershipCoupon({ planId, code }) {
  try {
    const response = await apiClient.post('/customer/membership/validate-coupon', { plan_id: planId, code });
    const data = response.data?.data || {};
    return { code: data.code, discount: data.discount, finalAmount: data.final_amount, message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function checkoutMembership({ planId, gateway, addons, couponCode, addonCouponCode, autoRenew, useWallet }) {
  try {
    const response = await apiClient.post('/customer/membership/checkout', {
      plan_id: planId,
      gateway,
      addons: addons && addons.length > 0 ? addons : undefined,
      coupon_code: couponCode || undefined,
      addon_coupon_code: addonCouponCode || undefined,
      auto_renew: !!autoRenew,
      use_wallet: !!useWallet,
    });
    const data = response.data?.data || {};
    return {
      paymentId: data.payment_id,
      status: data.status,
      gateway: data.gateway,
      amount: data.amount,
      order: data.order || null,
      checkoutUrl: data.checkout_url || null,
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export const verifyPayment = verifyPaymentGeneric;
