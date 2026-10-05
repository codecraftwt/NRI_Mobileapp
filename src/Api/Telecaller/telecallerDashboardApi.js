import apiClient, { normalizeApiError } from '../client';

function num(v) {
  if (v == null || isNaN(v)) return 0;
  return Number(v);
}

export function mapTelecallerDashboardData(raw = {}) {
  const statsRaw = raw.stats || {};
  const callsRaw = raw.calls || {};
  const areaRaw = raw.area || {};

  return {
    stats: {
      chatsAwaitingReply: num(statsRaw.chats_awaiting_reply ?? statsRaw.chatsAwaitingReply ?? statsRaw.awaiting_reply),
      chatsAwaitingCustomer: num(statsRaw.chats_awaiting_customer ?? statsRaw.chatsAwaitingCustomer ?? statsRaw.awaiting_customer),
      totalRequests: num(statsRaw.total_requests ?? statsRaw.requests ?? statsRaw.service_requests ?? statsRaw.open_requests),
      openRequests: num(statsRaw.open_requests ?? statsRaw.openRequests ?? statsRaw.active_requests),
      customers: num(statsRaw.customers ?? statsRaw.total_customers ?? statsRaw.customer_count),
      vendors: num(statsRaw.vendors ?? statsRaw.total_vendors ?? statsRaw.vendor_count),
      ...statsRaw,
    },
    calls: {
      total: num(callsRaw.total ?? callsRaw.total_calls ?? callsRaw.today ?? callsRaw.count),
      connected: num(callsRaw.connected ?? callsRaw.completed ?? callsRaw.attended),
      pending: num(callsRaw.pending ?? callsRaw.queued ?? callsRaw.scheduled),
      missed: num(callsRaw.missed ?? callsRaw.unanswered),
      duration: callsRaw.duration ?? callsRaw.total_duration ?? null,
      ...callsRaw,
    },
    unreadChats: num(raw.unread_chats ?? raw.unreadChats ?? statsRaw.unread_chats),
    area: {
      unrestricted: Boolean(areaRaw.unrestricted ?? (areaRaw.is_unrestricted || !areaRaw.name)),
      name: areaRaw.name || areaRaw.city_name || areaRaw.district_name || (areaRaw.unrestricted ? 'All Areas (Unrestricted)' : 'Assigned Area'),
      city: areaRaw.city || areaRaw.city_name || null,
      district: areaRaw.district || areaRaw.district_name || null,
      state: areaRaw.state || areaRaw.state_name || null,
      ...areaRaw,
    },
    awaitingChats: Array.isArray(raw.awaiting_chats)
      ? raw.awaiting_chats.map((c, i) => ({
          id: String(c.id ?? c.chat_id ?? i),
          customerName: c.customer_name || c.customer?.name || c.name || 'Customer',
          customerPhone: c.customer_phone || c.phone || c.customer?.phone || null,
          lastMessage: c.last_message || c.message || c.latest_message || 'Waiting for reply',
          lastMessageAt: c.last_message_at || c.updated_at || c.created_at || null,
          unread: Boolean(c.unread ?? c.unread_count > 0),
          unreadCount: num(c.unread_count),
          topic: c.topic || c.subject || null,
          raw: c,
        }))
      : [],
    linkedRequests: Array.isArray(raw.linked_requests)
      ? raw.linked_requests.map((r, i) => ({
          id: String(r.id ?? i),
          ticketNumber: r.ticket_number || r.ticket || r.reference_number || `#${r.id || i + 1}`,
          customerName: r.customer_name || r.customer?.name || 'Customer',
          customerPhone: r.customer_phone || r.phone || null,
          serviceName: r.service_name || r.service?.name || r.title || 'Service Request',
          status: r.status || 'open',
          priority: r.priority || 'normal',
          createdAt: r.created_at || r.requested_at || null,
          raw: r,
        }))
      : [],
    raw,
  };
}

/**
 * GET /api/v1/telecaller/dashboard
 * Telecaller home - chat and request counts, today's calls, what needs attention
 */
export async function getTelecallerDashboard() {
  try {
    const response = await apiClient.get('/telecaller/dashboard');
    const raw = response.data?.data || response.data || {};
    return mapTelecallerDashboardData(raw);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
