import apiClient, { normalizeApiError } from './client';

// The notification item schema isn't pinned in the OpenAPI spec, so this mapper
// stays tolerant across the plausible Laravel-notification shapes. `data`
// carries the push payload ({ event, url }) — the same shape the FCM handler
// uses — so taps can deep-link the same way.
function mapNotification(raw) {
  const data = raw.data || {};
  const readAt = raw.read_at ?? raw.readAt ?? null;
  return {
    id: raw.id,
    type: raw.type || data.type || data.event || 'general',
    title: raw.title || data.title || 'Notification',
    message: raw.message || raw.body || data.body || data.message || '',
    createdAt: raw.created_at || raw.createdAt || null,
    read: raw.is_read ?? raw.read ?? (readAt != null),
    event: data.event || null,
    url: data.url || null,
    data,
  };
}

// Notification routes are role-scoped. Customer routes exist today; vendor
// routes light up once the backend adds them (same shape).
export function notifBaseForRole(role) {
  return /vendor/.test(String(role || '').toLowerCase()) ? '/vendor' : '/customer';
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

// GET /customer/notification-preferences — channel on/off flags.
export async function getNotificationPreferences() {
  try {
    const response = await apiClient.get('/customer/notification-preferences');
    const d = response.data?.data || response.data || {};
    return { app: !!d.app, whatsapp: !!d.whatsapp, email: !!d.email, sms: !!d.sms };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// PUT /customer/notification-preferences
export async function updateNotificationPreferences(prefs) {
  try {
    const response = await apiClient.put('/customer/notification-preferences', prefs);
    const d = response.data?.data || response.data || {};
    return { app: !!d.app, whatsapp: !!d.whatsapp, email: !!d.email, sms: !!d.sms };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
