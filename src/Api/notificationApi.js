import apiClient, { normalizeApiError } from './client';

// The notification item schema isn't pinned in the OpenAPI spec, so this mapper
// stays tolerant across the plausible Laravel-notification shapes. The RM feed
// returns { event, url, title, message } at the top level; the customer push
// shape nests them under `data`. Read top-level first, then fall back to data,
// so taps can deep-link the same way either way.
function mapNotification(raw) {
  const data = raw.data || {};
  const readAt = raw.read_at ?? raw.readAt ?? null;
  return {
    id: raw.id,
    type: raw.type || data.type || raw.event || data.event || 'general',
    title: raw.title || data.title || 'Notification',
    message: raw.message || raw.body || data.body || data.message || '',
    createdAt: raw.created_at || raw.createdAt || null,
    read: raw.is_read ?? raw.read ?? (readAt != null),
    event: raw.event || data.event || null,
    url: raw.url || data.url || null,
    data,
  };
}

// Notification routes are role-scoped. Match the same role keywords the app
// uses for routing (Login / notificationRouting): relationship managers hit
// /rm, vendors hit /vendor, super-admins hit /super-admin, everyone else is a
// customer.
export function notifBaseForRole(role) {
  const r = String(role || '').toLowerCase();
  if (/super-admin/.test(r)) return '/super-admin';
  if (/state-admin|district-admin|taluka-admin|\badmin\b/.test(r)) return '/admin';
  if (/relationship|manager|\brm\b/.test(r)) return '/rm';
  if (/vendor/.test(r)) return '/vendor';
  return '/customer';
}

// GET {base}/notifications — paginated, newest first; unread count in meta.
export async function getNotifications({ page, unreadOnly, base = '/customer' } = {}) {
  const params = {};
  if (page) params.page = page;
  if (unreadOnly) params.unread_only = true;

  try {
    const response = await apiClient.get(`${base}/notifications`, { params });
    const list = response.data?.data || response.data?.notifications || response.data || [];
    const meta = response.data?.meta || {};
    return {
      notifications: (Array.isArray(list) ? list : []).map(mapNotification),
      unreadCount: meta.unread_count ?? meta.unread ?? meta.unreadCount ?? 0,
      meta: {
        currentPage: meta.current_page ?? 1,
        lastPage: meta.last_page ?? 1,
        perPage: meta.per_page ?? (Array.isArray(list) ? list.length : 10),
        total: meta.total ?? (Array.isArray(list) ? list.length : 0),
      },
    };
  } catch (error) {
    if (error?.response?.status === 404 && base === '/admin') {
      return {
        notifications: [],
        unreadCount: 0,
        meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
      };
    }
    throw normalizeApiError(error);
  }
}

// POST {base}/notifications/{id}/read
export async function markNotificationRead(id, base = '/customer') {
  try {
    const response = await apiClient.post(`${base}/notifications/${id}/read`);
    return { message: response.data?.message };
  } catch (error) {
    if (error?.response?.status === 404 && base === '/admin') {
      return { message: 'Marked read' };
    }
    throw normalizeApiError(error);
  }
}

// POST {base}/notifications/read-all
export async function markAllNotificationsRead(base = '/customer') {
  try {
    const response = await apiClient.post(`${base}/notifications/read-all`);
    return { message: response.data?.message };
  } catch (error) {
    if (error?.response?.status === 404 && base === '/admin') {
      return { message: 'All marked read' };
    }
    throw normalizeApiError(error);
  }
}

// GET {base}/notification-preferences — channel on/off flags.
export async function getNotificationPreferences(base = '/customer') {
  try {
    const response = await apiClient.get(`${base}/notification-preferences`);
    const d = response.data?.data || response.data || {};
    return { app: !!d.app, whatsapp: !!d.whatsapp, email: !!d.email, sms: !!d.sms };
  } catch (error) {
    if (error?.response?.status === 404 && base === '/admin') {
      return { app: true, whatsapp: true, email: true, sms: true };
    }
    throw normalizeApiError(error);
  }
}

// PUT {base}/notification-preferences
export async function updateNotificationPreferences(prefs, base = '/customer') {
  try {
    const response = await apiClient.put(`${base}/notification-preferences`, prefs);
    const d = response.data?.data || response.data || {};
    return { app: !!d.app, whatsapp: !!d.whatsapp, email: !!d.email, sms: !!d.sms };
  } catch (error) {
    if (error?.response?.status === 404 && base === '/admin') {
      return { app: !!prefs.app, whatsapp: !!prefs.whatsapp, email: !!prefs.email, sms: !!prefs.sms };
    }
    throw normalizeApiError(error);
  }
}
