import apiClient, { normalizeApiError } from '../client';

// Response field names aren't pinned in the OpenAPI schema, so these mappers
// stay tolerant across a few plausible snake_case shapes — consistent with the
// other RM mappers.

function mapAttachment(raw, index = 0) {
  if (!raw) return null;
  if (typeof raw === 'string') return { id: String(index), name: `Attachment ${index + 1}`, url: raw };
  return {
    id: String(raw.id ?? index),
    name: raw.name || raw.file_name || raw.filename || raw.title || `Attachment ${index + 1}`,
    url: raw.url || raw.file_url || raw.path || raw.link || null,
  };
}

export function mapReport(raw = {}) {
  const files = raw.media || raw.attachments || raw.files || raw.documents || [];
  const status = String(raw.status || '').toLowerCase();
  const sentAt = raw.sent_to_customer_at || raw.sent_at || raw.shared_at || raw.delivered_at || null;
  const reviewed = raw.reviewed === true || raw.reviewed_at != null || status === 'reviewed' || status === 'sent';
  const sent = raw.sent === true || sentAt != null || status === 'sent';
  return {
    id: raw.id,
    ticketId: raw.ticket_id ?? raw.ticket?.id ?? null,
    ticketNumber: raw.ticket_number || raw.ticket?.ticket_number || raw.ticket || '',
    service: raw.service?.name || raw.service_name || raw.ticket?.service?.name || 'Service Request',
    customer: raw.customer_name || raw.customer?.name || raw.ticket?.customer?.name || '',
    vendor: raw.vendor?.business_name || raw.vendor?.name || raw.vendor_name || '',
    text: raw.report_text || raw.text || raw.report || raw.body || raw.summary || raw.notes || '',
    submittedAt: raw.submitted_at || raw.created_at || null,
    reviewed,
    reviewedAt: raw.reviewed_at || null,
    reviewComment: raw.rm_review_comment || raw.review_comment || null,
    sent,
    sentAt,
    attachments: (files || []).map(mapAttachment).filter(Boolean),
    // Derived label for the status pill.
    statusLabel: sent ? 'Sent' : reviewed ? 'Reviewed' : 'Pending',
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

// GET /rm/reports — vendor reports on my tickets. `filter` is one of
// pending | reviewed | all (defaults to pending server-side). Paginated.
export async function getRmReports({ filter, page } = {}) {
  try {
    const params = {};
    if (filter) params.filter = filter;
    if (page) params.page = page;
    const response = await apiClient.get('/rm/reports', { params });
    const list = response.data?.data || [];
    return { reports: list.map(mapReport), meta: mapMeta(response, list.length) };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/reports/{report}/review — mark the vendor report as reviewed, with an
// optional RM review comment. 403 if the report belongs to another RM's ticket.
export async function reviewRmReport(report, comment) {
  try {
    const response = await apiClient.post(`/rm/reports/${report}/review`, {
      rm_review_comment: comment || undefined,
    });
    const data = response.data?.data || response.data || {};
    return { report: data.report ? mapReport(data.report) : null, message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /rm/reports/{report}/send — dispatch the reviewed report to the customer.
// 422 if the report hasn't been reviewed yet.
export async function sendRmReport(report) {
  try {
    const response = await apiClient.post(`/rm/reports/${report}/send`);
    const data = response.data?.data || response.data || {};
    return { report: data.report ? mapReport(data.report) : null, message: response.data?.message };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
