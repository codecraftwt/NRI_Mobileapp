import apiClient, { normalizeApiError } from './client';

function mapSubscription(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    status: raw.status,
    autoRenew: !!raw.auto_renew,
    currentPeriodEndsAt: raw.current_period_ends_at || null,
  };
}

function mapPackage(raw) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    priceMonthly: Number(raw.price_monthly),
    inclusions: raw.inclusions || null,
    mySubscription: mapSubscription(raw.my_subscription),
  };
}

// Authenticated variant of GET /addon-packages — includes `my_subscription`
// per package, unlike the public catalog endpoint used during onboarding.
export async function getMyAddonPackages() {
  try {
    const response = await apiClient.get('/customer/addon-packages');
    const list = response.data?.data || response.data || [];
    return list.map(mapPackage);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function subscribeAddonPackage(packageId, { gateway }) {
  try {
    const response = await apiClient.post(`/customer/addon-packages/${packageId}/subscribe`, { gateway });
    const data = response.data?.data || {};
    return {
      paymentId: data.payment_id,
      subscriptionId: data.subscription_id,
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

export async function cancelAddonSubscription(subscriptionId) {
  try {
    const response = await apiClient.post(`/customer/addon-subscriptions/${subscriptionId}/cancel`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
