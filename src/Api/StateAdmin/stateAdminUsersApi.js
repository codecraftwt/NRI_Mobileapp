import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

// Map user item from GET /api/v1/admin/users and GET /api/v1/admin/users/{user}.
// District Admin detail records carry their jurisdiction as
// `assigned_districts`: [{ id, name, state: { id, name } }] — districts can
// span multiple states, so this is intentionally not tied to a single top-level
// state_id. Fall back to a flat district_ids array in case some endpoint/role
// still sends that instead.
export function mapStateAdminUser(raw = {}) {
  const rolesList = Array.isArray(raw.roles)
    ? raw.roles.map(r => (typeof r === 'string' ? r : (r.name || r.slug || '')))
    : (raw.role ? [raw.role] : []);

  const primaryRole = rolesList[0] || raw.role || 'customer';

  const assignedDistricts = Array.isArray(raw.assigned_districts) ? raw.assigned_districts : [];

  return {
    id: raw.id,
    name: raw.name || 'User',
    email: raw.email || '',
    phone: raw.phone || raw.contact_phone || '',
    role: primaryRole,
    roles: rolesList,
    roleLabel: raw.role_label || raw.roleName || primaryRole.replace(/-/g, ' ').toUpperCase(),
    isActive: raw.is_active !== false && raw.status !== 'inactive' && raw.status !== 'deleted',
    status: (raw.status || (raw.is_active === false ? 'inactive' : 'active')).toLowerCase(),
    stateId: raw.state?.id || raw.state_id || null,
    cityId: raw.city?.id || raw.city_id || null,
    stateName: raw.state?.name || raw.state_name || (typeof raw.state === 'string' ? raw.state : null),
    cityName: raw.city?.name || raw.city_name || (typeof raw.city === 'string' ? raw.city : null),
    stateIds: Array.isArray(raw.state_ids) ? raw.state_ids : [],
    districtIds: assignedDistricts.length ? assignedDistricts.map(d => d.id) : (Array.isArray(raw.district_ids) ? raw.district_ids : []),
    districts: assignedDistricts.map(d => ({
      id: d.id,
      name: d.name,
      stateId: d.state?.id || null,
      stateName: d.state?.name || null,
    })),
    talukaIds: Array.isArray(raw.taluka_ids) ? raw.taluka_ids : [],
    categoryIds: Array.isArray(raw.category_ids) ? raw.category_ids : [],
    geoCoverage: raw.geo_coverage || raw.coverage || null,
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
  };
}

// GET /api/v1/admin/users
// staff/admin/customer accounts - searchable, filterable by role/status
export async function getStateAdminUsers({
  search,
  role,
  status,
  perPage = 15,
  page = 1,
} = {}) {
  try {
    const params = {};
    if (search && search.trim()) params.search = search.trim();
    if (role && role !== 'all') params.role = role;
    if (status && status !== 'all') params.status = status;
    if (perPage) params.per_page = perPage;
    if (page) params.page = page;

    const response = await apiClient.get('/admin/users', { params });
    const payload = response.data?.data || response.data?.users || response.data || [];
    const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);

    return {
      users: list.map(mapStateAdminUser),
      meta: mapMeta(response, list.length),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /api/v1/admin/users/assignable-roles
// roles this caller is allowed to assign
export async function getUserAssignableRoles() {
  try {
    const response = await apiClient.get('/admin/users/assignable-roles');
    const payload = response.data?.data || response.data || [];
    const list = Array.isArray(payload) ? payload : [];
    return list.map(r => ({
      name: r.name || r.id || r.value || String(r),
      label: r.label || r.title || r.name || String(r),
    }));
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /api/v1/admin/users/region-scope
// states this admin may place an operations team member in
export async function getUserRegionScope() {
  try {
    const response = await apiClient.get('/admin/users/region-scope');
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

// GET /api/v1/admin/users/{user}
// Full account detail, including geo coverage
export async function getStateAdminUserDetail(userId) {
  try {
    const response = await apiClient.get(`/admin/users/${userId}`);
    const data = response.data?.data || response.data?.user || response.data || {};
    return mapStateAdminUser(data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /api/v1/admin/users
// create a staff/admin/customer account
export async function createStateAdminUser({
  name,
  email,
  phone,
  password,
  passwordConfirmation,
  role,
  isActive = true,
  stateId,
  cityId,
  stateIds,
  districtIds,
  talukaIds,
  categoryIds,
} = {}) {
  try {
    const body = {
      name,
      email,
      phone: phone || undefined,
      password,
      password_confirmation: passwordConfirmation,
      role,
      is_active: isActive !== false,
      state_id: stateId ? Number(stateId) : undefined,
      city_id: cityId ? Number(cityId) : undefined,
      state_ids: Array.isArray(stateIds) && stateIds.length > 0 ? stateIds.map(Number) : undefined,
      district_ids: Array.isArray(districtIds) && districtIds.length > 0 ? districtIds.map(Number) : undefined,
      taluka_ids: Array.isArray(talukaIds) && talukaIds.length > 0 ? talukaIds.map(Number) : undefined,
      category_ids: Array.isArray(categoryIds) && categoryIds.length > 0 ? categoryIds.map(Number) : undefined,
    };

    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    const response = await apiClient.post('/admin/users', body);
    const data = response.data?.data || response.data?.user || response.data || {};
    return {
      user: mapStateAdminUser(data),
      message: response.data?.message || 'User account created successfully.',
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// PUT /api/v1/admin/users/{user}
// update a staff/admin/customer account
export async function updateStateAdminUser(userId, {
  name,
  email,
  phone,
  password,
  passwordConfirmation,
  role,
  isActive,
  stateId,
  cityId,
  stateIds,
  districtIds,
  talukaIds,
  categoryIds,
} = {}) {
  try {
    const body = {
      name,
      email,
      phone: phone || undefined,
      password: password ? password : undefined,
      password_confirmation: password ? passwordConfirmation : undefined,
      role,
      is_active: isActive !== undefined ? isActive : undefined,
      state_id: stateId !== undefined ? (stateId ? Number(stateId) : null) : undefined,
      city_id: cityId !== undefined ? (cityId ? Number(cityId) : null) : undefined,
      state_ids: Array.isArray(stateIds) ? stateIds.map(Number) : undefined,
      district_ids: Array.isArray(districtIds) ? districtIds.map(Number) : undefined,
      taluka_ids: Array.isArray(talukaIds) ? talukaIds.map(Number) : undefined,
      category_ids: Array.isArray(categoryIds) ? categoryIds.map(Number) : undefined,
    };

    Object.keys(body).forEach(k => body[k] === undefined && delete body[k]);

    const response = await apiClient.put(`/admin/users/${userId}`, body);
    const data = response.data?.data || response.data?.user || response.data || {};
    return {
      user: mapStateAdminUser(data),
      message: response.data?.message || 'User account updated successfully.',
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// DELETE /api/v1/admin/users/{user}
// delete a staff/admin account (soft delete)
export async function deleteStateAdminUser(userId) {
  try {
    const response = await apiClient.delete(`/admin/users/${userId}`);
    return {
      userId,
      message: response.data?.message || 'Account deleted successfully.',
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /api/v1/admin/users/{user}/restore
// restore a soft-deleted staff/admin account — super-admin only (403 otherwise)
export async function restoreStateAdminUser(userId) {
  try {
    const response = await apiClient.post(`/admin/users/${userId}/restore`);
    const data = response.data?.data || response.data?.user || response.data || {};
    return {
      userId,
      user: data?.id ? mapStateAdminUser(data) : null,
      message: response.data?.message || 'Account restored successfully.',
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /api/v1/admin/users/{user}/toggle
// toggle a staff/admin account's active/inactive status
export async function toggleStateAdminUserStatus(userId) {
  try {
    const response = await apiClient.post(`/admin/users/${userId}/toggle`);
    const data = response.data?.data || response.data?.user || response.data || {};
    return {
      userId,
      user: data?.id ? mapStateAdminUser(data) : null,
      message: response.data?.message || 'Account status updated successfully.',
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
