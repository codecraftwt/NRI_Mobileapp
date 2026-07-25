import apiClient, { normalizeApiError } from './client';

// Field names for the disputes list aren't fully pinned down in the backend's
// OpenAPI schema (the GET only documents "Paginated disputes"), so this mapper
// stays tolerant across a few plausible snake_case shapes — consistent with
// mapSupportTicket() in supportTicketApi.js.
export function mapDispute(raw) {
  if (!raw) return null;
  const ticketNumber =
    raw.ticket?.ticket_number || raw.ticket_number || raw.job_number || null;
  return {
    id: raw.id,
    // "JOB" column — a linked service ticket, or "General" for payout/account issues.
    job: ticketNumber || (raw.ticket_id ? `#${raw.ticket_id}` : 'General'),
    ticketId: raw.ticket_id ?? raw.ticket?.id ?? null,
    issue: raw.reason || raw.issue || raw.description || '',
    amount: raw.amount != null ? Number(raw.amount) : null,
    status: raw.status || 'pending',
    statusLabel: raw.status_label || raw.status || 'Pending',
    resolution: raw.resolution || raw.resolution_note || raw.resolution_text || null,
    raisedAt: raw.created_at || raw.raised_at || null,
  };
}

// GET /vendor/support — "My disputes (job / payment issues) with their
// resolution status", paginated by ?page.
export async function getVendorDisputes({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/vendor/support', { params });
    const list = response.data?.data || [];
    return {
      disputes: list.map(mapDispute),
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

// POST /vendor/support — "Raise a dispute, optionally tied to one of your jobs".
// Body: { ticket_id?, reason, amount? }. 201 on success; 403 if the ticket
// belongs to another vendor; 422 on validation error.
export async function raiseVendorDispute({ ticketId, reason, amount }) {
  try {
    const response = await apiClient.post('/vendor/support', {
      ticket_id: ticketId || undefined,
      reason,
      amount: amount != null && amount !== '' ? Number(amount) : undefined,
    });
    const data = response.data?.data || response.data || {};
    return {
      dispute: mapDispute(data.dispute || data),
      message: response.data?.message,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
