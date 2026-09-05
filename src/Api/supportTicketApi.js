import apiClient, { normalizeApiError } from './client';

// The "Raise Ticket to" options. The list endpoint only surfaces categories
// that already exist on the customer's tickets (the index query hardcodes/
// excludes nothing) — so a brand-new category like `vendor` or `telecaller`
// never appears in the response until someone has created one. This is the
// full catalog the backend supports, always shown so the customer can pick
// any of them.
// NOTE: 'custom_plan' was removed here — Customize Plan is its own section
// now (see customPlanApi.js / GET/POST /customer/custom-plans), not a
// support-ticket category. POST /customer/support-tickets 422s on
// category: "custom_plan" as of the breaking change that split it out.
export const DEFAULT_SUPPORT_CATEGORIES = [
  { value: 'general', label: 'General Support' },
  { value: 'rm', label: 'Relationship Manager' },
  { value: 'vendor', label: 'Vendor' },
  { value: 'telecaller', label: 'Telecaller' },
];

function normalizeCategory(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') return { value: raw, label: raw };
  const value = raw.value ?? raw.category ?? raw.key ?? raw.id;
  if (value == null) return null;
  const label = raw.label ?? raw.category_label ?? raw.name ?? raw.title ?? value;
  return { value: String(value), label: String(label) };
}

// GET /customer/support-tickets/categories — the authoritative "Raise Ticket
// to" catalog (mirrors App\Enums\SupportTicketCategory). Not paginated; safe
// to cache client-side. Falls back to the built-in defaults on any error.
export async function getSupportTicketCategories() {
  try {
    const response = await apiClient.get('/customer/support-tickets/categories');
    const list = response.data?.data || [];
    const mapped = list.map(normalizeCategory).filter(Boolean);
    return mapped.length ? mapped : [...DEFAULT_SUPPORT_CATEGORIES];
  } catch (error) {
    throw normalizeApiError(error);
  }
}

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
    category: raw.category || null,
    categoryLabel: raw.category_label || null,
    // Where a Custom Plan would take place (only present on custom_plan tickets).
    state: raw.state ? { id: raw.state.id, name: raw.state.name } : null,
    city: raw.city ? { id: raw.city.id, name: raw.city.name } : null,
    status: raw.status,
    statusLabel: raw.status_label || raw.status,
    escalated: !!raw.escalated,
    createdAt: raw.created_at,
    unreadRepliesCount: raw.unread_replies_count ?? raw.unread_count ?? 0,
  };
}

// Admin replies (esp. Custom Plan proposals) come back as rich HTML
// (e.g. "<p>new service&nbsp;</p>"); flatten to plain text for the chat bubble.
function stripHtml(str) {
  if (!str) return str;
  return String(str)
    .replace(/<\/(p|div|br|li)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{2,}/g, '\n')
    .trim();
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
    message: stripHtml(raw.message || raw.body),
    createdAt: raw.created_at,
    // Custom Plan proposal fields: a support/admin reply can propose a price the
    // customer then accepts ("Request This Plan"), converting it to a payable job.
    proposedPrice: raw.proposed_price ?? null,
    canAcceptPlan: !!raw.can_accept_plan,
    convertedTicket: raw.converted_ticket ?? null,
    // Google Meet link for a scheduled call — only ever set by staff on Custom
    // Plan tickets (never on general support tickets), and only on the one
    // reply where they scheduled the call. Null on every other reply.
    meetLink: raw.meet_link ?? null,
    meetScheduledAt: raw.meet_scheduled_at ?? null,
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
// request. `category=custom_plan` routes it through the Custom Plan flow,
// which additionally requires state_id + city_id (where the plan takes place,
// so the backend can check vendor availability there).
export async function createSupportTicket({ subject, message, ticketId, category, stateId, cityId }) {
  try {
    const response = await apiClient.post('/customer/support-tickets', {
      subject,
      message,
      ticket_id: ticketId || undefined,
      category: category || undefined,
      state_id: stateId || undefined,
      city_id: cityId || undefined,
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

// POST /customer/support-tickets/{ticket}/replies/{reply}/accept-plan — accepts
// the custom-plan price proposed in that reply and converts the proposal into a
// payable job.
export async function acceptCustomPlan(ticketId, replyId) {
  try {
    const response = await apiClient.post(`/customer/support-tickets/${ticketId}/replies/${replyId}/accept-plan`);
    const data = response.data?.data || {};
    return { ...data, message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
