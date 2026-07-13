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
    planName: raw.plan?.name || raw.plan_name || null,
    amount: raw.amount,
    nextRenewalAt: raw.next_renewal_at || raw.current_period_ends_at || null,
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
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
