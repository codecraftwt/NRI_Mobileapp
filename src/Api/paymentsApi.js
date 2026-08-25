import apiClient, { API_BASE_URL, normalizeApiError } from './client';

// A membership checkout can bundle one-time cart services into the same
// gateway session, but never a recurring one (a checkout session only ever
// produces one subscription, and the membership itself is already that one).
// So a recurring cart service is priced/shown up front but left unpaid after
// membership checkout — this is that leftover item, wherever it appears
// (payments/verify, GET /dashboard, or implicitly what subscribe-recurring
// pays for). display_amount/display_currency are already GST-inclusive and
// already converted to the customer's billing currency.
export function mapPendingRecurringBundle(raw) {
  if (!raw) return null;
  return {
    bundleId: raw.bundle_id,
    serviceNames: raw.service_names,
    interval: raw.interval,
    displayAmount: raw.display_amount,
    displayCurrency: raw.display_currency,
  };
}

// Generic payment confirmation endpoint — shared across every payable type
// (membership, ticket, add-on package subscription). Razorpay: pass
// razorpayOrderId/razorpayPaymentId/razorpaySignature for a one-time order,
// or razorpaySubscriptionId for a recurring subscription. Stripe: pass sessionId.
export async function verifyPayment(paymentId, { razorpayOrderId, razorpayPaymentId, razorpaySignature, razorpaySubscriptionId, sessionId } = {}) {
  try {
    const response = await apiClient.post(`/customer/payments/${paymentId}/verify`, {
      razorpay_order_id: razorpayOrderId || undefined,
      razorpay_payment_id: razorpayPaymentId || undefined,
      razorpay_signature: razorpaySignature || undefined,
      razorpay_subscription_id: razorpaySubscriptionId || undefined,
      session_id: sessionId || undefined,
    });
    const data = response.data?.data || null;
    return {
      message: response.data?.message,
      // A membership checkout that left a recurring service unpaid — null on
      // every other payment.
      data: data ? { ...data, pendingRecurringBundle: mapPendingRecurringBundle(data.pending_recurring_bundle) } : null,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// The gateways currently offerable to this customer. The backend list already
// reflects NRI eligibility AND the super-admin enable/disable toggle — this
// now applies to Stripe/PayPal/Razorpay alike, so it's the single source of
// truth for the payment picker; don't hardcode or re-gate (or force-inject a
// gateway) client-side. Each item is { value, label } e.g.
// { value: 'razorpay', label: 'Card (Razorpay)' }.
export async function getPaymentGateways() {
  try {
    const response = await apiClient.get('/customer/payment-gateways');
    // Tolerate the common response shapes: { data: [...] }, a bare [...], or a
    // { gateways: [...] } wrapper. Items may key the id as value/key/gateway/id
    // and the label as label/name/title.
    // Laravel serializes a non-sequentially-keyed collection (e.g. after a
    // gateway is filtered out, keys become {0,2}) as a JSON OBJECT, not an
    // array — so `data` can arrive as either. Object.values() flattens both.
    const body = response.data;
    let raw = body?.data ?? body?.gateways ?? body?.data?.gateways;
    if (raw == null && Array.isArray(body)) raw = body;
    const list = Array.isArray(raw) ? raw
      : (raw && typeof raw === 'object') ? Object.values(raw)
      : [];
    const mapped = list
      .map(g => {
        if (typeof g === 'string') return { value: g, label: g };
        const value = g.value ?? g.key ?? g.gateway ?? g.id ?? g.slug;
        return { value, label: g.label ?? g.name ?? g.title ?? value };
      })
      .filter(g => !!g.value);
    return mapped;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapPayment(raw) {
  return {
    id: raw.id,
    receiptNumber: raw.receipt_number,
    amount: raw.amount,
    currency: raw.currency,
    gateway: raw.gateway,
    status: raw.status,
    paidAt: raw.paid_at,
    createdAt: raw.created_at,
  };
}

export async function getPaymentHistory({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/customer/payments', { params });
    const list = response.data?.data || [];
    return {
      payments: list.map(mapPayment),
      meta: {
        currentPage: response.data?.meta?.current_page ?? 1,
        lastPage: response.data?.meta?.last_page ?? 1,
        perPage: response.data?.meta?.per_page ?? list.length,
        total: response.data?.meta?.total ?? list.length,
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export function getReceiptDownloadUrl(paymentId) {
  return `${API_BASE_URL}/customer/payments/${paymentId}/receipt`;
}
