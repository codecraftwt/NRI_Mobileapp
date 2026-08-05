import apiClient, { normalizeApiError, postMultipart } from '../client';

// Response field names aren't pinned in the OpenAPI schema, so these mappers
// stay tolerant across a few plausible snake_case shapes — consistent with the
// other RM mappers.

function num(v) {
  return v == null ? 0 : Number(v);
}

function mapMembership(raw) {
  const m = raw.membership ?? raw.membership_plan ?? raw.plan;
  if (m && typeof m === 'object') return m.plan?.name || m.name || null;
  return m || null;
}

// One row in the RM's customer book.
export function mapCustomer(raw = {}) {
  return {
    id: raw.id,
    name: raw.name || raw.customer_name || '',
    email: raw.email || '',
    phone: raw.phone || raw.mobile || '',
    location: [raw.city, raw.country || raw.nri_country].filter(Boolean).join(', ') || raw.location || null,
    membership: mapMembership(raw),
    openRequests: num(raw.open_requests_count ?? raw.open_requests ?? raw.open_request_count),
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

// GET /rm/customers — searchable customer book with membership + open-request
// counts. `search` matches name/email/phone. Paginated.
export async function getRmCustomers({ search, page } = {}) {
  try {
    const params = {};
    if (search) params.search = search;
    if (page) params.page = page;
    const response = await apiClient.get('/rm/customers', { params });
    const list = response.data?.data || [];
    return { customers: list.map(mapCustomer), meta: mapMeta(response, list.length) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function mapFamilyMember(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? index),
    name: raw.name || '',
    relationship: raw.relationship ? titleCase(raw.relationship) : null,
    phone: raw.phone || null,
    address: raw.address || null,
    healthNotes: raw.health_notes || null,
    emergencyContact: raw.emergency_contact || null,
  };
}

function mapProperty(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? index),
    nickname: raw.nickname || raw.name || 'Property',
    type: raw.type ? titleCase(raw.type) : null,
    address: raw.address || null,
  };
}

function mapDocument(raw = {}, index = 0) {
  if (typeof raw === 'string') return { id: String(index), name: `Document ${index + 1}`, url: raw };
  return {
    id: String(raw.id ?? index),
    name: raw.name || raw.title || raw.file_name || `Document ${index + 1}`,
    type: raw.type || raw.category || null,
    url: raw.url || raw.file_url || raw.path || null,
  };
}

function mapRecentRequest(raw = {}, index = 0) {
  return {
    id: raw.id ?? index,
    ticket: raw.ticket_number || raw.ticket || '',
    status: raw.status || '',
    service: raw.service?.name || raw.service_name || 'Service Request',
    createdAt: raw.created_at || null,
  };
}

// Maps the full customer profile payload (nested under `data.customer`).
export function mapCustomerDetail(raw = {}) {
  const c = raw.customer || raw;
  const m = c.membership;
  return {
    id: c.id,
    name: c.name || '',
    email: c.email || '',
    phone: c.phone || '',
    nriCountry: c.nri_country || c.country || null,
    nriCity: c.nri_city || c.city || null,
    language: c.preferences?.language || c.language || null,
    timezone: c.preferences?.timezone || c.timezone || null,
    membership: m ? {
      name: m.plan?.name || m.name || null,
      status: m.status || null,
      expiresAt: m.expires_at || null,
    } : null,
    familyMembers: (c.family_members || []).map(mapFamilyMember),
    properties: (c.properties || []).map(mapProperty),
    documents: (c.documents || []).map(mapDocument),
    recentRequests: (c.recent_requests || c.service_history || []).map(mapRecentRequest),
  };
}

// GET /rm/customers/{customer} — full profile (family, properties, documents,
// service history, preferences). 403 if assigned to another RM.
export async function getRmCustomerDetail(customer) {
  try {
    const response = await apiClient.get(`/rm/customers/${customer}`);
    return mapCustomerDetail(response.data?.data || response.data || {});
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapCommunication(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? index),
    channel: raw.channel || 'other',
    direction: raw.direction || null,
    summary: raw.summary || raw.note || '',
    occurredAt: raw.occurred_at || raw.created_at || null,
    by: raw.logged_by?.name || raw.user?.name || raw.by || null,
    attachmentUrl: raw.attachment_url || raw.attachment || raw.file_url || null,
  };
}

// GET /rm/customers/{customer}/communications — call/whatsapp/email log. Paginated.
export async function getRmCustomerCommunications(customer, { page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get(`/rm/customers/${customer}/communications`, { params });
    const list = response.data?.data || [];
    return { communications: list.map(mapCommunication), meta: mapMeta(response, list.length) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/customers/{customer}/communications — log an interaction. Uses
// multipart when a file is attached (pdf/jpg/png/audio, max 25 MB).
export async function logRmCustomerCommunication(customer, { channel, direction, summary, occurredAt }, file) {
  try {
    const fields = { channel, direction, summary, occurred_at: occurredAt || undefined };
    const files = file ? [{ field: 'attachment', uri: file.uri, name: file.name || 'attachment', type: file.type || 'application/octet-stream' }] : [];
    const res = await postMultipart(`/rm/customers/${customer}/communications`, fields, files);
    const data = res.data?.data || res.data || {};
    return { communication: mapCommunication(data.communication || data), message: res.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
