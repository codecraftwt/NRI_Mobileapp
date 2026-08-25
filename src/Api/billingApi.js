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

export async function stopMembershipAutoRenew(membershipId) {
  try {
    const response = await apiClient.post(`/customer/billing/membership/${membershipId}/stop-auto-renew`);
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
export async function cancelAllSubscriptions() {
  try {
    const response = await apiClient.post('/customer/billing/cancel-all');
    const data = response.data?.data || {};
    return {
      message: response.data?.message,
      membership: mapCancelAllItem(data.membership),
      serviceSubscriptions: (data.service_subscriptions || []).map(mapCancelAllItem),
    };
  } catch (error) {
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
