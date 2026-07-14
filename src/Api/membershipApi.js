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

// The catalog endpoint (GET /plans) confirmed live that each feature is
// {id, name, slug, value} with a real numeric id — but this account has
// never held an active membership, so the *embedded* `plan.features` shape
// returned by GET /customer/membership itself was never actually verified
// live. Defensive fallbacks here (index-based id, name coerced to a string)
// so a differently-shaped or string-only entry can't collide render keys or
// slip a non-string value into a <Text>.
function mapFeature(raw, index) {
  if (raw && typeof raw === 'object') {
    return {
      id: raw.id ?? raw.slug ?? `feature-${index}`,
      name: raw.name != null ? String(raw.name) : '',
      slug: raw.slug ?? null,
      value: raw.value != null ? String(raw.value) : null,
    };
  }
  return { id: `feature-${index}`, name: raw != null ? String(raw) : '', slug: null, value: null };
}

// NOTE: verified live against GET /customer/memberships — an item there
// looks like {id, plan:{id,name,slug}, status, starts_at, expires_at,
// auto_renew, amount_paid} with NO explicit payment/paid field. Cross-checked
// against GET /customer/billing (which does carry a real `is_paid` per
// billing item) for this same membership id and found is_paid:false while
// status:'pending' — so paymentStatus below is inferred from `status`
// ('active'/'expired' => Paid, 'pending' => Pending) rather than a real field.
function mapMembership(raw) {
  if (!raw) return null;
  const status = raw.status || null;
  return {
    id: raw.id,
    planId: raw.plan_id ?? raw.plan?.id ?? null,
    planName: raw.plan?.name || raw.plan_name || null,
    price: raw.amount_paid ?? raw.price ?? raw.plan?.price ?? null,
    status,
    startDate: raw.start_date || raw.starts_at || null,
    endDate: raw.end_date || raw.expires_at || null,
    autoRenew: !!raw.auto_renew,
    paymentStatus: raw.payment_status || (status === 'active' || status === 'expired' ? 'Paid' : status === 'pending' ? 'Pending' : null),
    features: (raw.plan?.features || raw.features || []).map((f, idx) => mapFeature(f, idx)),
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

function mapCoupon(raw) {
  return {
    code: raw.code,
    description: raw.description,
    valueLabel: raw.value_label,
    minOrder: raw.min_order,
    validUntil: raw.valid_until,
    eligible: raw.eligible,
    reason: raw.reason,
    savings: raw.savings,
  };
}

// Verified live: POST /customer/membership/coupons requires `plan_id` in the
// body (422s without it) and returns the full list of offers applicable to
// that plan (both eligible and ineligible, with a `reason` on the latter) —
// same shape as the ticket-coupons endpoint in ticketApi.js.
export async function getMembershipCoupons({ planId }) {
  try {
    const response = await apiClient.post('/customer/membership/coupons', { plan_id: planId });
    const list = response.data?.data || response.data || [];
    return list.map(mapCoupon);
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
