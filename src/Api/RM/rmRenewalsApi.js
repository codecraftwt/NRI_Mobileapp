import apiClient, { normalizeApiError } from '../client';

// Renewal tracker. The sample response only shows empty upcoming/expired lists,
// so these mappers stay tolerant of the plausible snake_case key variants —
// consistent with the other RM mappers.

function num(v) {
  return v == null || isNaN(Number(v)) ? 0 : Number(v);
}

function pickDate(...vals) {
  for (const v of vals) if (v) return v;
  return null;
}

// Whole days from now until an ISO expiry (rounded up); null on missing/invalid.
function daysUntil(iso) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  return Math.ceil((t - Date.now()) / 86400000);
}

function mapUpcoming(raw = {}, i = 0) {
  const expires = pickDate(raw.expires_at, raw.expiry_date, raw.expires, raw.end_date, raw.ends_at, raw.valid_till);
  const daysLeft = raw.days_left ?? raw.days_remaining ?? raw.daysLeft;
  return {
    id: String(raw.id ?? raw.membership_id ?? raw.subscription_id ?? raw.customer_id ?? i),
    customer: raw.customer_name || raw.customer?.name || raw.customer || raw.name || '',
    plan: raw.plan_name || raw.plan?.name || raw.plan || raw.membership || raw.package || '',
    expires,
    lastPaid: pickDate(raw.last_paid_at, raw.last_payment_date, raw.last_paid, raw.paid_at),
    daysLeft: daysLeft != null ? num(daysLeft) : (daysUntil(expires) ?? 0),
  };
}

function mapExpired(raw = {}, i = 0) {
  return {
    id: String(raw.id ?? raw.membership_id ?? raw.subscription_id ?? raw.customer_id ?? i),
    customer: raw.customer_name || raw.customer?.name || raw.customer || raw.name || '',
    plan: raw.plan_name || raw.plan?.name || raw.plan || raw.membership || raw.package || '',
    expiredOn: pickDate(raw.expired_at, raw.expired_on, raw.expiry_date, raw.expires_at, raw.end_date, raw.ended_at),
  };
}

// GET /rm/renewals — upcoming expiries (45 days) + recently expired (30 days),
// plus day-bucket counts. 403 if the account isn't an RM.
export async function getRmRenewals() {
  try {
    const response = await apiClient.get('/rm/renewals');
    const data = response.data?.data || response.data || {};
    const b = data.buckets || {};
    return {
      buckets: {
        week: num(b.week),
        half: num(b.half),
        month: num(b.month),
        days30: num(b.days_30),
        days45: num(b.days_45),
      },
      upcoming: (data.upcoming || []).map(mapUpcoming),
      expired: (data.expired || []).map(mapExpired),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
