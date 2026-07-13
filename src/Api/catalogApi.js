import apiClient, { normalizeApiError } from './client';

function mapCategory(raw) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    icon: raw.icon,
    description: raw.description,
    baseServicesCount: raw.base_services_count,
    addonServicesCount: raw.addon_services_count,
  };
}

export async function getServiceCategories() {
  try {
    const response = await apiClient.get('/services/categories');
    const list = response.data?.data || response.data || [];
    return list.map(mapCategory);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapPricing(raw) {
  if (!raw) return null;
  return {
    customerPrice: raw.customer_price,
    displayPrice: raw.display_price,
    pricingType: raw.pricing_type,
    unit: raw.unit,
    isQuoted: raw.is_quoted,
    expressSurcharge: raw.express_surcharge,
    turnaroundHours: raw.turnaround_hours,
    turnaroundLabel: raw.turnaround_label,
  };
}

function mapService(raw) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description,
    isBaseService: raw.is_base_service,
    isAddon: raw.is_addon,
    allowsEmergency: raw.allows_emergency,
    category: raw.category ? { id: raw.category.id, name: raw.category.name, icon: raw.category.icon } : null,
    pricing: mapPricing(raw.pricing),
  };
}

// `type` is 'base' | 'addon'; `stateId` requests state-specific pricing.
export async function getServices({ categoryId, type, stateId, search } = {}) {
  try {
    const params = {};
    if (categoryId) params.category_id = categoryId;
    if (type) params.type = type;
    if (stateId) params.state_id = stateId;
    if (search) params.search = search;
    const response = await apiClient.get('/services', { params });
    const list = response.data?.data || response.data || [];
    return list.map(mapService);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getServiceDetail(serviceId, { stateId } = {}) {
  try {
    const params = {};
    if (stateId) params.state_id = stateId;
    const response = await apiClient.get(`/services/${serviceId}`, { params });
    return mapService(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
