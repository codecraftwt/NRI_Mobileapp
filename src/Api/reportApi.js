import apiClient, { normalizeApiError } from './client';

export function mapReport(raw) {
  return {
    id: raw.id,
    // Verified live against GET /customer/reports: the report's body comes
    // back as `report_text`, and `service`/`vendor` are plain strings, not
    // nested objects — the `?.name`/`_name` fallbacks below cover the shapes
    // seen elsewhere (e.g. the report embedded in ticket detail).
    title: raw.report_text || raw.title || raw.name || 'Report',
    service: typeof raw.service === 'string' ? raw.service : (raw.service?.name || raw.service_name || raw.ticket?.service?.name || null),
    type: raw.type || raw.category || null,
    vendor: typeof raw.vendor === 'string' ? raw.vendor : (raw.vendor?.name || raw.vendor_name || null),
    status: raw.status || null,
    // `sent_at` is when the RM dispatched the reviewed report to the
    // customer (POST /rm/reports/{report}/send) — the date the customer
    // actually sees is more meaningful than the internal visit/created date.
    date: raw.sent_at || raw.visit_date || raw.date || raw.created_at || null,
    mediaCount: (raw.media || raw.media_urls || []).length,
    media: (raw.media || raw.media_urls || []).map(m => (typeof m === 'string' ? { url: m } : { url: m.url, type: m.type })),
    ticketId: raw.ticket_id || null,
    ticketNumber: raw.ticket_number || null,
  };
}

export async function getReports({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/customer/reports', { params });
    const list = response.data?.data || [];
    return {
      reports: list.map(mapReport),
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
