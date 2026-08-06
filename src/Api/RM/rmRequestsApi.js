import apiClient, { normalizeApiError } from '../client';
import { mapSupportTicket, mapSupportReply } from '../supportTicketApi';

// Response field names aren't fully pinned in the backend's OpenAPI schema, so
// these mappers stay tolerant across a couple of plausible snake_case shapes —
// consistent with the other RM/vendor mappers.

function pick(...vals) {
  return vals.find(v => v !== undefined && v !== null) ?? null;
}

// One row in the "my assigned service requests" list.
export function mapRequest(raw = {}) {
  return {
    id: raw.id,
    ticket: raw.ticket_number || raw.ticket?.ticket_number || (typeof raw.ticket === 'string' ? raw.ticket : '') || '',
    status: raw.status || '',
    urgency: raw.urgency || raw.priority || null,
    service: raw.service?.name || raw.service_name || (typeof raw.service === 'string' ? raw.service : '') || 'Service Request',
    customer: raw.customer_name || raw.customer?.name || (typeof raw.customer === 'string' ? raw.customer : '') || '',
    slaDeadline: raw.sla_deadline || null,
    overdue: !!raw.overdue,
    createdAt: raw.created_at || null,
  };
}

function mapNote(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? index),
    note: raw.note || raw.body || raw.message || '',
    author: raw.author?.name || raw.author_name || raw.user?.name || raw.created_by || 'You',
    createdAt: raw.created_at || null,
  };
}

function mapHistory(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? index),
    status: raw.status || raw.to_status || '',
    from: raw.from || raw.from_status || null,
    // `by` comes back as a { id, name } object in the live payload.
    by: raw.by?.name || (typeof raw.by === 'string' ? raw.by : null) || raw.changed_by || raw.user?.name || null,
    note: raw.note || raw.remark || null,
    at: raw.changed_at || raw.created_at || raw.at || null,
  };
}

const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function mapEscalation(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? index),
    ticketId: raw.ticket_id ?? raw.request_id ?? raw.ticket?.id ?? null,
    ticket: raw.ticket_number || raw.ticket?.ticket_number || (typeof raw.ticket === 'string' ? raw.ticket : '') || '',
    customer: raw.customer_name || raw.customer?.name || (typeof raw.customer === 'string' ? raw.customer : '') || '',
    reason: raw.reason || raw.issue || raw.note || '',
    escalatedTo: raw.escalated_to_name || raw.escalated_to?.name || raw.escalated_to || null,
    level: raw.level || raw.escalation_level || null,
    priority: raw.priority || raw.urgency || null,
    status: raw.status || 'Open',
    statusLabel: raw.status_label || raw.status || 'Open',
    createdAt: raw.created_at || null,
    resolvedAt: raw.resolved_at || null,
  };
}

function mapVendor(raw) {
  if (!raw) return null;
  return {
    name: raw.name || raw.business_name || null,
    contact: raw.contact || raw.contact_name || raw.contact_person || null,
    email: raw.email || null,
    phone: raw.phone || raw.mobile || raw.contact_number || raw.contact_phone || null,
    rating: raw.rating != null ? Number(raw.rating) : null,
    // The short standing tag shown next to the rating (e.g. "Top").
    ratingLabel: raw.rating_label || raw.standing || raw.tier || null,
    type: raw.type || raw.vendor_type || null,
    assignedAt: raw.assigned_at || null,
  };
}

function mapAttachment(raw, index = 0) {
  if (!raw) return null;
  if (typeof raw === 'string') return { id: String(index), name: `Attachment ${index + 1}`, url: raw };
  return {
    id: String(raw.id ?? index),
    name: raw.name || raw.file_name || raw.filename || raw.title || `Attachment ${index + 1}`,
    url: raw.url || raw.file_url || raw.path || raw.link || null,
  };
}

function mapVendorReport(raw) {
  if (!raw) return null;
  const files = raw.media || raw.attachments || raw.files || raw.documents || [];
  const status = String(raw.status || '').toLowerCase();
  const sentAt = raw.sent_to_customer_at || raw.sent_at || raw.shared_at || raw.delivered_at || null;
  const reviewed = raw.reviewed === true || raw.reviewed_at != null || status === 'reviewed' || status === 'sent';
  const sent = raw.sent === true || sentAt != null || status === 'sent';
  return {
    // The report's own id — needed to review/send it via the /rm/reports endpoints.
    id: raw.id ?? null,
    text: raw.report_text || raw.text || raw.report || raw.body || raw.summary || raw.notes || '',
    submittedAt: raw.submitted_at || raw.created_at || null,
    submittedBy: raw.submitted_by?.name || raw.submitted_by || raw.vendor_name || raw.vendor?.name || raw.by?.name || raw.by || null,
    reviewed,
    reviewComment: raw.rm_review_comment || raw.review_comment || null,
    reviewedBy: raw.reviewed_by?.name || raw.reviewed_by || raw.reviewer?.name || null,
    reviewedAt: raw.reviewed_at || raw.review_at || null,
    // When the report was shared with the customer (drives the "Sent" pill).
    sent,
    sentAt,
    attachments: (files || []).map(mapAttachment).filter(Boolean),
  };
}

// The full request detail: status history, internal notes, escalations,
// vendor report and pricing.
export function mapRequestDetail(raw = {}) {
  const base = mapRequest(raw);

  // Status logs double as the assignment source of truth: the "assigned" entry
  // records who assigned the vendor (the telecaller) and when (the assignment
  // timestamp), since the vendor object itself carries neither.
  const rawLogs = raw.status_logs || raw.status_history || raw.history || raw.timeline || [];
  const assignedLog = rawLogs.find(l => String(l.status || '').toLowerCase() === 'assigned');

  const vendor = mapVendor(raw.vendor || raw.assigned_vendor);
  if (vendor && !vendor.assignedAt && assignedLog) vendor.assignedAt = assignedLog.created_at;

  // Prefer an explicit location object/string; else compose address + city + state.
  const composedLocation = [raw.address, raw.city, raw.state].filter(Boolean).join(', ') || null;
  const urgency = raw.urgency || raw.priority;

  return {
    ...base,
    familyMember: raw.family_member?.name || raw.family_member || null,
    location: raw.location?.full || (typeof raw.location === 'string' ? raw.location : null) || composedLocation,
    customerNotes: raw.customer_notes || raw.customer_note || raw.notes_from_customer || null,
    preferredDate: raw.preferred_date || null,
    priorityLabel: raw.urgency_label || raw.priority_label || (urgency ? titleCase(urgency) : 'Standard'),
    pricing: {
      customerPrice: pick(raw.pricing?.customer_price, raw.customer_price),
      expressSurcharge: pick(raw.pricing?.express_surcharge, raw.express_surcharge),
      gst: pick(raw.pricing?.gst, raw.gst),
      total: pick(raw.pricing?.total, raw.total),
      vendorCost: pick(raw.pricing?.vendor_cost, raw.vendor_cost),
    },
    vendor,
    rmName: raw.rm?.name || raw.relationship_manager?.name || null,
    // Telecaller isn't a top-level field — it's whoever assigned the vendor.
    telecaller: raw.telecaller?.name || raw.telecaller || assignedLog?.by?.name || null,
    vendorReport: mapVendorReport(raw.vendor_report || raw.report),
    statusHistory: rawLogs.map(mapHistory),
    internalNotes: (raw.internal_notes || raw.notes || []).map(mapNote),
    escalations: (raw.escalations || []).map(mapEscalation),
    // Lightweight support-chat summary (when present) so the detail screen can
    // show a "Support Chat" entry with an unread badge without a second call.
    supportChat: raw.support_chat ? {
      id: raw.support_chat.id,
      status: raw.support_chat.status || null,
      escalated: !!raw.support_chat.escalated,
      unreadCount: raw.support_chat.unread_count ?? 0,
    } : null,
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

// GET /rm/requests — my assigned service requests with SLA countdown.
// Query: status, urgency, open_only, search, page. Paginated.
export async function getRmRequests({ status, urgency, openOnly, search, page } = {}) {
  try {
    const params = {};
    if (status) params.status = status;
    if (urgency) params.urgency = urgency;
    if (openOnly != null) params.open_only = openOnly;
    if (search) params.search = search;
    if (page) params.page = page;
    const response = await apiClient.get('/rm/requests', { params });
    const list = response.data?.data || [];
    return { requests: list.map(mapRequest), meta: mapMeta(response, list.length) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /rm/requests/{ticket} — full request detail. 403 if assigned to another RM.
export async function getRmRequestDetail(ticket) {
  try {
    const response = await apiClient.get(`/rm/requests/${ticket}`);
    const data = response.data?.data || response.data || {};
    return mapRequestDetail(data.request || data.ticket || data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/requests/{ticket}/notes — add an internal note to the request thread.
export async function addRmRequestNote(ticket, note) {
  try {
    const response = await apiClient.post(`/rm/requests/${ticket}/notes`, { note });
    const data = response.data?.data || response.data || {};
    return { note: mapNote(data.note || data), message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/requests/{ticket}/escalate — routes up district partner -> state
// admin -> super admin. 422 if no escalation target is available. `escalatedTo`
// is optional; when omitted the backend picks the next level automatically.
export async function escalateRmRequest(ticket, { reason, escalatedTo } = {}) {
  try {
    const body = { reason };
    if (escalatedTo != null) body.escalated_to = escalatedTo;
    const response = await apiClient.post(`/rm/requests/${ticket}/escalate`, body);
    const data = response.data?.data || response.data || {};
    return { escalation: mapEscalation(data.escalation || data), message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /rm/requests/{ticket}/support-chat — the request's support chat + reply
// thread (chat is null if none started yet). Opening marks it read.
export async function getRmRequestSupportChat(ticket) {
  try {
    const response = await apiClient.get(`/rm/requests/${ticket}/support-chat`);
    const data = response.data?.data || {};
    const chat = data.chat || null;
    const rawReplies = chat?.replies || chat?.messages || data.replies || [];
    return {
      chat: chat ? mapSupportTicket(chat) : null,
      replies: rawReplies.map(mapSupportReply),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/requests/{ticket}/support-chat — starts the chat on the first message
// or appends a reply thereafter (one endpoint either way, like the customer flow).
export async function sendRmRequestSupportChat(ticket, message) {
  try {
    const response = await apiClient.post(`/rm/requests/${ticket}/support-chat`, { message });
    const data = response.data?.data || {};
    const chat = data.chat || null;
    const rawReply = data.reply || data.message || null;
    return {
      chat: chat ? mapSupportTicket(chat) : null,
      // This endpoint is the RM sending, so force the reply to our side.
      reply: rawReply ? { ...mapSupportReply(rawReply), fromRm: true } : null,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /rm/escalations — track my escalations and their resolution. Paginated.
export async function getRmEscalations({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/rm/escalations', { params });
    const list = response.data?.data || [];
    return { escalations: list.map(mapEscalation), meta: mapMeta(response, list.length) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
