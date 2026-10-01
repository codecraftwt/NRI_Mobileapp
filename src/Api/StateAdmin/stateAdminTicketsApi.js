import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

function geoName(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? raw : (raw.name || null);
}

// `priority`/`urgency` come back as a priority-catalog object ({id, name,
// slug, surcharge} — see usePriorities) on this endpoint, not a plain string
function priorityName(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? raw : (raw.slug || raw.name || null);
}

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// Map a single ticket from GET /api/v1/admin/tickets.
export function mapStateAdminTicket(raw = {}) {
  const vendorName = raw.assigned_vendor?.business_name || raw.assigned_vendor?.name || geoName(raw.vendor) || raw.vendor_name || null;
  const cityName = raw.location?.city?.name || geoName(raw.city) || raw.city_name || null;
  const stateName = raw.location?.state?.name || geoName(raw.state) || raw.state_name || null;
  const categoryName = raw.category?.name || geoName(raw.service_category) || raw.service_category_name || null;
  const priorityObj = raw.priority;
  const prioritySlug = typeof priorityObj === 'object' && priorityObj ? (priorityObj.slug || priorityObj.name) : (priorityName(raw.priority) || priorityName(raw.urgency));
  const priorityLabel = typeof priorityObj === 'object' && priorityObj ? (priorityObj.name || priorityObj.slug) : (prioritySlug ? titleCase(prioritySlug) : 'Standard');
  const amountInr = raw.total_amount_inr != null ? num(raw.total_amount_inr) : (raw.amount != null ? num(raw.amount) : null);
  const amountFormatted = amountInr != null && amountInr > 0 ? `₹${amountInr.toLocaleString('en-IN')}` : null;
  const isQuoted = Boolean(raw.requires_price_confirmation ?? raw.is_quoted ?? raw.quoted);

  return {
    id: raw.id,
    ticketNumber: raw.ticket_number || raw.ticket_id || raw.ticketNumber || (raw.id ? `TICK-${raw.id}` : ''),
    serviceName: raw.service?.name || raw.service_name || raw.title || 'Service Request',
    serviceCategoryName: categoryName,
    categoryName,
    customerName: raw.customer?.name || raw.customer_name || raw.user?.name || 'Customer',
    customerEmail: raw.customer?.email || raw.customer_email || null,
    customerPhone: raw.customer?.phone || raw.customer_phone || null,
    status: (raw.status || 'new').toLowerCase(),
    statusLabel: raw.status_label || (raw.status ? titleCase(raw.status) : 'New'),
    priority: (prioritySlug || '').toLowerCase() || 'standard',
    priorityLabel,
    assignedVendor: raw.assigned_vendor || null,
    vendorName,
    isAssigned: vendorName != null || raw.assigned_vendor != null || raw.vendor_id != null,
    vendorAssignedAt: raw.vendor_assigned_at || null,
    assignedRm: raw.assigned_rm || null,
    assignedRmName: raw.assigned_rm?.name || null,
    assignedTelecaller: raw.assigned_telecaller || null,
    assignedTelecallerName: raw.assigned_telecaller?.name || null,
    cityName,
    stateName,
    location: raw.location || null,
    isQuoted,
    requiresPriceConfirmation: !!raw.requires_price_confirmation,
    isLineTicket: !!raw.is_line_ticket,
    amount: amountInr,
    amountFormatted,
    slaStatus: raw.sla_status || (raw.sla_breached ? 'breached' : 'within_sla'),
    createdAt: raw.created_at || null,
    updatedAt: raw.updated_at || null,
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
    // Per-status totals for the same scope + filters (minus status itself) —
    // drives the status tab badges without a separate round trip.
    statusCounts: meta.status_counts || meta.statusCounts || {},
  };
}

// GET /api/v1/admin/tickets
// The complete list behind the dashboard's recent_tickets. State-admin: their
// scoped state(s), or everything for a National Admin (no state). District/
// taluka-admin: their covered cities. Super-admin: everything. Newest first
// unless sort=oldest. Requires the tickets.view permission (403 otherwise).
export async function getStateAdminTickets({
  search,
  status,
  openOnly,
  assignment,
  urgency,
  serviceCategoryId,
  cityId,
  vendorId,
  quoted,
  from,
  to,
  sort = 'latest',
  perPage = 10,
  page = 1,
} = {}) {
  try {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (status && status !== 'all') params.status = status;
    if (openOnly) params.open_only = 1;
    if (assignment && assignment !== 'all') params.assignment = assignment;
    if (urgency) params.urgency = urgency;
    if (serviceCategoryId) params.service_category_id = serviceCategoryId;
    if (cityId) params.city_id = cityId;
    if (vendorId) params.vendor_id = vendorId;
    if (quoted) params.quoted = 1;
    if (from) params.from = from;
    if (to) params.to = to;
    if (sort) params.sort = sort;
    if (perPage) params.per_page = perPage;
    if (page) params.page = page;

    const response = await apiClient.get('/admin/tickets', { params });
    const payload = response.data?.data || response.data?.tickets || response.data || [];
    const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);

    return {
      tickets: list.map(mapStateAdminTicket),
      meta: mapMeta(response, list.length),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
