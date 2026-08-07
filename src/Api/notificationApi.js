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
// /rm, vendors hit /vendor, everyone else is a customer.
export function notifBaseForRole(role) {
  const r = String(role || '').toLowerCase();
  if (/relationship|manager|\brm\b/.test(r)) return '/rm';
  if (/vendor/.test(r)) return '/vendor';
  return '/customer';
}

// GET {base}/notifications — paginated, newest first; unread count in meta.
export async function getNotifications({ page, unreadOnly, base = '/customer' } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    if (unreadOnly) params.unread_only = true;
    const response = await apiClient.get(`${base}/notifications`, { params });
    const list = response.data?.data || [];
    const meta = response.data?.meta || {};
    return {
      notifications: list.map(mapNotification),
      unreadCount: meta.unread_count ?? meta.unread ?? meta.unreadCount ?? 0,
      meta: {
        currentPage: meta.current_page ?? 1,
        lastPage: meta.last_page ?? 1,
        perPage: meta.per_page ?? list.length,
        total: meta.total ?? list.length,
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST {base}/notifications/{id}/read
export async function markNotificationRead(id, base = '/customer') {
  try {
    const response = await apiClient.post(`${base}/notifications/${id}/read`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST {base}/notifications/read-all
export async function markAllNotificationsRead(base = '/customer') {
  try {
    const response = await apiClient.post(`${base}/notifications/read-all`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET {base}/notification-preferences — channel on/off flags. Role-scoped:
// pass notifBaseForRole(role) for RM (/rm) or vendor (/vendor); customer default.
export async function getNotificationPreferences(base = '/customer') {
  try {
    const response = await apiClient.get(`${base}/notification-preferences`);
    const d = response.data?.data || response.data || {};
    return { app: !!d.app, whatsapp: !!d.whatsapp, email: !!d.email, sms: !!d.sms };
  } catch (error) {
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
    throw normalizeApiError(error);
  }
}
