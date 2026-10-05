import apiClient, { normalizeApiError } from '../client';

function mapPlan(raw) {
  const p = raw?.plan;
  if (!p) return null;
  return typeof p === 'object' ? (p.name || null) : p;
}

// One row in the super-admin's org-wide customer list.
export function mapCustomer(raw = {}) {
  const plan = mapPlan(raw);
  const hasActiveMembership = !!raw.has_active_membership;
  const rawStatus = String(raw.membership_status || '').toLowerCase();
  let membershipStatus = 'none';
  if (hasActiveMembership || rawStatus === 'active') membershipStatus = 'active';
  else if (rawStatus === 'pending' || plan) membershipStatus = 'pending';
  else if (rawStatus === 'expired') membershipStatus = 'expired';
  else if (rawStatus === 'never') membershipStatus = 'none';

  return {
    id: raw.id,
    name: raw.name || '',
    email: raw.email || '',
    phone: raw.phone || '',
    nriCountry: raw.nri_country || null,
    nriCity: raw.nri_city || null,
    location: [raw.nri_city, raw.nri_country].filter(Boolean).join(', ') || null,
    plan,
    hasActiveMembership,
    membershipExpiresAt: raw.membership_expires_at || null,
    membershipStatus,
    rawMembershipStatus: raw.membership_status || null,
    familyMembersCount: raw.family_members_count ?? 0,
    propertiesCount: raw.properties_count ?? 0,
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

// GET /super-admin/customers — org-wide customer list. `search` matches
// name/email/phone, `nriCountry` filters by country, `membershipStatus` is
// one of active|pending|none. Paginated.
export async function getAdminCustomers({ search, nriCountry, membershipStatus, page } = {}) {
  try {
    const params = {};
    if (search) params.search = search;
    if (nriCountry) params.nri_country = nriCountry;
    if (membershipStatus) params.membership_status = membershipStatus;
    if (page) params.page = page;
    const response = await apiClient.get('/super-admin/customers', { params });
    const list = response.data?.data || [];
    return { customers: list.map(mapCustomer), meta: mapMeta(response, list.length) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
