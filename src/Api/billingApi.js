import apiClient, { normalizeApiError } from './client';

function mapBillingItem(raw) {
  return {
    type: raw.type,
    id: raw.id,
    label: raw.label,
    amount: raw.amount,
    isPaid: !!raw.is_paid,
    createdAt: raw.created_at,
    receipt: raw.receipt || null,
  };
}

function mapAutoRenewingMembership(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    planName: (typeof raw.plan === 'string' ? raw.plan : raw.plan?.name) || raw.plan_name || null,
    amount: raw.amount,
    expiresAt: raw.expires_at || raw.next_renewal_at || raw.current_period_ends_at || null,
  };
}

function mapAddonSubscription(raw) {
  return {
    id: raw.id,
    packageName: raw.package?.name || raw.package_name || null,
    status: raw.status,
    autoRenew: !!raw.auto_renew,
    currentPeriodEndsAt: raw.current_period_ends_at || null,
  };
}

export async function getBillingOverview() {
  try {
    const response = await apiClient.get('/customer/billing');
    const data = response.data?.data || {};
    return {
      items: (data.items || []).map(mapBillingItem),
      outstandingTotal: data.outstanding_total ?? 0,
      walletBalance: data.wallet_balance ?? 0,
      autoRenewingMembership: mapAutoRenewingMembership(data.auto_renewing_membership),
      addonSubscriptions: (data.addon_subscriptions || []).map(mapAddonSubscription),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// payableType: 'ticket' | 'membership'
export async function payBillableItem(payableType, id, { gateway, useWallet }) {
  try {
    const response = await apiClient.post(`/customer/billing/${payableType}/${id}/pay`, {
      gateway,
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

// Pulls out any key that looks gateway/provider-related (stripe_*,
// razorpay_*, gateway_subscription_id, provider, etc.) from an arbitrarily
// shaped response body, so the one field that actually matters doesn't get
// lost inside a big raw JSON dump the backend team has to eyeball manually.
function extractGatewayFields(obj, out = {}, prefix = '') {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    if (/gateway|stripe|razorpay|paypal|provider|subscription_id|subscription_status/i.test(k)) {
      out[prefix + k] = v;
    }
    if (v && typeof v === 'object' && !Array.isArray(v)) extractGatewayFields(v, out, `${prefix}${k}.`);
  }
  return out;
}

export async function stopMembershipAutoRenew(membershipId, traceId) {
  const url = `/customer/billing/membership/${membershipId}/stop-auto-renew`;
  const requestedAt = Date.now();
  // Logged BEFORE the call fires — if the flow breaks before this line ever
  // prints, the bug is upstream of the API layer (never dispatched), not in
  // the backend/gateway.
  console.log('[billingApi] stop-auto-renew → sending request', { traceId, membershipId, url, requestedAt: new Date(requestedAt).toISOString() });
  try {
    const response = await apiClient.post(url);
    const durationMs = Date.now() - requestedAt;
    // Log the FULL raw body — the mapped return below only keeps `message`,
    // which has hidden gateway-sync problems before (a 200 success:true that
    // didn't actually reflect a completed gateway-side cancel). Anything the
    // backend puts in `data` (status, gateway_subscription_id, etc.) shows up
    // here so a mismatch against the payment gateway's own dashboard can be
    // traced back to exactly what this endpoint claimed at call time.
    //
    // durationMs matters on its own: if this resolves in well under a
    // second, it's a strong signal the backend never actually round-tripped
    // to the payment gateway before responding 200 — a slow gateway
    // cancel API call would show up as a multi-hundred-ms+ duration here.
    console.log('[billingApi] stop-auto-renew ← response received', {
      traceId,
      membershipId,
      status: response.status,
      durationMs,
      requestId: response.headers?.['x-request-id'] || response.headers?.['x-amzn-requestid'] || null,
      serverDate: response.headers?.date || null,
      body: response.data,
      gatewayFields: extractGatewayFields(response.data),
      // Console objects collapse when a log is copy-pasted out of the
      // devtools/Metro console (as opposed to expanded interactively) — a
      // stringified copy guarantees the full payload survives being pasted
      // into a bug report or Slack message to the backend team.
      bodyJson: JSON.stringify(response.data),
    });
    // A 200 here does NOT mean the cancellation actually happened — this
    // endpoint returns HTTP 200 with { success: false } when the gateway-side
    // cancel call fails, and axios only rejects on a non-2xx status. Without
    // this check the caller (and its optimistic Redux reducer) treats a
    // failed gateway cancellation as a success.
    if (response.data?.success === false) {
      throw { response: { status: response.status, data: response.data } };
    }
    return { message: response.data?.message, raw: response.data?.data ?? null };
  } catch (error) {
    console.log('[billingApi] stop-auto-renew ✗ request threw', {
      traceId,
      membershipId,
      durationMs: Date.now() - requestedAt,
      status: error?.response?.status,
      body: error?.response?.data,
    });
    throw normalizeApiError(error);
  }
}

function mapCancelAllItem(raw) {
  if (!raw) return null;
  return { label: raw.label, until: raw.until, status: raw.status, id: raw.id ?? raw.subscription_id ?? null, raw };
}

// Cancels the caller's active auto-renewing membership (if any) and every
// active auto-renewing service subscription, independently — always resolves
// 200; per-item outcome (status: 'cancelled' | 'failed') lives in the payload,
// not the HTTP status, since one gateway failure doesn't block the others.
export async function cancelAllSubscriptions(traceId) {
  const url = '/customer/billing/cancel-all';
  const requestedAt = Date.now();
  console.log('[billingApi] cancel-all → sending request', { traceId, url, requestedAt: new Date(requestedAt).toISOString() });
  try {
    const response = await apiClient.post(url);
    const durationMs = Date.now() - requestedAt;
    const data = response.data?.data || {};
    // Full raw body — mapCancelAllItem only keeps {label, until, status} and
    // would silently drop any reason/error detail the backend attaches to a
    // per-item failure (e.g. why a specific gateway cancel didn't go through).
    // durationMs: a fast response here for a multi-item endpoint (membership
    // + N service subs, each potentially calling out to a gateway) is a
    // strong hint the backend fanned out without waiting on gateway
    // confirmation for at least some items.
    console.log('[billingApi] cancel-all ← response received', {
      traceId,
      status: response.status,
      durationMs,
      requestId: response.headers?.['x-request-id'] || response.headers?.['x-amzn-requestid'] || null,
      serverDate: response.headers?.date || null,
      body: response.data,
      gatewayFields: extractGatewayFields(response.data),
      bodyJson: JSON.stringify(response.data),
    });
    return {
      message: response.data?.message,
      // mapCancelAllItem below strips each item down to {label, until,
      // status} for display — keep the untouched per-item object too (as
      // `raw`) so a mismatch can be traced back to whatever id/reason/
      // gateway fields the backend attached to that specific item, without
      // needing to re-derive it from the already-logged full body.
      membership: mapCancelAllItem(data.membership),
      serviceSubscriptions: (data.service_subscriptions || []).map(mapCancelAllItem),
    };
  } catch (error) {
    console.log('[billingApi] cancel-all ✗ request threw', {
      traceId,
      durationMs: Date.now() - requestedAt,
      status: error?.response?.status,
      body: error?.response?.data,
    });
    throw normalizeApiError(error);
  }
}

// The "Complete Payment" action for a pending recurring bundle (see
// mapPendingRecurringBundle in paymentsApi.js) — starts a fresh, standalone
// gateway checkout for just that one subscription. Same checkout_url/order
// shape as every other checkout endpoint here; verify the returned paymentId
// via POST /payments/{payment}/verify same as any other gateway checkout.
// No PayPal branch — this flow never offers it.
//
// Error shape is inconsistent by design: 403/409 come from a framework-level
// guard and are just { message }, no `success` key; 404/422 use the normal
// { success, message, errors? } envelope. normalizeApiError already only
// reads `message` off the top level, so both shapes work unchanged here —
// callers should still branch on `error.status` (409 = already active,
// treat as success) rather than on `success` being present.
export async function subscribeRecurringBundle(bundleId) {
  try {
    const response = await apiClient.post(`/customer/billing/checkout-bundles/${bundleId}/subscribe-recurring`);
    const data = response.data?.data || {};
    return {
      paymentId: data.payment_id,
      amount: data.amount,
      currency: data.currency,
      checkoutUrl: data.checkout_url || null,
      order: data.order || null,
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
