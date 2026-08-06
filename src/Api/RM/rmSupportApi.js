import apiClient, { normalizeApiError } from '../client';
import { mapSupportTicket, mapSupportReply } from '../supportTicketApi';

// RM "General Support": support tickets raised by the RM's own customers, before
// they get escalated to admin. The RM can read the thread, reply, and escalate.
// These reuse the shared customer support-ticket mappers and add the RM-only
// `customer` summary (who raised the ticket) + a plain unread count.

function mapRmSupportTicket(raw = {}) {
  const base = mapSupportTicket(raw) || {};
  return {
    ...base,
    customer: raw.customer ? { id: raw.customer.id, name: raw.customer.name } : null,
    unreadCount: raw.unread_count ?? raw.unread_replies_count ?? base.unreadRepliesCount ?? 0,
  };
}

// Extend the shared reply shape with the RM-visible extras: internal (staff-only)
// notes and the Custom Plan proposal's converted job number. The Custom Plan
// price lands in `proposedPrice` from the shared mapper.
function mapRmSupportReply(raw = {}) {
  const base = mapSupportReply(raw);
  return {
    ...base,
    isInternal: !!raw.is_internal,
    convertedTicketId: raw.converted_ticket_id ?? null,
    convertedTicketNumber: raw.converted_ticket_number || null,
  };
}

function mapMeta(response, listLength) {
  const meta = response.data?.meta || {};
  return {
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
    perPage: meta.per_page ?? listLength,
    total: meta.total ?? listLength,
  };
}

// GET /rm/support-tickets — my customers' support tickets (paginated). Query: page.
export async function getRmSupportTickets({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/rm/support-tickets', { params });
    const list = response.data?.data || [];
    return { tickets: list.map(mapRmSupportTicket), meta: mapMeta(response, list.length) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /rm/support-tickets/{ticket} — ticket detail with reply thread (includes
// internal notes). 403 if it isn't one of my customers' tickets.
export async function getRmSupportTicketDetail(ticket) {
  try {
    const response = await apiClient.get(`/rm/support-tickets/${ticket}`);
    const data = response.data?.data || response.data || {};
    const ticketRaw = data.ticket || data;
    const rawReplies = ticketRaw.replies || ticketRaw.messages || data.replies || [];
    return { ticket: mapRmSupportTicket(ticketRaw), replies: rawReplies.map(mapRmSupportReply) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/support-tickets/{ticket}/reply — reply to a customer's ticket.
// Pass isInternal to post a staff-only note (hidden from the customer).
// 422 when the ticket is closed / cannot reply.
export async function replyRmSupportTicket(ticket, message, { isInternal } = {}) {
  try {
    const body = { message };
    if (isInternal) body.is_internal = true;
    const response = await apiClient.post(`/rm/support-tickets/${ticket}/reply`, body);
    const data = response.data?.data || {};
    const rawReply = data.reply || data.message || data;
    // The RM is the sender, so force the returned reply to our side of the thread.
    // Trust the requested internal flag if the echo omits it.
    return {
      reply: rawReply ? { ...mapRmSupportReply(rawReply), fromRm: true, isInternal: !!(rawReply.is_internal) || !!isInternal } : null,
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/support-tickets/{ticket}/status — change the ticket's status. Body
// { status }. Returns the updated ticket + reply thread. 403 if not one of my
// customers' tickets; 422 on an invalid status value.
export async function changeRmSupportTicketStatus(ticket, status) {
  try {
    const response = await apiClient.post(`/rm/support-tickets/${ticket}/status`, { status });
    const data = response.data?.data || {};
    const ticketRaw = data.ticket || data;
    const rawReplies = ticketRaw.replies || ticketRaw.messages || data.replies || [];
    return { ticket: mapRmSupportTicket(ticketRaw), replies: rawReplies.map(mapRmSupportReply), message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/support-tickets/{ticket}/escalate — escalate to admin.
// 422 when already escalated / cannot escalate.
export async function escalateRmSupportTicket(ticket) {
  try {
    const response = await apiClient.post(`/rm/support-tickets/${ticket}/escalate`);
    return { message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
