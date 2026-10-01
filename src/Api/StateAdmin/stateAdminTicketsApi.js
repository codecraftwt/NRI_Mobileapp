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
// — String(raw.priority) on the raw object stringified to "[object Object]".
function priorityName(raw) {
  if (!raw) return null;
  return typeof raw === 'string' ? raw : (raw.slug || raw.name || null);
}

// Map a single ticket from GET /api/v1/admin/tickets.
export function mapStateAdminTicket(raw = {}) {
  const vendorName = geoName(raw.vendor) || raw.vendor_name || null;
  return {
    id: raw.id,
    ticketNumber: raw.ticket_number || raw.ticket_id || raw.ticketNumber || (raw.id ? `TICK-${raw.id}` : ''),
    serviceName: raw.service_name || raw.service?.name || raw.title || 'Service Request',
    customerName: raw.customer_name || raw.customer?.name || raw.user?.name || 'Customer',
    customerEmail: raw.customer_email || raw.customer?.email || null,
    customerPhone: raw.customer_phone || raw.customer?.phone || null,
    status: (raw.status || 'new').toLowerCase(),
    statusLabel: raw.status_label || null,
    priority: (priorityName(raw.priority) || priorityName(raw.urgency) || '').toLowerCase() || null,
    vendorName,
    isAssigned: vendorName != null || raw.vendor_id != null,
    cityName: geoName(raw.city) || raw.city_name || null,
    stateName: geoName(raw.state) || raw.state_name || null,
    serviceCategoryName: geoName(raw.service_category) || raw.service_category_name || null,
    // "Quoted" services have no fixed price at booking — a vendor/RM proposes
    // one after the request is submitted (see TicketDetail.js's "Additional
    // Payment Requested" flow on the customer side).
    isQuoted: !!(raw.is_quoted ?? raw.quoted),
    amount: raw.amount != null ? num(raw.amount) : null,
    amountFormatted: raw.amount != null ? `₹${num(raw.amount).toLocaleString('en-IN')}` : null,
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
  sort,
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
