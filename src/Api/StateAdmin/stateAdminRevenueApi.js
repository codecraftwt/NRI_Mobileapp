import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

function extractName(val) {
  if (val == null) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    return val.name || val.label || val.title || val.city || val.category || val.status || '';
  }
  return String(val);
}

// GET /api/v1/admin/revenue
// Query parameters:
//   months: integer (default 12, range 3–24)
export async function getStateAdminRevenue({ months = 12 } = {}) {
  try {
    const response = await apiClient.get('/admin/revenue', {
      params: { months },
    });
    const data = response.data?.data || response.data || {};

    const byStatus = Array.isArray(data.by_status)
      ? data.by_status.map((s, idx) => {
          const statusStr = extractName(s.status);
          const labelStr = extractName(s.label || s.status);
          return {
            id: s.id || statusStr || String(idx),
            status: statusStr,
            label: labelStr || statusStr,
            requests: num(s.requests ?? s.count),
            amount: num(s.amount ?? s.revenue),
          };
        })
      : [];

    const monthlyTrend = Array.isArray(data.monthly_trend)
      ? data.monthly_trend.map((m, idx) => {
          const monthStr = extractName(m.month || m.label || m.name);
          return {
            id: m.id || monthStr || String(idx),
            month: monthStr,
            requests: num(m.requests ?? m.count),
            amount: num(m.amount ?? m.revenue),
          };
        })
      : [];

    const byCity = Array.isArray(data.by_city)
      ? data.by_city.map((c, idx) => {
          const cityName = extractName(c.city || c.name || c.district);
          return {
            id: typeof c.city === 'object' && c.city?.id ? c.city.id : (c.id || cityName || String(idx)),
            city: cityName || 'City',
            requests: num(c.requests ?? c.count),
            amount: num(c.amount ?? c.revenue),
          };
        })
      : [];

    const byCategory = Array.isArray(data.by_category)
      ? data.by_category.map((cat, idx) => {
          const catName = extractName(cat.category || cat.name);
          return {
            id: typeof cat.category === 'object' && cat.category?.id ? cat.category.id : (cat.id || catName || String(idx)),
            category: catName || 'General',
            requests: num(cat.requests ?? cat.count),
            amount: num(cat.amount ?? cat.revenue),
          };
        })
      : [];

    return {
      currency: data.currency || 'INR',
      totalRevenue: num(data.total_revenue ?? data.totalRevenue ?? data.revenue),
      requests: num(data.requests ?? data.total_requests ?? data.tickets),
      byStatus,
      monthlyTrend,
      byCity,
      byCategory,
      raw: data,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
