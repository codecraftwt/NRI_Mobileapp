import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

export function mapTelecallerVendor(raw = {}) {
  const availabilityRaw = raw.availability || (raw.is_available ? 'available' : (raw.is_available === false ? 'unavailable' : null)) || (raw.status === 'active' ? 'available' : 'unavailable');

  return {
    id: raw.id,
    businessName: raw.business_name || raw.name || `Vendor #${raw.id}`,
    ownerName: raw.owner_name || raw.contact_name || raw.owner || '',
    phone: raw.phone || raw.contact_phone || '',
    email: raw.email || raw.contact_email || '',
    rating: raw.rating != null ? Number(raw.rating) : (raw.rating_score != null ? Number(raw.rating_score) : 0),
    ratingCount: num(raw.rating_count ?? raw.ratings_count ?? raw.total_ratings),
    availability: availabilityRaw || 'available',
    isAvailable: availabilityRaw === 'available' || availabilityRaw === true,
    totalJobs: num(raw.total_jobs ?? raw.jobs_count ?? raw.completed_jobs),
    activeJobsCount: num(raw.active_jobs_count ?? raw.current_jobs_count ?? (Array.isArray(raw.current_jobs) ? raw.current_jobs.length : 0)),
    categories: Array.isArray(raw.categories)
      ? raw.categories.map(c => (typeof c === 'string' ? { id: c, name: c } : { id: c.id, name: c.name || c.title || '' }))
      : Array.isArray(raw.services)
      ? raw.services.map(s => (typeof s === 'string' ? { id: s, name: s } : { id: s.id, name: s.name || '' }))
      : [],
    citiesCovered: Array.isArray(raw.cities_covered)
      ? raw.cities_covered.map(c => (typeof c === 'string' ? c : (c.name || '')))
      : Array.isArray(raw.cities)
      ? raw.cities.map(c => (typeof c === 'string' ? c : (c.name || '')))
      : [],
    statesCovered: Array.isArray(raw.states_covered)
      ? raw.states_covered.map(s => (typeof s === 'string' ? s : (s.name || '')))
      : Array.isArray(raw.states)
      ? raw.states.map(s => (typeof s === 'string' ? s : (s.name || '')))
      : [],
    status: raw.status || 'active',
    statusLabel: raw.status_label || (raw.status ? String(raw.status).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Active'),
    location: [raw.city?.name || raw.city, raw.state?.name || raw.state].filter(Boolean).join(', ') || null,
    createdAt: raw.created_at || null,
    raw,
  };
}

export function mapTelecallerVendorDetail(raw = {}) {
  const base = mapTelecallerVendor(raw);

  return {
    ...base,
    address: raw.address || raw.street || '',
    pincode: raw.pincode || raw.postal_code || '',
    currentJobs: Array.isArray(raw.current_jobs || raw.jobs || raw.active_jobs)
      ? (raw.current_jobs || raw.jobs || raw.active_jobs).map(j => ({
          id: j.id,
          ticketNumber: j.ticket_number || j.ticketNumber || j.code || `#${j.id}`,
          serviceName: j.service_name || j.service?.name || j.title || 'Service',
          customerName: j.customer_name || j.customer?.name || 'Customer',
          customerPhone: j.customer_phone || j.customer?.phone || null,
          status: j.status || 'in_progress',
          statusLabel: j.status_label || (j.status ? String(j.status).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'In Progress'),
          urgency: j.urgency || 'standard',
          scheduledAt: j.scheduled_at || j.preferred_date || j.deadline || null,
          vendorCost: num(j.vendor_cost ?? j.vendorCost),
          cityName: j.city?.name || j.cityName || '',
        }))
      : [],
    recentCalls: Array.isArray(raw.recent_calls || raw.calls)
      ? (raw.recent_calls || raw.calls).map(c => ({
          id: c.id,
          title: c.title || c.subject || 'Vendor call',
          direction: c.direction || 'outgoing',
          status: c.status || 'completed',
          duration: c.duration ? `${c.duration}s` : null,
          createdAt: c.created_at || c.date || null,
          note: c.note || c.summary || null,
        }))
      : [],
    notes: Array.isArray(raw.notes)
      ? raw.notes.map(n => ({
          id: n.id,
          author: n.author || n.user_name || 'Staff',
          note: typeof n === 'string' ? n : (n.note || n.message || ''),
          createdAt: n.created_at || null,
        }))
      : [],
  };
}

/**
 * GET /api/v1/telecaller/vendors
 * Fetch paginated vendors covering the telecaller's area (best-rated first)
 */
export async function getTelecallerVendors(params = {}) {
  try {
    const cleanParams = {};
    if (params.q) cleanParams.q = params.q;
    if (params.category_id) cleanParams.category_id = params.category_id;
    if (params.city_id) cleanParams.city_id = params.city_id;
    if (params.availability && params.availability !== 'all') cleanParams.availability = params.availability;
    if (params.page) cleanParams.page = params.page;

    const response = await apiClient.get('/telecaller/vendors', { params: cleanParams });
    const data = response.data?.data || response.data || {};
    const itemsRaw = Array.isArray(data) ? data : (data.vendors || data.data || data.items || []);
    const metaRaw = response.data?.meta || data.meta || {};

    return {
      vendors: itemsRaw.map(mapTelecallerVendor),
      meta: {
        currentPage: num(metaRaw.current_page || 1),
        lastPage: num(metaRaw.last_page || 1),
        total: num(metaRaw.total || itemsRaw.length),
        perPage: num(metaRaw.per_page || 15),
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * GET /api/v1/telecaller/vendors/{vendor}
 * Fetch detailed vendor contact, categories, coverage by state, current jobs, recent calls
 */
export async function getTelecallerVendorDetail(vendorId) {
  try {
    const response = await apiClient.get(`/telecaller/vendors/${vendorId}`);
    const raw = response.data?.data?.vendor || response.data?.data || response.data?.vendor || response.data || {};
    return mapTelecallerVendorDetail(raw);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
