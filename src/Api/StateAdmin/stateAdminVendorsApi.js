import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

function geoName(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? raw : (raw.name || null);
}

// Map a single vendor item from GET /api/v1/admin/vendors
export function mapStateAdminVendor(raw = {}) {
  const city = geoName(raw.city || raw.district);
  const state = geoName(raw.state);
  const location = [city, state].filter(Boolean).join(', ') || raw.address || null;

  return {
    id: raw.id,
    businessName: raw.business_name || raw.name || 'Vendor',
    ownerName: raw.owner_name || raw.contact_name || null,
    email: raw.email || raw.contact_email || '',
    phone: raw.phone || raw.contact_phone || '',
    vendorType: raw.vendor_type || raw.type || null,
    status: (raw.status || 'active').toLowerCase(),
    location,
    city: city || null,
    state: state || null,
    district: geoName(raw.district) || city || null,
    pincode: raw.pincode || null,
    rating: raw.rating_score != null ? Number(raw.rating_score) : (raw.rating != null ? Number(raw.rating) : null),
    totalJobs: num(raw.total_jobs ?? raw.jobs_count ?? raw.completed_jobs),
    activeJobs: num(raw.active_jobs ?? raw.in_progress_jobs),
    servicesCount: num(raw.services_count ?? (Array.isArray(raw.services) ? raw.services.length : 0)),
    categories: Array.isArray(raw.categories) ? raw.categories.map(c => c.name || c) : [],
    createdAt: raw.created_at || null,
    raw,
  };
}

function mapMeta(response, listLength) {
  const meta = response.data?.meta || response.data || {};
  return {
    currentPage: meta.current_page ?? meta.currentPage ?? 1,
    lastPage: meta.last_page ?? meta.lastPage ?? 1,
    perPage: meta.per_page ?? meta.perPage ?? listLength,
    total: meta.total ?? listLength,
  };
}

// GET /api/v1/admin/vendors
// vendors within this admin's coverage - searchable, filterable by status/type/category/service
export async function getStateAdminVendors({
  search,
  status,
  vendorType,
  categoryId,
  serviceId,
  page = 1,
} = {}) {
  try {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (status && status !== 'all') params.status = status;
    if (vendorType && vendorType !== 'all') params.vendor_type = vendorType;
    if (categoryId) params.category_id = categoryId;
    if (serviceId) params.service_id = serviceId;
    if (page) params.page = page;

    const response = await apiClient.get('/admin/vendors', { params });
    const payload = response.data?.data || response.data?.vendors || response.data || [];
    const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);

    return {
      vendors: list.map(mapStateAdminVendor),
      meta: mapMeta(response, list.length),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /api/v1/admin/vendors
// Add a vendor within this admin's own coverage.
// Creates the vendor's login + profile and, if rates are included, its initial service areas in one call.
export async function createStateAdminVendor({
  existingUserId,
  name,
  email,
  password,
  passwordConfirmation,
  businessName,
  vendorType = 'individual',
  contactPhone,
  contactEmail,
  address,
  panNumber,
  gstNumber,
  aadhaarNumber,
  bankName,
  bankAccountName,
  bankAccountNumber,
  bankIfsc,
  upiId,
  rates = [],
} = {}) {
  try {
    const body = {
      existing_user_id: existingUserId ? Number(existingUserId) : undefined,
      name,
      email,
      password,
      password_confirmation: passwordConfirmation,
      business_name: businessName,
      vendor_type: vendorType || 'individual',
      contact_phone: contactPhone || undefined,
      contact_email: contactEmail || undefined,
      address: address || undefined,
      pan_number: panNumber || undefined,
      gst_number: gstNumber || undefined,
      aadhaar_number: aadhaarNumber || undefined,
      bank_name: bankName || undefined,
      bank_account_name: bankAccountName || undefined,
      bank_account_number: bankAccountNumber || undefined,
      bank_ifsc: bankIfsc || undefined,
      upi_id: upiId || undefined,
      rates: Array.isArray(rates) && rates.length > 0
        ? rates.map(r => ({
            state_id: Number(r.stateId ?? r.state_id),
            city_id: Number(r.cityId ?? r.city_id),
            pincodes: String(r.pincodes || ''),
            service_id: Number(r.serviceId ?? r.service_id),
            rate: Number(r.rate || 0),
            recurring_rate: r.recurringRate != null || r.recurring_rate != null ? Number(r.recurringRate ?? r.recurring_rate) : undefined,
          }))
        : undefined,
    };

    // Remove undefined properties
    Object.keys(body).forEach(key => body[key] === undefined && delete body[key]);

    const response = await apiClient.post('/admin/vendors', body);
    const data = response.data?.data || response.data || {};
    return {
      id: data.id || response.data?.id,
      message: response.data?.message || 'Vendor created successfully.',
      vendor: data,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /api/v1/admin/vendors/region-scope
// Use to restrict the state/city pickers before calling POST /api/v1/admin/vendors
// city_ids is null for a state-admin (state-level scoping only) and for any unrestricted actor
export async function getVendorRegionScope() {
  try {
    const response = await apiClient.get('/admin/vendors/region-scope');
    const payload = response.data?.data || response.data || {};
    return {
      states: Array.isArray(payload.states) ? payload.states : [],
      cityIds: Array.isArray(payload.city_ids)
        ? payload.city_ids
        : (Array.isArray(payload.cityIds) ? payload.cityIds : null),
      raw: payload,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}


