import apiClient, { normalizeApiError } from '../client';

// Response field names aren't fully pinned in the backend's OpenAPI schema
// (only "data.summary + data.ratings"), so these mappers stay tolerant across
// a few plausible snake_case shapes — consistent with mapDispute() in
// vendorSupportApi.js.
export function mapRatingSummary(raw) {
  const s = raw || {};
  return {
    overallScore: s.overall_score ?? s.overall ?? s.score ?? null,
    standing: s.standing || s.status_label || s.status || s.label || null,
    avgCustomerRating: s.avg_customer_rating ?? s.average_customer_rating ?? s.avg_rating ?? s.avg_customer ?? null,
    ratedJobs: s.rated_jobs ?? s.rated_jobs_count ?? s.total ?? s.count ?? null,
  };
}

export function mapRating(raw) {
  if (!raw) return null;
  const ticketNumber = raw.ticket?.ticket_number || raw.ticket_number || raw.job || raw.job_number || null;
  return {
    id: raw.id ?? ticketNumber,
    ticket: ticketNumber || (raw.ticket_id ? `#${raw.ticket_id}` : '—'),
    service: raw.service_name || raw.service?.name || raw.service || '',
    // Customer's star rating (out of 5).
    rating: Number(raw.customer_rating ?? raw.rating ?? raw.stars ?? 0),
    slaMet: raw.sla_met ?? raw.sla ?? null,
    // Composite/weighted score shown in its own column.
    composite: raw.composite_score != null ? Number(raw.composite_score).toFixed(2)
      : raw.composite != null ? Number(raw.composite).toFixed(2) : '—',
    // The live payload carries the customer's written feedback as `notes`.
    feedback: raw.feedback || raw.comment || raw.review || raw.notes || '',
    date: raw.created_at || raw.rated_at || raw.date || null,
  };
}

// GET /vendor/ratings — "Rating summary + paginated per-job ratings and
// feedback". Returns data.summary + data.ratings, paginated in meta.
export async function getVendorRatings({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/vendor/ratings', { params });
    const data = response.data?.data || response.data || {};
    const list = data.ratings || data.items || [];
    const rawMeta = response.data?.meta || data.meta || {};
    return {
      summary: mapRatingSummary(data.summary),
      ratings: list.map(mapRating).filter(Boolean),
      meta: {
        currentPage: rawMeta.current_page ?? 1,
        lastPage: rawMeta.last_page ?? 1,
        perPage: rawMeta.per_page ?? list.length,
        total: rawMeta.total ?? list.length,
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
