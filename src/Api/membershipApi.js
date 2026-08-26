import apiClient, { normalizeApiError, postMultipart } from './client';
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
    // The exact amount charged at registration/renewal (base + GST) — distinct
    // from the plan's list price. Null when the backend doesn't send it.
    amountPaid: raw.amount_paid ?? null,
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

// For the multi-plan regular/renew flow (MembershipCheckout.js), POST
// /customer/membership/coupons requires `plan_id` in the body (422s without
// it) so offers are scoped to the plan being purchased. The single
// registration-gate plan checkout (OnboardingPayment.js) resolves its one
// plan server-side and takes no parameters at all — omit plan_id there.
// Returns the full list of offers (both eligible and ineligible, with a
// `reason` on the latter) — same shape as the ticket-coupons endpoint in
// ticketApi.js.
export async function getMembershipCoupons({ planId } = {}) {
  try {
    const response = await apiClient.post('/customer/membership/coupons', { plan_id: planId || undefined });
    const list = response.data?.data || response.data || [];
    return list.map(mapCoupon);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function validateMembershipCoupon({ code }) {
  try {
    const response = await apiClient.post('/customer/membership/validate-coupon', { code });
    const data = response.data?.data || {};
    return { code: data.code, discount: data.discount, finalAmount: data.final_amount, message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// combined_cart is NOT a request field — whether the customer's cart rides
// along is resolved server-side from GET /customer/cart + auto_renew + gateway
// (see the combinedCart field read back below). Passing one here was always
// ignored by the JSON branch and actively harmful on the multipart (document
// upload) branch, where it forced combined_cart=0 on every request regardless
// of intent.
export async function checkoutMembership({
  gateway, couponCode, autoRenew, useWallet,
  familyMemberName, familyMemberRelationship,
  stateId, cityId, talukaId, address, pincode, urgency,
  preferredDate, customerNotes, documents
}) {
  try {
    const payload = {
      gateway,
      coupon_code: couponCode || undefined,
      auto_renew: !!autoRenew ? 1 : 0,
      use_wallet: !!useWallet ? 1 : 0,
      family_member_name: familyMemberName || undefined,
      family_member_relationship: familyMemberRelationship || undefined,
      state_id: stateId || undefined,
      city_id: cityId || undefined,
      taluka_id: talukaId || undefined,
      address: address || undefined,
      pincode: pincode || undefined,
      urgency: urgency || undefined,
      preferred_date: preferredDate || undefined,
      customer_notes: customerNotes || undefined,
    };
    
    const docEntries = Object.entries(documents || {}).filter(([, file]) => !!file);
    let response;
    
    if (docEntries.length > 0) {
      const uploadFiles = docEntries.map(([docId, file]) => ({
        field: `documents[${docId}]`,
        uri: file.uri,
        name: file.name,
        type: file.type
      }));
      response = await postMultipart('/customer/membership/checkout', payload, uploadFiles);
    } else {
      // Send JSON payload if no files are attached
      response = await apiClient.post('/customer/membership/checkout', {
        ...payload,
        auto_renew: !!autoRenew,
        use_wallet: !!useWallet,
      });
    }
    const data = response.data?.data || {};
    return {
      paymentId: data.payment_id,
      status: data.status,
      gateway: data.gateway,
      amount: data.amount,
      // gateway is 'stripe' | 'paypal' | 'razorpay'. Stripe/PayPal return a
      // `checkout_url` (hosted page, opened via openStripeCheckout). Razorpay
      // has no hosted page — it returns `order` ({ order_id, key, amount,
      // currency } one-time, or { subscription_id, key } auto-renew) to feed
      // the native SDK via runRazorpayPayment. PayPal with auto_renew returns
      // `plan_id` instead, for PayPal's native subscription SDK (not yet built).
      checkoutUrl: data.checkout_url || null,
      order: data.order || null,
      planId: data.plan_id || null,
      // Whether the customer's cart (if any) actually got bundled into this
      // same payment — a coupon no longer forces the cart out on its own, but
      // PayPal / an already-false auto_renew still can, so callers with a
      // non-empty cart should key off this instead of just "did I ask for
      // combined_cart" before treating the cart as booked/cleared.
      combinedCart: !!data.combined_cart,
      bundle: data.bundle ?? null,
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export const verifyPayment = verifyPaymentGeneric;
