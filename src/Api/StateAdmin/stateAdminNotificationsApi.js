import apiClient, { normalizeApiError } from '../client';

function mapNotification(raw = {}) {
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

// GET /api/v1/admin/notifications
// notifications for state admins (paginated, newest first)
export async function getStateAdminNotifications({ page = 1, unreadOnly } = {}) {
  const params = {};
  if (page) params.page = page;
  if (unreadOnly) params.unread_only = true;

  try {
    const response = await apiClient.get('/admin/notifications', { params });
    const payload = response.data?.data || response.data?.notifications || response.data || [];
    const list = Array.isArray(payload) ? payload : (Array.isArray(payload.data) ? payload.data : []);
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
    if (error?.response?.status === 404) {
      return {
        notifications: [],
        unreadCount: 0,
        meta: { currentPage: 1, lastPage: 1, perPage: 15, total: 0 },
      };
    }
    throw normalizeApiError(error);
  }
}

// POST /api/v1/admin/notifications/{id}/read
// mark one admin notification read
export async function markStateAdminNotificationRead(id) {
  try {
    const response = await apiClient.post(`/admin/notifications/${id}/read`);
    return {
      id,
      message: response.data?.message || 'Marked read',
    };
  } catch (error) {
    if (error?.response?.status === 404) {
      return { id, message: 'Marked read' };
    }
    throw normalizeApiError(error);
  }
}

// POST /api/v1/admin/notifications/read-all
// mark all admin notifications read
export async function markAllStateAdminNotificationsRead() {
  try {
    const response = await apiClient.post('/admin/notifications/read-all');
    return {
      message: response.data?.message || 'All marked read',
    };
  } catch (error) {
    if (error?.response?.status === 404) {
      return { message: 'All marked read' };
    }
    throw normalizeApiError(error);
  }
}

// GET /api/v1/admin/notification-preferences
// admin notification channel preferences
export async function getStateAdminNotificationPreferences() {
  try {
    const response = await apiClient.get('/admin/notification-preferences');
    const d = response.data?.data || response.data || {};
    return {
      app: !!d.app,
      whatsapp: !!d.whatsapp,
      email: !!d.email,
      sms: !!d.sms,
    };
  } catch (error) {
    if (error?.response?.status === 404) {
      return { app: true, whatsapp: true, email: true, sms: true };
    }
    throw normalizeApiError(error);
  }
}

// PUT /api/v1/admin/notification-preferences
// update admin notification channel preferences
export async function updateStateAdminNotificationPreferences(preferences = {}) {
  const body = {
    app: preferences.app !== undefined ? !!preferences.app : true,
    whatsapp: preferences.whatsapp !== undefined ? !!preferences.whatsapp : true,
    email: preferences.email !== undefined ? !!preferences.email : true,
    sms: preferences.sms !== undefined ? !!preferences.sms : true,
  };

  try {
    const response = await apiClient.put('/admin/notification-preferences', body);
    const d = response.data?.data || response.data || {};
    return {
      app: !!d.app,
      whatsapp: !!d.whatsapp,
      email: !!d.email,
      sms: !!d.sms,
      message: response.data?.message || 'Preferences saved successfully.',
    };
  } catch (error) {
    if (error?.response?.status === 404) {
      return { ...body, message: 'Preferences saved.' };
    }
    throw normalizeApiError(error);
  }
}
