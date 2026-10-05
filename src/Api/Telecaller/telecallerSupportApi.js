import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

function mapAuthor(raw = {}) {
  if (!raw) return null;
  return {
    id: raw.id,
    name: raw.name || 'User',
    email: raw.email || '',
    phone: raw.phone || '',
    avatar: raw.avatar || raw.profile_photo_url || null,
    role: raw.role || raw.type || '',
  };
}

function mapReply(raw = {}) {
  const isInternal = Boolean(raw.is_internal || raw.internal);
  const senderType = raw.sender_type || raw.sender || (raw.is_telecaller ? 'telecaller' : (raw.is_customer ? 'customer' : 'staff'));
  const isTelecaller = Boolean(raw.is_telecaller || senderType === 'telecaller' || raw.from_telecaller);
  const isCustomer = Boolean(raw.is_customer || senderType === 'customer' || raw.from_customer);

  return {
    id: raw.id,
    message: raw.message || raw.body || raw.content || '',
    isInternal,
    senderType,
    isTelecaller,
    isCustomer,
    authorName: raw.author_name || raw.author?.name || raw.sender_name || (isCustomer ? 'Customer' : 'Telecaller'),
    authorAvatar: raw.author_avatar || raw.author?.avatar || null,
    authorId: raw.author_id || raw.author?.id || null,
    createdAt: raw.created_at || raw.date || null,
    raw,
  };
}

export function mapSupportTicket(raw = {}) {
  const repliesRaw = Array.isArray(raw.replies) ? raw.replies : (raw.thread || []);
  const reqRaw = raw.request || raw.service_request || null;

  return {
    id: raw.id,
    ticketNumber: raw.ticket_number || raw.ticket_id || (raw.id ? `#${raw.id}` : ''),
    subject: raw.subject || raw.title || raw.topic || 'Support Chat',
    status: raw.status || 'open',
    category: raw.category || 'general',
    unreadCount: num(raw.unread_count ?? raw.unread ?? 0),
    lastMessage: raw.last_message || raw.latest_message || raw.message || '',
    lastMessageAt: raw.last_message_at || raw.updated_at || raw.created_at || null,
    createdAt: raw.created_at || null,
    canReply: raw.can_reply !== false && !['resolved', 'closed'].includes(String(raw.status || '').toLowerCase()),
    isClosed: ['resolved', 'closed'].includes(String(raw.status || '').toLowerCase()),
    customer: mapAuthor(raw.customer || raw.user),
    request: reqRaw ? {
      id: reqRaw.id,
      ticketNumber: reqRaw.ticket_number || reqRaw.ticketNumber || `#${reqRaw.id}`,
      serviceName: reqRaw.service_name || reqRaw.service?.name || '',
      status: reqRaw.status || 'open',
    } : null,
    replies: repliesRaw.map(mapReply),
    raw,
  };
}

/**
 * GET /api/v1/telecaller/support-tickets
 * Support Chats I can reply to (paginated, newest first)
 */
export async function getTelecallerSupportTickets(params = {}) {
  try {
    const cleanParams = {};
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.category && params.category !== 'all') cleanParams.category = params.category;
    if (params.page) cleanParams.page = params.page;

    const response = await apiClient.get('/telecaller/support-tickets', { params: cleanParams });
    const data = response.data?.data || response.data || {};
    const itemsRaw = Array.isArray(data) ? data : (data.tickets || data.data || data.items || []);
    const metaRaw = response.data?.meta || data.meta || {};

    return {
      tickets: itemsRaw.map(mapSupportTicket),
      meta: {
        currentPage: num(metaRaw.current_page || 1),
        lastPage: num(metaRaw.last_page || 1),
        total: num(metaRaw.total || itemsRaw.length),
        perPage: num(metaRaw.per_page || 15),
        unreadTotal: num(metaRaw.unread_total ?? metaRaw.unread_count ?? 0),
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * GET /api/v1/telecaller/custom-plans
 * Custom plan requests I can see (paginated)
 */
export async function getTelecallerCustomPlans(params = {}) {
  try {
    const cleanParams = {};
    if (params.status && params.status !== 'all') cleanParams.status = params.status;
    if (params.page) cleanParams.page = params.page;

    const response = await apiClient.get('/telecaller/custom-plans', { params: cleanParams });
    const data = response.data?.data || response.data || {};
    const itemsRaw = Array.isArray(data) ? data : (data.custom_plans || data.plans || data.data || data.items || []);
    const metaRaw = response.data?.meta || data.meta || {};

    return {
      customPlans: itemsRaw.map(mapSupportTicket),
      meta: {
        currentPage: num(metaRaw.current_page || 1),
        lastPage: num(metaRaw.last_page || 1),
        total: num(metaRaw.total || itemsRaw.length),
        perPage: num(metaRaw.per_page || 15),
        unreadTotal: num(metaRaw.unread_total ?? metaRaw.unread_count ?? 0),
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * GET /api/v1/telecaller/support-tickets/{ticket}
 * A chat with its full thread (includes internal notes); opening it marks it read
 * peek: 1 = poll for new messages without marking the chat read
 */
export async function getTelecallerSupportTicketDetail(ticketId, options = {}) {
  try {
    const params = {};
    if (options.peek) params.peek = 1;

    const response = await apiClient.get(`/telecaller/support-tickets/${ticketId}`, { params });
    const data = response.data?.data || response.data || {};

    const ticket = mapSupportTicket(data.ticket || data);
    const repliesRaw = Array.isArray(data.replies)
      ? data.replies
      : (Array.isArray(data.thread) ? data.thread : ticket.replies);

    return {
      ticket,
      replies: repliesRaw.map(mapReply),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * POST /api/v1/telecaller/support-tickets/{ticket}/reply
 * Reply in a chat (optionally as an internal note the customer cannot see)
 */
export async function replyTelecallerSupportTicket(ticketId, payload = {}) {
  try {
    const response = await apiClient.post(`/telecaller/support-tickets/${ticketId}/reply`, {
      message: payload.message || payload.reply || '',
      is_internal: Boolean(payload.is_internal || payload.isInternal),
    });
    const data = response.data?.data || response.data || {};
    const ticket = mapSupportTicket(data.ticket || data);
    const replyRaw = data.reply || null;

    return {
      ticket,
      reply: replyRaw ? mapReply(replyRaw) : null,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
