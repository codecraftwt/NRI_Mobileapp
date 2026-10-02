import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

// Response field names aren't pinned in the OpenAPI schema for this endpoint,
// so this stays tolerant of a plain string or a { name } geo-relation object
// (same shape used elsewhere, e.g. vendorProfileApi's geo_coverage).
function geoName(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? raw : (raw.name || null);
}

// One row in the super-admin's org-wide vendor list.
export function mapVendor(raw = {}) {
  return {
    id: raw.id,
    businessName: raw.business_name || raw.name || '',
    ownerName: raw.owner_name || raw.contact_name || null,
    email: raw.email || raw.contact_email || '',
    phone: raw.phone || raw.contact_phone || null,
    vendorType: raw.vendor_type || null,
    vendorTypeLabel: raw.vendor_type_label || (raw.vendor_type ? String(raw.vendor_type).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Individual'),
    status: raw.status || null,
    statusLabel: raw.status_label || (raw.status ? String(raw.status).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Active'),
    location: [geoName(raw.city), geoName(raw.state)].filter(Boolean).join(', ') || null,
    pincode: raw.pincode || null,
    rating: raw.rating_score != null ? Number(raw.rating_score) : null,
    ratingScore: raw.rating_score != null ? Number(raw.rating_score) : 0,
    totalJobs: num(raw.total_jobs ?? raw.jobs_count),
    statesCovered: Array.isArray(raw.states_covered) ? raw.states_covered : [],
    createdAt: raw.created_at || null,
  };
}

function mapMeta(response, listLength) {
  const meta = response.data?.meta || {};
  return {
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
    perPage: meta.per_page ?? listLength,
    total: meta.total ?? listLength,
  };
}

// GET /super-admin/vendors — org-wide vendor list. `search` matches business
// name/owner name/email/phone; the rest are optional exact-match filters.
// Paginated.
export async function getAdminVendors({ search, status, vendorType, stateId, cityId, categoryId, serviceId, pincode, page } = {}) {
  try {
    const params = {};
    if (search) params.search = search;
    if (status) params.status = status;
    if (vendorType) params.vendor_type = vendorType;
    if (stateId) params.state_id = stateId;
    if (cityId) params.city_id = cityId;
    if (categoryId) params.category_id = categoryId;
    if (serviceId) params.service_id = serviceId;
    if (pincode) params.pincode = pincode;
    if (page) params.page = page;
    const response = await apiClient.get('/super-admin/vendors', { params });
    const list = response.data?.data || [];
    return { vendors: list.map(mapVendor), meta: mapMeta(response, list.length) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
