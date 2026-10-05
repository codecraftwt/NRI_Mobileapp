import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

export function mapTelecallerCustomer(raw = {}) {
  const user = raw.user || raw;
  const membership = raw.membership || raw.active_membership || raw.activeMembership || {};
  const stats = raw.stats || {};

  return {
    id: raw.id || user.id,
    name: raw.name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || 'Customer',
    email: raw.email || user.email || '',
    phone: raw.phone || user.phone || raw.mobile || user.mobile || '',
    city: raw.city?.name || raw.city || user.city?.name || user.city || '',
    state: raw.state?.name || raw.state || user.state?.name || user.state || '',
    country: raw.country?.name || raw.country || user.country?.name || user.country || 'India',
    nriCountry: raw.nri_country || user.nri_country || raw.nriCountry || null,
    isNri: raw.is_nri ?? user.is_nri ?? Boolean(raw.nri_country || user.nri_country),
    membershipStatus: raw.membership_status || user.membership_status || membership.status || 'none',
    membershipPlan: raw.membership_plan || membership.plan_name || membership.plan?.name || null,
    hasActiveMembership: raw.has_active_membership ?? (raw.membership_status === 'active' || membership.status === 'active'),
    isMine: Boolean(raw.is_mine ?? raw.is_my_customer ?? raw.mine),
    assignedTelecaller: raw.assigned_telecaller || raw.telecaller || null,
    propertiesCount: num(raw.properties_count ?? stats.properties ?? (Array.isArray(raw.properties) ? raw.properties.length : 0)),
    familyCount: num(raw.family_count ?? raw.family_members_count ?? stats.family ?? (Array.isArray(raw.family_members) ? raw.family_members.length : 0)),
    requestsCount: num(raw.requests_count ?? raw.service_requests_count ?? stats.requests ?? (Array.isArray(raw.requests) ? raw.requests.length : 0)),
    joinedAt: raw.created_at || raw.joined_at || user.created_at || null,
    raw,
  };
}

export function mapTelecallerCustomerDetail(raw = {}) {
  const base = mapTelecallerCustomer(raw);
  const membership = raw.membership || raw.active_membership || {};

  return {
    ...base,
    address: raw.address || raw.street || '',
    pincode: raw.pincode || '',
    membership: {
      id: membership.id,
      status: membership.status || base.membershipStatus,
      planName: membership.plan_name || membership.plan?.name || base.membershipPlan || 'None',
      price: num(membership.price || membership.amount),
      startDate: membership.start_date || membership.starts_at || null,
      endDate: membership.end_date || membership.expires_at || null,
      autoRenew: Boolean(membership.auto_renew),
    },
    familyMembers: Array.isArray(raw.family_members || raw.family)
      ? (raw.family_members || raw.family).map(f => ({
          id: f.id,
          name: f.name || `${f.first_name || ''} ${f.last_name || ''}`.trim() || 'Family Member',
          relation: f.relation || f.relationship || 'Relative',
          phone: f.phone || f.mobile || '',
          email: f.email || '',
        }))
      : [],
    properties: Array.isArray(raw.properties)
      ? raw.properties.map(p => ({
          id: p.id,
          title: p.title || p.name || 'Property',
          type: p.property_type || p.type || 'Residential',
          address: p.address || '',
          city: p.city?.name || p.city || '',
          state: p.state?.name || p.state || '',
          pincode: p.pincode || '',
        }))
      : [],
    requests: Array.isArray(raw.requests || raw.service_requests)
      ? (raw.requests || raw.service_requests).map(r => ({
          id: r.id,
          ticketNumber: r.ticket_number || r.code || `#${r.id}`,
          serviceName: r.service_name || r.service?.name || 'Service',
          status: r.status || 'open',
          statusLabel: r.status_label || (r.status ? String(r.status).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Open'),
          urgency: r.urgency || 'standard',
          customerPrice: num(r.customer_price ?? r.price),
          vendorName: r.vendor?.name || r.vendor_name || null,
          createdAt: r.created_at || null,
        }))
      : [],
    callLogs: Array.isArray(raw.call_logs || raw.calls || raw.call_history)
      ? (raw.call_logs || raw.calls || raw.call_history).map(c => ({
          id: c.id,
          telecallerName: c.telecaller_name || c.agent_name || c.telecaller?.name || 'Staff',
          direction: c.direction || 'outgoing',
          status: c.status || 'completed',
          duration: c.duration ? `${c.duration}s` : null,
          title: c.title || c.subject || 'Customer Call',
          note: c.note || c.summary || c.message || null,
          createdAt: c.created_at || c.date || null,
        }))
      : [],
  };
}

/**
 * GET /api/v1/telecaller/customers
 * Fetch paginated telecaller customer list covering user's area
 */
export async function getTelecallerCustomers(params = {}) {
  try {
    const cleanParams = {};
    if (params.search) cleanParams.search = params.search;
    if (params.nri_country) cleanParams.nri_country = params.nri_country;
    if (params.membership_status && params.membership_status !== 'all') cleanParams.membership_status = params.membership_status;
    if (params.plan_id) cleanParams.plan_id = params.plan_id;
    if (params.joined_from) cleanParams.joined_from = params.joined_from;
    if (params.joined_to) cleanParams.joined_to = params.joined_to;
    if (params.mine) cleanParams.mine = 1;
    if (params.page) cleanParams.page = params.page;

    const response = await apiClient.get('/telecaller/customers', { params: cleanParams });
    const data = response.data?.data || response.data || {};
    const itemsRaw = Array.isArray(data) ? data : (data.customers || data.data || data.items || []);
    const metaRaw = response.data?.meta || data.meta || {};

    return {
      customers: itemsRaw.map(mapTelecallerCustomer),
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
 * GET /api/v1/telecaller/customers/{customer}
 * Fetch detailed profile, memberships, family, properties, requests, and latest 20 call logs
 */
export async function getTelecallerCustomerDetail(customerId) {
  try {
    const response = await apiClient.get(`/telecaller/customers/${customerId}`);
    const raw = response.data?.data?.customer || response.data?.data || response.data?.customer || response.data || {};
    return mapTelecallerCustomerDetail(raw);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
