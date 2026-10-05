import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

function mapQueueItem(raw = {}) {
  return {
    id: raw.id || raw.item_id || `${raw.queue_key || 'item'}_${raw.customer_id || raw.party_name || Math.random()}`,
    partyType: raw.party_type || (raw.customer_id ? 'customer' : (raw.vendor_id ? 'vendor' : 'customer')),
    partyName: raw.party_name || raw.name || raw.customer_name || raw.vendor_name || raw.email || 'Customer',
    email: raw.email || raw.party_email || '',
    phone: raw.phone || raw.contact_phone || raw.mobile || '',
    customerId: raw.customer_id || null,
    vendorId: raw.vendor_id || null,
    ticketId: raw.ticket_id || raw.service_request_id || null,
    supportTicketId: raw.support_ticket_id || null,
    purpose: raw.purpose || raw.topic || '',
    topicLabel: raw.topic_label || raw.topic || raw.purpose || '',
    preferredTime: raw.preferred_time || raw.preferred_time_label || null,
    queueKey: raw.queue_key || raw.queue || '',
    followUpOf: raw.follow_up_of || raw.follow_up_id || null,
    isOverdue: Boolean(raw.is_overdue || raw.overdue),
    requestedAt: raw.requested_at || raw.created_at || null,
    timeAgo: raw.time_ago || null,
    raw,
  };
}

function mapQueue(raw = {}) {
  const items = Array.isArray(raw.items) ? raw.items.map(mapQueueItem) : [];
  return {
    key: raw.key || raw.id || 'queue',
    label: raw.label || raw.name || 'Queue',
    description: raw.description || '',
    count: num(raw.count ?? items.length),
    items,
  };
}

export function mapCallLog(raw = {}) {
  return {
    id: raw.id,
    partyType: raw.party_type || 'customer',
    partyName: raw.party_name || raw.customer_name || raw.vendor_name || raw.party?.name || 'Party',
    phone: raw.phone || raw.contact_phone || '',
    customerId: raw.customer_id || null,
    vendorId: raw.vendor_id || null,
    ticketId: raw.ticket?.id || raw.ticket_id || raw.service_request_id || null,
    ticketNumber: raw.ticket?.ticket_number || raw.ticket_number || raw.ticket?.number || (raw.ticket_id ? `#${raw.ticket_id}` : (raw.ticket?.id ? `#${raw.ticket.id}` : null)),
    direction: raw.direction || 'outbound',
    purpose: raw.purpose || 'general',
    purposeLabel: raw.purpose_label || (raw.purpose ? String(raw.purpose).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'General'),
    outcome: raw.outcome || 'connected',
    outcomeLabel: raw.outcome_label || (raw.outcome ? String(raw.outcome).replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Connected'),
    durationMinutes: num(raw.duration_minutes ?? raw.duration),
    notes: raw.notes || raw.note || raw.summary || '',
    hasFollowUp: Boolean(raw.has_follow_up || raw.follow_up_at),
    followUpAt: raw.follow_up_at || raw.follow_up_date || null,
    followUpNote: raw.follow_up_note || '',
    followUpStatus: raw.follow_up_status || (raw.follow_up_completed ? 'completed' : 'pending'),
    isFollowUpCompleted: Boolean(raw.follow_up_completed || raw.follow_up_status === 'completed'),
    telecallerName: raw.telecaller_name || raw.caller_name || raw.telecaller?.name || 'Staff',
    createdAt: raw.created_at || raw.date || null,
    raw,
  };
}

/**
 * GET /api/v1/telecaller/calls/queues
 * Fetch my work queues (who to call next) and today's call stats
 */
export async function getTelecallerCallQueues() {
  try {
    const response = await apiClient.get('/telecaller/calls/queues');
    const data = response.data?.data || response.data || {};

    const statsRaw = data.stats || {};
    const queuesRaw = Array.isArray(data.queues) ? data.queues : [];

    return {
      stats: {
        totalCalls: num(statsRaw.total_calls ?? statsRaw.total ?? statsRaw.calls_today ?? 0),
        connectedCalls: num(statsRaw.connected_calls ?? statsRaw.connected ?? statsRaw.connected_today ?? 0),
        talkTimeMinutes: num(statsRaw.talk_time_minutes ?? statsRaw.talk_time ?? statsRaw.talk_time_today ?? 0),
        callbacksDue: num(statsRaw.callbacks_due ?? statsRaw.callbacks_due_today ?? statsRaw.callbacks ?? 0),
      },
      totalItems: num(data.total_items ?? queuesRaw.reduce((acc, q) => acc + (q.count || (q.items ? q.items.length : 0)), 0)),
      queues: queuesRaw.map(mapQueue),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * GET /api/v1/telecaller/calls/options
 * Choices for the log call form - outcomes, purposes, party types, directions
 */
export async function getTelecallerCallOptions() {
  try {
    const response = await apiClient.get('/telecaller/calls/options');
    const data = response.data?.data || response.data || {};

    const mapOptionList = (list) => {
      if (!Array.isArray(list)) return [];
      return list.map(item => {
        if (typeof item === 'string') return { value: item, label: item.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) };
        return {
          value: item.value ?? item.id ?? item.key,
          label: item.label ?? item.name ?? String(item.value ?? item.id),
        };
      });
    };

    return {
      outcomes: mapOptionList(data.outcomes || [
        { value: 'connected', label: 'Connected' },
        { value: 'no_answer', label: 'No Answer / Unreachable' },
        { value: 'busy', label: 'Busy / Line Engaged' },
        { value: 'callback_requested', label: 'Callback Requested' },
        { value: 'wrong_number', label: 'Wrong Number' },
        { value: 'not_interested', label: 'Not Interested' },
        { value: 'resolved', label: 'Resolved / Closed' },
      ]),
      purposes: mapOptionList(data.purposes || [
        { value: 'customer_request', label: 'Customer Callback Request' },
        { value: 'follow_up', label: 'Scheduled Follow-Up' },
        { value: 'onboarding', label: 'New Sign-up Onboarding' },
        { value: 'pending_payment', label: 'Pending Payment Reminder' },
        { value: 'stuck_ticket', label: 'Stuck Request with Vendor' },
        { value: 'feedback', label: 'Service Feedback Call' },
        { value: 'renewal', label: 'Membership Renewal' },
        { value: 'general', label: 'General Inquiry' },
      ]),
      partyTypes: mapOptionList(data.party_types || [
        { value: 'customer', label: 'Customer' },
        { value: 'vendor', label: 'Vendor' },
        { value: 'lead', label: 'Lead / Prospect' },
      ]),
      directions: mapOptionList(data.directions || [
        { value: 'outbound', label: 'Outbound (Outgoing)' },
        { value: 'inbound', label: 'Inbound (Incoming)' },
      ]),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * GET /api/v1/telecaller/calls
 * Fetch paginated call history
 */
export async function getTelecallerCallHistory(params = {}) {
  try {
    const cleanParams = {};
    if (params.outcome && params.outcome !== 'all') cleanParams.outcome = params.outcome;
    if (params.purpose && params.purpose !== 'all') cleanParams.purpose = params.purpose;
    if (params.party_type && params.party_type !== 'all') cleanParams.party_type = params.party_type;
    if (params.follow_ups) cleanParams.follow_ups = true;
    if (params.customer_id) cleanParams.customer_id = params.customer_id;
    if (params.from) cleanParams.from = params.from;
    if (params.to) cleanParams.to = params.to;
    if (params.page) cleanParams.page = params.page;

    const response = await apiClient.get('/telecaller/calls', { params: cleanParams });
    const data = response.data?.data || response.data || {};
    const itemsRaw = Array.isArray(data) ? data : (data.calls || data.data || data.items || []);
    const metaRaw = response.data?.meta || data.meta || {};

    return {
      calls: itemsRaw.map(mapCallLog),
      meta: {
        currentPage: num(metaRaw.current_page || 1),
        lastPage: num(metaRaw.last_page || 1),
        total: num(metaRaw.total || itemsRaw.length),
        perPage: num(metaRaw.per_page || 15),
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * POST /api/v1/telecaller/calls
 * Log a call with optional follow-up and relay
 */
export async function logTelecallerCall(payload) {
  try {
    const response = await apiClient.post('/telecaller/calls', {
      party_type: payload.party_type || payload.partyType || 'customer',
      customer_id: payload.customer_id || payload.customerId || null,
      vendor_id: payload.vendor_id || payload.vendorId || null,
      party_user_id: payload.party_user_id || payload.partyUserId || null,
      party_name: payload.party_name || payload.partyName || '',
      phone: payload.phone || '',
      ticket_id: payload.ticket_id || payload.ticketId || null,
      support_ticket_id: payload.support_ticket_id || payload.supportTicketId || null,
      direction: payload.direction || 'outbound',
      purpose: payload.purpose || 'general',
      outcome: payload.outcome || 'connected',
      duration_minutes: payload.duration_minutes != null ? Number(payload.duration_minutes) : 0,
      notes: payload.notes || payload.note || '',
      follow_up_at: payload.follow_up_at || payload.followUpAt || null,
      follow_up_note: payload.follow_up_note || payload.followUpNote || '',
      follow_up_of: payload.follow_up_of || payload.followUpOf || null,
      queue_key: payload.queue_key || payload.queueKey || null,
      relay_to: Array.isArray(payload.relay_to) ? payload.relay_to : (payload.relayTo ? [payload.relayTo] : []),
      relay_message: payload.relay_message || payload.relayMessage || '',
    });
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

/**
 * POST /api/v1/telecaller/calls/{callLog}/follow-up/complete
 * Mark one of my scheduled callbacks as done
 */
export async function completeTelecallerFollowUp(callLogId) {
  try {
    const response = await apiClient.post(`/telecaller/calls/${callLogId}/follow-up/complete`);
    return response.data?.data || response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
