// Shared row/meta mapping for the admin payment-list endpoints:
// GET /admin/customers/{customer}/payments (super-admin, state/district/taluka-admin)
// GET /super-admin/payments (super-admin only, adds `customer` per row)
// Both return the same payment field set per the API spec, so the mapping
// lives here once instead of being duplicated per role's API file.
export function mapAdminPayment(raw = {}) {
  return {
    id: raw.id,
    receiptNumber: raw.receipt_number,
    for: raw.for,
    gateway: raw.gateway,
    status: raw.status,
    amount: raw.amount,
    currency: raw.currency,
    // Already formatted with currency symbol (e.g. "$7.34") — use this for
    // display instead of amount, which doesn't include GST.
    amountDisplay: raw.amount_display,
    gstAmount: raw.gst_amount,
    gstRate: raw.gst_rate,
    gatewayPaymentId: raw.gateway_payment_id,
    paidAt: raw.paid_at,
    createdAt: raw.created_at,
    // Only present on GET /super-admin/payments rows.
    customer: raw.customer ? { id: raw.customer.id, name: raw.customer.name } : null,
  };
}

// meta.total_paid is one entry per currency, e.g.
// [{ currency: "USD", amount: 123.45, amount_display: "$123.45" }, ...]
function mapTotalPaid(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(t => ({
    currency: t.currency,
    amount: Number(t.amount) || 0,
    amountDisplay: t.amount_display ?? null,
  }));
}

export function mapAdminPaymentsMeta(response, listLength) {
  const meta = response.data?.meta || {};
  return {
    currentPage: meta.current_page ?? 1,
    lastPage: meta.last_page ?? 1,
    perPage: meta.per_page ?? listLength,
    total: meta.total ?? listLength,
    totalPaid: mapTotalPaid(meta.total_paid),
  };
}
