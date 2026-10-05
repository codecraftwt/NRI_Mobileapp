import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function extractString(val) {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.name || val.label || val.title || val.city || val.category || val.status || '';
  }
  return String(val);
}

function mapPlan(raw) {
  const p = raw?.plan;
  if (!p) return null;
  return typeof p === 'object' ? (p.name || null) : p;
}

function mapFamilyMember(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? index),
    name: extractString(raw.name) || 'Family Member',
    relationship: raw.relationship ? titleCase(raw.relationship) : null,
    phone: extractString(raw.phone) || null,
    address: extractString(raw.address) || null,
    healthNotes: extractString(raw.health_notes || raw.notes) || null,
    emergencyContact: raw.emergency_contact || null,
  };
}

function mapProperty(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? index),
    nickname: extractString(raw.nickname || raw.name || raw.title) || 'Property',
    type: raw.type ? titleCase(raw.type) : null,
    address: extractString(raw.address) || null,
    city: extractString(raw.city || raw.cityName) || null,
    state: extractString(raw.state || raw.stateName) || null,
  };
}

function mapDocument(raw = {}, index = 0) {
  if (typeof raw === 'string') return { id: String(index), name: `Document ${index + 1}`, url: raw };
  return {
    id: String(raw.id ?? index),
    name: extractString(raw.name || raw.title || raw.file_name) || `Document ${index + 1}`,
    type: extractString(raw.type || raw.category) || null,
    url: raw.url || raw.file_url || raw.path || null,
  };
}

function mapRecentRequest(raw = {}, index = 0) {
  return {
    id: raw.id ?? index,
    ticketNumber: extractString(raw.ticket_number || raw.ticket || raw.ticketId) || (raw.id ? `TICK-${raw.id}` : ''),
    status: extractString(raw.status || 'open').toLowerCase(),
    statusLabel: extractString(raw.status_label || raw.statusLabel) || titleCase(raw.status || 'open'),
    serviceName: extractString(raw.service_name || raw.service?.name || raw.title) || 'Service Request',
    createdAt: raw.created_at || null,
    amount: raw.amount != null ? num(raw.amount) : null,
  };
}

export function mapCustomerDetail(raw = {}) {
  const c = raw.customer || raw.data || raw;

  // Membership parsing (handles array `memberships` or single object `membership`)
  const membershipsList = Array.isArray(c.memberships) ? c.memberships : (c.membership ? [c.membership] : []);
  const activeMembership = membershipsList.find(m => m.status === 'active' || m.is_active) || membershipsList[0] || c.membership || null;
  const m = activeMembership;

  const plan = mapPlan(c) || mapPlan(raw) || (m && typeof m === 'object' ? (m.plan?.name || m.name || m.plan_name) : m) || null;
  const hasActiveMembership = !!(c.has_active_membership ?? (m?.status === 'active' || m?.is_active));
  const rawStatus = String(c.membership_status || raw.membership_status || m?.status || '').toLowerCase();

  let membershipStatus = 'none';
  if (hasActiveMembership || rawStatus === 'active') membershipStatus = 'active';
  else if (rawStatus === 'pending' || plan) membershipStatus = 'pending';
  else if (rawStatus === 'expired') membershipStatus = 'expired';
  else if (rawStatus === 'cancelled') membershipStatus = 'cancelled';
  else if (rawStatus === 'never') membershipStatus = 'none';

  // NRI / Living details
  const livesIn = c.lives_in || raw.lives_in || {};
  const nriCountry = extractString(livesIn.country || c.nri_country || c.country || raw.nri_country || raw.country) || null;
  const nriState = extractString(livesIn.state || c.nri_state || c.state || raw.nri_state || raw.state) || null;
  const nriCity = extractString(livesIn.city || c.nri_city || c.city || raw.nri_city || raw.city) || null;

  const livesParts = [nriCity, nriState, nriCountry].filter(Boolean);
  const location = livesParts.length > 0 ? livesParts.join(', ') : null;

  // Home in India details
  const homeInIndia = c.home_in_india || raw.home_in_india || {};
  const indiaState = extractString(homeInIndia.state) || null;
  const indiaCity = extractString(homeInIndia.city) || null;
  const indiaLocation = [indiaCity, indiaState].filter(Boolean).join(', ') || null;

  // Family, properties, documents
  const familyList = Array.isArray(c.family_members || raw.family_members)
    ? (c.family_members || raw.family_members).map(mapFamilyMember)
    : [];
  const propertiesList = Array.isArray(c.properties || raw.properties)
    ? (c.properties || raw.properties).map(mapProperty)
    : [];
  const documentsList = Array.isArray(c.documents || raw.documents)
    ? (c.documents || raw.documents).map(mapDocument)
    : [];

  // Service requests / tickets
  const reqObj = (typeof c.requests === 'object' && c.requests !== null && !Array.isArray(c.requests)) ? c.requests : {};
  const recentReqs = Array.isArray(reqObj.recent)
    ? reqObj.recent
    : (Array.isArray(c.recent_requests || c.service_history || c.tickets || raw.recent_requests || raw.tickets)
      ? (c.recent_requests || c.service_history || c.tickets || raw.recent_requests || raw.tickets)
      : []);
  const requestsList = recentReqs.map(mapRecentRequest);

  const totalRequests = reqObj.total ?? (Array.isArray(c.requests) ? c.requests.length : requestsList.length);
  const openRequests = reqObj.open ?? 0;
  const completedRequests = reqObj.completed ?? 0;

  return {
    id: c.id ?? raw.id,
    name: extractString(c.name || c.customer_name || raw.name) || 'Customer',
    email: extractString(c.email || raw.email) || '',
    phone: extractString(c.phone || c.mobile || raw.phone) || '',
    nriCountry,
    nriState,
    nriCity,
    location,
    indiaState,
    indiaCity,
    indiaLocation,
    plan,
    hasActiveMembership,
    membershipStatus,
    rawMembershipStatus: c.membership_status || raw.membership_status || (m?.status || null),
    membershipExpiresAt: c.membership_expires_at || raw.membership_expires_at || m?.expires_at || m?.end_date || null,
    familyMembersCount: c.family_members_count ?? raw.family_members_count ?? familyList.length,
    propertiesCount: c.properties_count ?? raw.properties_count ?? propertiesList.length,
    familyMembers: familyList,
    properties: propertiesList,
    documents: documentsList,
    recentRequests: requestsList,
    totalRequests,
    openRequests,
    completedRequests,
    referralCode: c.referral_code || raw.referral_code || null,
    telecaller: typeof c.telecaller === 'object' && c.telecaller !== null ? (c.telecaller.name || null) : (c.telecaller || null),
    paymentsTotalInr: c.payments_total_inr != null ? num(c.payments_total_inr) : 0,
    createdAt: c.registered_at || c.created_at || raw.registered_at || raw.created_at || null,
    raw: c,
  };
}

export function mapCustomer(raw = {}) {
  const plan = mapPlan(raw);
  const hasActiveMembership = !!raw.has_active_membership;
  const rawStatus = String(raw.membership_status || '').toLowerCase();
  let membershipStatus = 'none';
  if (hasActiveMembership || rawStatus === 'active') membershipStatus = 'active';
  else if (rawStatus === 'pending' || plan) membershipStatus = 'pending';
  else if (rawStatus === 'expired') membershipStatus = 'expired';
  else if (rawStatus === 'cancelled') membershipStatus = 'cancelled';
  else if (rawStatus === 'never') membershipStatus = 'never';
  else if (rawStatus === 'none') membershipStatus = 'none';
  else if (rawStatus) membershipStatus = rawStatus;

  return {
    id: raw.id,
    customerId: raw.id,
    name: extractString(raw.name || raw.customer_name) || 'Customer',
    email: extractString(raw.email) || '',
    phone: extractString(raw.phone || raw.mobile || raw.contact_phone) || '',
    role: 'customer',
    isActive: raw.is_active !== false && membershipStatus !== 'cancelled' && membershipStatus !== 'expired',
    nriCountry: extractString(raw.nri_country || raw.country) || null,
    nriCity: extractString(raw.nri_city || raw.city) || null,
    location: [raw.nri_city || raw.city, raw.nri_country || raw.country].map(extractString).filter(Boolean).join(', ') || null,
    plan,
    hasActiveMembership,
    membershipExpiresAt: raw.membership_expires_at || null,
    membershipStatus,
    rawMembershipStatus: raw.membership_status || null,
    familyMembersCount: raw.family_members_count ?? 0,
    propertiesCount: raw.properties_count ?? 0,
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

// GET /api/v1/admin/customers
// State-admin: customers whose profile, family member or property is in their states.
// District/taluka-admin: customers with a family member or property in their districts.
// Parameters: search, nri_country, membership_status, plan_id, joined_from, joined_to, page, per_page
export async function getStateAdminCustomers({
  search,
  nri_country,
  membership_status,
  plan_id,
  joined_from,
  joined_to,
  page = 1,
  per_page = 15,
} = {}) {
  try {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (nri_country && nri_country.trim()) params.nri_country = nri_country.trim();
    if (membership_status && membership_status !== 'all') params.membership_status = membership_status;
    if (plan_id) params.plan_id = plan_id;
    if (joined_from) params.joined_from = joined_from;
    if (joined_to) params.joined_to = joined_to;
    if (page) params.page = page;
    if (per_page) params.per_page = per_page;

    const response = await apiClient.get('/admin/customers', { params });
    const payload = response.data?.data || response.data?.customers || response.data || [];
    const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);

    return {
      customers: list.map(mapCustomer),
      meta: mapMeta(response, list.length),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /api/v1/admin/customers/{customer}
// Path parameter:
//   customer: integer
export async function getStateAdminCustomerDetail(customerId) {
  try {
    const response = await apiClient.get(`/admin/customers/${customerId}`);
    const data = response.data?.data || response.data || {};
    return mapCustomerDetail(data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
