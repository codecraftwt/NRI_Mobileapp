import apiClient, { normalizeApiError } from './client';

export function mapTelecallerData(raw) {
  if (!raw) {
    return {
      telecaller: null,
      pendingCallback: null,
      options: { topics: [], preferredTimes: [] },
    };
  }

  const telecaller = raw.telecaller ? {
    id: raw.telecaller.id,
    name: raw.telecaller.name,
    phone: raw.telecaller.phone || null,
    whatsappNumber: raw.telecaller.whatsapp_number || null,
    photoUrl: raw.telecaller.photo_url || null,
    availableHours: raw.telecaller.available_hours || null,
  } : null;

  const pendingCallback = raw.pending_callback ? {
    id: raw.pending_callback.id,
    topic: raw.pending_callback.topic,
    topicLabel: raw.pending_callback.topic_label || raw.pending_callback.topic,
    preferredTime: raw.pending_callback.preferred_time || null,
    phone: raw.pending_callback.phone || null,
    status: raw.pending_callback.status || 'pending',
    requestedAt: raw.pending_callback.requested_at,
  } : null;

  const options = {
    topics: (raw.options?.topics || []).map(t => ({
      value: t.value ?? t.id ?? String(t),
      label: t.label ?? t.name ?? String(t),
    })),
    preferredTimes: (raw.options?.preferred_times || []).map(p => ({
      value: p.value ?? p.id ?? String(p),
      label: p.label ?? p.name ?? String(p),
    })),
  };

  return { telecaller, pendingCallback, options };
}

export async function getTelecallerInfo() {
  try {
    const response = await apiClient.get('/customer/telecaller');
    return mapTelecallerData(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function requestTelecallerCallback(payload) {
  try {
    const response = await apiClient.post('/customer/telecaller/callback', {
      topic: payload.topic,
      preferred_time: payload.preferred_time || payload.preferredTime,
      phone: payload.phone,
      message: payload.message,
    });
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export { getTelecallerDashboard, mapTelecallerDashboardData } from './Telecaller/telecallerDashboardApi';
