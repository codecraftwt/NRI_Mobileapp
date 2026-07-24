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

function mapPriority(raw) {
  return {
    id: raw.id,
    name: raw.name || raw.label || raw.title,
    slug: raw.slug,
    description: raw.description || null,
    // Flat, single fee added once to the request for this tier (0 for the
    // default tier); amounts are in USD. The API exposes it as `surcharge`
    // but also mirrors it as `amount` — fall back to `amount` so tiers like
    // Express/Emergency still show their fee if only `amount` comes back.
    surcharge: Number(raw.surcharge ?? raw.amount ?? 0),
    currency: raw.currency || 'USD',
    isDefault: raw.is_default ?? raw.default ?? false,
    // Whether this is the top "Emergency" tier — offered only for services
    // that allow it. Use the flag rather than matching the slug.
    isEmergencyTier: raw.is_emergency_tier ?? false,
    badgeClass: raw.badge_class || null,
    sortOrder: raw.sort_order ?? 0,
  };
}

// One-time request priority tiers (public) — the tiers a customer picks from
// when booking a single service. Post the chosen tier's `slug` as `urgency`.
export async function getPriorities() {
  try {
    const response = await apiClient.get('/priorities');
    const list = response.data?.data || response.data || [];
    // Present tiers in the backend's intended order (Emergency → Express →
    // Standard) instead of relying on the raw array order.
    return list.map(mapPriority).sort((a, b) => a.sortOrder - b.sortOrder);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapPricing(raw) {
  if (!raw) return null;
  return {
    customerPrice: raw.customer_price,
    currency: raw.currency || 'USD',
    displayPrice: raw.display_price,
    pricingType: raw.pricing_type,
    unit: raw.unit,
    isQuoted: raw.is_quoted,
    expressSurcharge: raw.express_surcharge,
    turnaroundHours: raw.turnaround_hours,
    turnaroundLabel: raw.turnaround_label,
    // Recurring-subscription pricing (present when the service allows_recurring).
    recurringPrice: raw.recurring_price,
    billingInterval: raw.billing_interval,
    recurringDisplayPrice: raw.recurring_display_price,
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
    allowsSingleUse: raw.allows_single_use,
    allowsRecurring: raw.allows_recurring,
    allowsEmergency: raw.allows_emergency,
    category: raw.category ? { id: raw.category.id, name: raw.category.name, icon: raw.category.icon } : null,
    pricing: mapPricing(raw.pricing),
  };
}

// The /services endpoint returns either a flat list (legacy) or a grouped
// object `{ one_time, recurring }` (current). This flattens both to a single
// de-duplicated list so callers that filter by base/addon keep working.
function flattenServices(data) {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  const merged = [...(data.one_time || []), ...(data.recurring || [])];
  const seen = new Set();
  return merged.filter(s => (seen.has(s.id) ? false : seen.add(s.id)));
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
    const mapped = flattenServices(response.data?.data || response.data).map(mapService);
    if (type === 'base') return mapped.filter(s => s.isBaseService);
    if (type === 'addon') return mapped.filter(s => s.isAddon);
    return mapped;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Services for a category split into one-time (allows_single_use) and
// recurring (allows_recurring) buckets, as returned by the grouped API shape.
export async function getServiceGroups({ categoryId, stateId, search } = {}) {
  try {
    const params = {};
    if (categoryId) params.category_id = categoryId;
    if (stateId) params.state_id = stateId;
    if (search) params.search = search;
    const response = await apiClient.get('/services', { params });
    const data = response.data?.data || response.data || {};
    if (Array.isArray(data)) {
      const mapped = data.map(mapService);
      return {
        oneTime: mapped.filter(s => s.allowsSingleUse),
        recurring: mapped.filter(s => s.allowsRecurring),
      };
    }
    return {
      oneTime: (data.one_time || []).map(mapService),
      recurring: (data.recurring || []).map(mapService),
    };
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
