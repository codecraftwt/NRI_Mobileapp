import apiClient, { normalizeApiError, API_BASE_URL } from './client';

// Response field names aren't fully pinned in the OpenAPI schema, so these
// mappers stay tolerant across a few plausible snake_case shapes — consistent
// with the other vendor mappers.

function num(v) {
  return v == null ? 0 : Number(v);
}

function mapTotals(raw = {}) {
  return {
    pendingPayout: num(raw.pending_payout ?? raw.pending ?? raw.pending_amount),
    completedEarnings: num(raw.completed_earnings ?? raw.paid ?? raw.paid_amount ?? raw.completed ?? raw.total_paid),
    completedJobs: num(raw.completed_jobs ?? raw.jobs_completed ?? raw.completed_jobs_count ?? raw.total_jobs),
    processing: num(raw.processing ?? raw.processed ?? raw.processed_amount),
  };
}

// A payout cycle summary row for the history list.
function mapPayout(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.payout_id,
    period: raw.period || raw.cycle || raw.label || null,
    date: raw.paid_at || raw.processed_at || raw.created_at || raw.date || null,
    amount: num(raw.net_payout ?? raw.net_amount ?? raw.amount ?? raw.total),
    status: raw.status || 'pending',
    jobsCount: raw.jobs_count ?? raw.job_count ?? (Array.isArray(raw.jobs) ? raw.jobs.length : null),
  };
}

function mapPayoutJob(raw) {
  return {
    id: raw.id ?? raw.ticket_id,
    ticket: raw.ticket_number || raw.ticket?.ticket_number || (raw.ticket_id ? `#${raw.ticket_id}` : '—'),
    service: raw.service_name || raw.service?.name || raw.service || '',
    jobAmount: num(raw.job_amount ?? raw.amount ?? raw.gross ?? raw.vendor_price),
    deduction: raw.deduction != null ? num(raw.deduction) : null,
    reason: raw.reason || raw.deduction_reason || null,
  };
}

// Full payout-cycle detail (summary + per-job line items).
function mapPayoutDetail(raw) {
  if (!raw) return null;
  return {
    id: raw.id ?? raw.payout_id,
    period: raw.period || raw.cycle || raw.label || null,
    date: raw.paid_at || raw.processed_at || raw.created_at || raw.date || null,
    status: raw.status || 'pending',
    grossEarnings: num(raw.gross_earnings ?? raw.gross ?? raw.gross_amount),
    tdsDeduction: num(raw.tds_deduction ?? raw.tds),
    penaltyDeduction: num(raw.penalty_deduction ?? raw.penalty),
    subscriptionDeduction: num(raw.subscription_deduction ?? raw.subscription_fee ?? raw.subscription),
    netPayout: num(raw.net_payout ?? raw.net_amount ?? raw.amount),
    jobs: (raw.jobs || raw.line_items || raw.items || []).map(mapPayoutJob),
  };
}

function mapMeta(rawMeta = {}, listLen = 0) {
  return {
    currentPage: rawMeta.current_page ?? 1,
    lastPage: rawMeta.last_page ?? 1,
    perPage: rawMeta.per_page ?? listLen,
    total: rawMeta.total ?? listLen,
  };
}

// GET /vendor/earnings?status=&page= — totals + paginated payout cycles.
export async function getVendorEarnings({ status, page } = {}) {
  try {
    const params = {};
    if (status) params.status = status;
    if (page) params.page = page;
    const response = await apiClient.get('/vendor/earnings', { params });
    const data = response.data?.data || {};
    const list = data.payouts || data.data || [];
    return {
      totals: mapTotals(data.totals),
      payouts: list.map(mapPayout).filter(Boolean),
      meta: mapMeta(response.data?.meta || data.meta, list.length),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// GET /vendor/earnings/{payout} — payout cycle detail. 403 if another vendor's.
export async function getVendorPayoutDetail(payoutId) {
  try {
    const response = await apiClient.get(`/vendor/earnings/${payoutId}`);
    const data = response.data?.data || response.data || {};
    return mapPayoutDetail(data.payout || data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Absolute URL for the payout-cycle statement PDF — passed to the auth-aware
// downloader so the Bearer token is attached.
export function getVendorPayoutInvoiceUrl(payoutId) {
  const base = String(API_BASE_URL || '').replace(/\/$/, '');
  return `${base}/vendor/earnings/${payoutId}/invoice`;
}
