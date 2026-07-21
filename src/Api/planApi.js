import apiClient, { normalizeApiError } from './client';

function mapFeature(raw) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    value: raw.value,
  };
}

function mapPlan(raw) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    price: raw.price,
    usdPrice: raw.usd_price,
    currency: raw.currency || 'USD',
    isCustomPricing: raw.is_custom_pricing,
    durationDays: raw.duration_days,
    isPopular: raw.is_popular,
    features: (raw.features || []).map(mapFeature),
  };
}

export async function getPlans() {
  try {
    const response = await apiClient.get('/plans');
    const list = response.data?.data || response.data || [];
    return list.map(mapPlan);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getPlan(planId) {
  try {
    const response = await apiClient.get(`/plans/${planId}`);
    return mapPlan(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapAddonPackage(raw) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    priceMonthly: Number(raw.price_monthly),
    inclusions: raw.inclusions || null,
  };
}

export async function getAddonPackages() {
  try {
    const response = await apiClient.get('/addon-packages');
    const list = response.data?.data || response.data || [];
    return list.map(mapAddonPackage);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
