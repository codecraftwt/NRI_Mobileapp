import apiClient, { normalizeApiError } from './client';

function mapReport(raw) {
  return {
    id: raw.id,
    title: raw.title || raw.name || 'Report',
    service: raw.service?.name || raw.service_name || raw.ticket?.service?.name || null,
    type: raw.type || raw.category || null,
    vendor: raw.vendor?.name || raw.vendor_name || null,
    status: raw.status || null,
    // `sent_at` is when the RM dispatched the reviewed report to the
    // customer (POST /rm/reports/{report}/send) — the date the customer
    // actually sees is more meaningful than the internal visit/created date.
    date: raw.sent_at || raw.visit_date || raw.date || raw.created_at || null,
    mediaCount: (raw.media || raw.media_urls || []).length,
    media: (raw.media || raw.media_urls || []).map(m => (typeof m === 'string' ? { url: m } : { url: m.url, type: m.type })),
    ticketId: raw.ticket_id || null,
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

// `by_category` comes back as a plain object map, e.g. { "Parent Care": 4 },
// not an array of { name, count } pairs.
function mapByCategory(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(item => ({
      name: item.name || item.category_name || item.category || 'Other',
      count: item.count ?? item.total ?? 0,
    }));
  }
  return Object.entries(raw).map(([name, count]) => ({ name, count }));
}

function mapAnnualSummary(raw) {
  return {
    year: raw.year,
    totalRequests: raw.total_requests ?? 0,
    completed: raw.completed ?? 0,
    totalSpend: Number(raw.total_spend) || 0,
    propertyVisits: raw.property_visits ?? 0,
    parentCare: raw.parent_care ?? 0,
    byCategory: mapByCategory(raw.by_category),
  };
}

export async function getAnnualSummary({ year } = {}) {
  try {
    const params = {};
    if (year) params.year = year;
    const response = await apiClient.get('/customer/reports/annual-summary', { params });
    return mapAnnualSummary(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
