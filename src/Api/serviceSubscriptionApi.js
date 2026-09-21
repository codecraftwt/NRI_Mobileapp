import apiClient, { normalizeApiError } from './client';

// Recurring per-service subscriptions (Service.allows_recurring). A single
// subscription can bundle several services that share one billing interval.

function mapSubscription(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    status: raw.status,
    statusLabel: raw.status_label || null,
    autoRenew: !!raw.auto_renew,
    billingInterval: raw.billing_interval || null,
    // Confirmed live: this list item carries `total_recurring_price`, not
    // `amount` — fall back to `amount` in case an older/other response shape
    // still uses it.
    amount: raw.total_recurring_price != null ? Number(raw.total_recurring_price) : (raw.amount != null ? Number(raw.amount) : null),
    currency: raw.currency || 'USD',
    currentPeriodEndsAt: raw.current_period_ends_at || null,
    services: (raw.services || []).map(s => ({ id: s.id, name: s.name })),
  };
}

export async function getServiceSubscriptions() {
  try {
    const response = await apiClient.get('/customer/service-subscriptions');
    const list = response.data?.data || response.data || [];
    return list.map(mapSubscription);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Pay-first: this only prices the selection and starts payment — nothing is
// created server-side until the returned payment_id is confirmed via
// finalizeServiceSubscription() below, so there's no who/where or documents
// on this call at all — always plain JSON. All the selected services must
// share the same billing interval and allow recurring.
export async function createServiceSubscription({ serviceIds, gateway, currency, stateId, cityId, pincode }) {
  try {
    const response = await apiClient.post('/customer/service-subscriptions', {
      service_ids: serviceIds,
      gateway,
      currency: currency || undefined,
      state_id: stateId,
      city_id: cityId || undefined,
      pincode: pincode || undefined,
    });

    const data = response.data?.data || {};
    return {
      paymentId: data.payment_id || null,
      amount: data.amount,
      currency: data.currency,
      // Razorpay recurring subscriptions run against a fixed-currency plan —
      // amount/currency above stay the plan's own currency (e.g. USD) even
      // when currency: 'INR' was requested. The backend separately returns
      // this converted reference amount for display when INR was picked; it
      // doesn't change what the Razorpay subscription itself is billed in.
      amountInr: data.amount_inr ?? null,
      gstAmount: data.gst_amount,
      // Stripe/PayPal return checkout_url; Razorpay returns `order`
      // ({ subscription_id, key }) for the native SDK — fed to runRazorpayPayment,
      // then confirmed via /payments/{payment}/verify with the payment id above.
      checkoutUrl: data.checkout_url || null,
      order: data.order || null,
      planId: data.plan_id || null,
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Actually creates the subscription, once the payment from
// createServiceSubscription() above has cleared. Safe to call twice — an
// already-finalized payment_id just returns the existing subscription.
export async function finalizeServiceSubscription(paymentId, {
  familyMemberId, propertyId, talukaId, address, customerNotes,
}) {
  try {
    const response = await apiClient.post(`/customer/service-subscriptions/${paymentId}/finalize`, {
      family_member_id: familyMemberId,
      property_id: propertyId || undefined,
      taluka_id: talukaId || undefined,
      address,
      customer_notes: customerNotes || undefined,
    });

    const data = response.data?.data || {};
    return {
      subscription: mapSubscription(data.subscription || data),
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Stop auto-renewal — the subscription stays active until the current period ends.
export async function cancelServiceSubscription(subscriptionId) {
  try {
    const response = await apiClient.post(`/customer/service-subscriptions/${subscriptionId}/cancel`);
    // A 200 here does NOT mean the cancellation actually happened — this
    // endpoint returns HTTP 200 with { success: false } when the gateway-side
    // cancel call fails, and axios only rejects on a non-2xx status. Without
    // this check the caller's optimistic reducer flips autoRenew to false
    // even though the subscription is still active with the gateway.
    if (response.data?.success === false) {
      throw { response: { status: response.status, data: response.data } };
    }
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
