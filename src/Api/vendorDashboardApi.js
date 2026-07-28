import apiClient, { normalizeApiError } from './client';
import { mapJob } from './vendorJobsApi';

// Response field names aren't fully pinned in the backend's OpenAPI schema, so
// these mappers stay tolerant across a few plausible snake_case shapes —
// consistent with the other vendor mappers.

function num(v) {
  return v == null ? 0 : Number(v);
}

// Job-status counts shown in the dashboard stat strip (payload key: `stats`).
function mapCounts(raw = {}) {
  return {
    toAccept: num(raw.to_accept ?? raw.new ?? raw.new_jobs ?? raw.pending),
    assigned: num(raw.assigned),
    inProgress: num(raw.in_progress ?? raw.inProgress),
    completed: num(raw.completed ?? raw.done),
  };
}

// The vendor's own status (account status, availability, rating, standing).
// `rating` comes back as an object { score, label }.
function mapStatus(raw = {}) {
  const ratingRaw = raw.rating;
  const rating = ratingRaw != null && typeof ratingRaw === 'object'
    ? (ratingRaw.score != null ? Number(ratingRaw.score) : null)
    : (ratingRaw != null ? Number(ratingRaw) : (raw.avg_rating != null ? Number(raw.avg_rating) : null));
  return {
    accountStatus: raw.status ?? raw.account_status ?? null,
    accountStatusLabel: raw.status_label ?? null,
    isAvailable: raw.is_available ?? raw.available ?? raw.availability?.is_available ?? null,
    rating,
    standing: raw.standing ?? raw.status_label ?? (typeof ratingRaw === 'object' ? ratingRaw?.label : null) ?? null,
  };
}

// GET /vendor/dashboard — job-status counts, pending payout total, recent jobs
// and the vendor's own status. 403 if the account has no vendor profile.
export async function getVendorDashboard() {
  try {
    const response = await apiClient.get('/vendor/dashboard');
    const data = response.data?.data || response.data || {};
    const stats = data.stats || data.counts || data.job_counts || {};
    const recent = data.recent_jobs || data.recentJobs || data.jobs || [];
    return {
      counts: mapCounts(stats),
      pendingPayout: num(stats.pending_payout ?? data.pending_payout ?? data.totals?.pending_payout),
      recentJobs: recent.map(mapJob).filter(Boolean),
      vendorStatus: mapStatus(data.vendor || data.vendor_status || data.status || {}),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
