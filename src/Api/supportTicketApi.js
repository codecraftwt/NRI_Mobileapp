import apiClient, { normalizeApiError } from './client';

// Field names for GET list/detail responses aren't in the backend's OpenAPI
// schema (descriptions only, no response `content`), so these mappers stay
// tolerant across a couple of plausible snake_case shapes rather than
// asserting one, consistent with mapTicket() in ticketApi.js.
export function mapSupportTicket(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    ticketNumber: raw.ticket_number,
    subject: raw.subject,
    status: raw.status,
    statusLabel: raw.status_label || raw.status,
    createdAt: raw.created_at,
    unreadRepliesCount: raw.unread_replies_count ?? raw.unread_count ?? 0,
  };
}

// Decide whether a reply is from the customer (right side, like WhatsApp) or
// from support/admin (left side). The backend's sender field varies — an
// explicit boolean, a plain type ('customer'/'admin'/'agent'), or an Eloquent
// morph class ('App\\Models\\User' vs 'App\\Models\\Admin') — so classify
// tolerantly: explicit flags first, then anything staff-like is NOT the
// customer, and customer/user-like is.
function isCustomerSender(raw) {
  if (raw.is_customer != null) return !!raw.is_customer;
  if (raw.is_staff != null) return !raw.is_staff;
  if (raw.is_admin != null) return !raw.is_admin;
  const t = String(
    raw.sender_type || raw.author_type || raw.type || raw.sender?.type || raw.role || raw.user_type || ''
  ).toLowerCase();
  if (/admin|agent|staff|support|\brm\b|executive|team|manager/.test(t)) return false;
  if (/customer|client|member|user/.test(t)) return true;
  return false;
}

export function mapSupportReply(raw) {
  return {
    id: raw.id,
    fromCustomer: isCustomerSender(raw),
    // Raw sender identity, so the screen can also match against the logged-in
    // user when the type field alone isn't conclusive.
    senderType: raw.sender_type || raw.author_type || raw.type || raw.role || null,
    // The reply's sender is returned as a nested `user: { id, name }` object.
    authorId: raw.user?.id ?? raw.sender_id ?? raw.author_id ?? raw.user_id ?? raw.customer_id ?? raw.sender?.id ?? raw.author?.id ?? null,
    authorName: raw.user?.name || raw.sender_name || raw.author_name || raw.author?.name || raw.sender?.name || null,
    message: raw.message || raw.body,
    createdAt: raw.created_at,
  };
}

// Verified live via the backend's OpenAPI spec (GET /docs?api-docs.json):
// GET /customer/support-tickets — "My support tickets (paginated)", "Tickets
// with unread reply counts".
export async function getSupportTickets({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/customer/support-tickets', { params });
    const list = response.data?.data || [];
    return {
      tickets: list.map(mapSupportTicket),
      meta: {
        currentPage: response.data?.meta?.current_page ?? 1,
        lastPage: response.data?.meta?.last_page ?? 1,
        perPage: response.data?.meta?.per_page ?? list.length,
        total: response.data?.meta?.total ?? list.length,
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Verified live: POST /customer/support-tickets, body {subject, message,
// ticket_id?} — ticket_id optionally links this to a specific service
// request; omitted here since this form is only used for general questions.
export async function createSupportTicket({ subject, message, ticketId }) {
  try {
    const response = await apiClient.post('/customer/support-tickets', {
      subject,
      message,
      ticket_id: ticketId || undefined,
    });
    const data = response.data?.data || {};
    return {
      ticket: mapSupportTicket(data.ticket || data),
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Verified live: GET /customer/support-tickets/{ticket} — "Support ticket
// detail with reply thread" / "Ticket with non-internal replies".
export async function getSupportTicketDetail(ticketId) {
  try {
    const response = await apiClient.get(`/customer/support-tickets/${ticketId}`);
    const data = response.data?.data || response.data || {};
    const rawReplies = data.replies || data.messages || [];
    return {
      ticket: mapSupportTicket(data.ticket || data),
      replies: rawReplies.map(mapSupportReply),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Verified live: POST /customer/support-tickets/{ticket}/reply, body
// {message} — 422s with "Ticket closed / cannot reply" once resolved.
export async function replySupportTicket(ticketId, message) {
  try {
    const response = await apiClient.post(`/customer/support-tickets/${ticketId}/reply`, { message });
    const data = response.data?.data || {};
    // This endpoint is the customer replying, so the returned message is always
    // ours — force it to the right side regardless of how the API tags it.
    return { ...mapSupportReply(data.reply || data.message || data), fromCustomer: true };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Verified live: POST /customer/support-tickets/{ticket}/escalate, no body —
// 422s with "Already escalated / cannot escalate".
export async function escalateSupportTicket(ticketId) {
  try {
    const response = await apiClient.post(`/customer/support-tickets/${ticketId}/escalate`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
