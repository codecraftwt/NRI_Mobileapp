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

// GET /api/v1/telecaller/notifications
// paginated, newest first; unread count in meta.
export async function getTelecallerNotifications({ page = 1, unreadOnly } = {}) {
  const params = {};
  if (page) params.page = page;
  if (unreadOnly) params.unread_only = true;

  try {
    const response = await apiClient.get('/telecaller/notifications', { params });
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

// POST /api/v1/telecaller/notifications/{id}/read
// mark one notification read
export async function markTelecallerNotificationRead(id) {
  try {
    const response = await apiClient.post(`/telecaller/notifications/${id}/read`);
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

// POST /api/v1/telecaller/notifications/read-all
// mark all notifications read
export async function markAllTelecallerNotificationsRead() {
  try {
    const response = await apiClient.post('/telecaller/notifications/read-all');
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

// GET /api/v1/telecaller/notification-preferences
// app / whatsapp / email / sms flags
export async function getTelecallerNotificationPreferences() {
  try {
    const response = await apiClient.get('/telecaller/notification-preferences');
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

// PUT /api/v1/telecaller/notification-preferences
// save preferences { app, whatsapp, email, sms }
export async function updateTelecallerNotificationPreferences(preferences = {}) {
  const body = {
    app: preferences.app !== undefined ? !!preferences.app : true,
    whatsapp: preferences.whatsapp !== undefined ? !!preferences.whatsapp : true,
    email: preferences.email !== undefined ? !!preferences.email : true,
    sms: preferences.sms !== undefined ? !!preferences.sms : true,
  };

  try {
    const response = await apiClient.put('/telecaller/notification-preferences', body);
    const d = response.data?.data || response.data || {};
    return {
      app: !!d.app,
      whatsapp: !!d.whatsapp,
      email: !!d.email,
      sms: !!d.sms,
      message: response.data?.message || 'Saved preferences',
    };
  } catch (error) {
    if (error?.response?.status === 404) {
      return { ...body, message: 'Saved preferences' };
    }
    throw normalizeApiError(error);
  }
}
