import apiClient, { normalizeApiError } from '../client';

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? null : n;
}

// Tolerant mapper — response field names aren't fully pinned in the schema.
export function mapOpportunity(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? index),
    customerId: raw.customer_id ?? raw.customer?.id ?? null,
    name: raw.customer?.name || raw.customer_name || raw.name || 'Customer',
    current: raw.current_plan?.name || raw.current_plan || raw.current || raw.membership?.plan?.name || raw.membership || null,
    suggested: raw.suggested_plan?.name || raw.suggested_plan || raw.recommended_plan?.name || raw.recommended_plan || raw.suggested || null,
    reason: raw.reason || raw.flag_reason || raw.note || raw.signal || '',
    // The ready-made pitch line from the backend.
    pitch: raw.pitch || raw.pitch_text || raw.suggestion || null,
    value: toNum(raw.potential_value ?? raw.value ?? raw.estimated_value ?? raw.revenue),
    priority: raw.priority || raw.score || raw.priority_label || null,
  };
}

// GET /rm/upsell — flagged upsell opportunities across my customer book,
// high priority first. Not paginated.
export async function getRmUpsell() {
  try {
    const response = await apiClient.get('/rm/upsell');
    const d = response.data?.data ?? response.data ?? [];
    const list = Array.isArray(d) ? d : (d.opportunities || d.items || []);
    const totalValue = Array.isArray(d) ? null : toNum(d.total_value ?? d.potential_revenue);
    return { opportunities: list.map(mapOpportunity), totalValue };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
