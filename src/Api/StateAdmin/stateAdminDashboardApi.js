import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

// Reads the first present key and returns a Number — or `undefined` if NONE
// of the keys exist on `raw`. Distinguishing "field not returned by this
// role/scope" from "field returned as 0" is the whole point: state-admin's
// GET /admin/dashboard (scope: "state") and district/taluka-admin's
// (scope: "coverage") return entirely different `stats` shapes — confirmed
// live:
//   state:    { revenue, vendors, tickets, open, customers, escalated, pending_vendors }
//   coverage: { vendors, open_tickets, total_tickets, overdue, unassigned, available_vendors }
// Defaulting an absent field to 0 would render a misleading "0" card for a
// metric that role was never sent — Dashboard.js instead hides any stat
// card whose value is `undefined`.
function pick(raw, keys) {
  for (const k of keys) {
    if (raw[k] != null) return num(raw[k]);
  }
  return undefined;
}

// Map a recent ticket object
function mapRecentTicket(raw = {}) {
  return {
    id: raw.id,
    ticketNumber: raw.ticket_number || raw.ticket_id || raw.ticketNumber || (raw.id ? `TICK-${raw.id}` : ''),
    title: raw.title || raw.subject || raw.service_name || 'Ticket Request',
    serviceName: raw.service_name || raw.service?.name || raw.title || 'General Service',
    customerName: raw.customer_name || raw.customer?.name || raw.user?.name || 'Customer',
    customerEmail: raw.customer_email || raw.customer?.email || raw.user?.email || null,
    customerPhone: raw.customer_phone || raw.customer?.phone || raw.user?.phone || null,
    status: (raw.status || 'open').toLowerCase(),
    statusLabel: raw.status_label || raw.statusLabel || null,
    // No fallback to 'medium' — coverage-scope tickets don't carry a
    // priority field at all, and defaulting one in would show a fake
    // "MEDIUM" badge on every card. null means "not sent for this scope".
    priority: raw.priority ? String(raw.priority).toLowerCase() : null,
    stateName: raw.state_name || raw.state?.name || null,
    districtName: raw.district_name || raw.district?.name || raw.city_name || raw.city?.name || null,
    cityName: raw.city_name || raw.city?.name || null,
    createdAt: raw.created_at || raw.createdAt || null,
    updatedAt: raw.updated_at || raw.updatedAt || null,
    amount: raw.amount != null ? num(raw.amount) : null,
    amountFormatted: raw.amount != null ? `₹${num(raw.amount).toLocaleString('en-IN')}` : null,
    slaStatus: raw.sla_status || (raw.sla_breached ? 'breached' : 'within_sla'),
  };
}

// Map a district breakdown row (State scope only)
// Matches response: { city: { id: 701, name: "Kolhapur" }, total: 29, open_count: 21 }
function mapDistrictRow(raw = {}) {
  const city = raw.city || {};
  const id = city.id || raw.id || raw.district_id || null;
  const name = city.name || raw.name || raw.district_name || 'District';
  const total = num(raw.total ?? raw.tickets_count ?? raw.total_tickets ?? raw.tickets);
  const openCount = num(raw.open_count ?? raw.active_tickets_count ?? raw.open_tickets_count ?? raw.active_tickets);
  const resolvedCount = num(raw.resolved_count ?? raw.resolved_tickets_count ?? (total >= openCount ? total - openCount : 0));

  return {
    id,
    name,
    districtName: name,
    total,
    openCount,
    resolvedCount,
    ticketsCount: total,
    activeTicketsCount: openCount,
    resolvedTicketsCount: resolvedCount,
    customersCount: num(raw.customers_count ?? raw.total_customers ?? raw.customers),
    vendorsCount: num(raw.vendors_count ?? raw.total_vendors ?? raw.vendors),
    revenue: raw.revenue != null ? num(raw.revenue) : null,
    revenueFormatted: raw.revenue != null ? `₹${num(raw.revenue).toLocaleString('en-IN')}` : null,
    slaCompliance: raw.sla_compliance != null ? num(raw.sla_compliance) : null,
    raw,
  };
}

// Map a monthly revenue trend row (State scope only)
function mapRevenueTrendRow(raw = {}) {
  return {
    month: raw.month || raw.month_name || raw.label || '',
    year: raw.year || null,
    revenue: num(raw.revenue ?? raw.total_revenue ?? raw.amount),
    revenueFormatted: `₹${num(raw.revenue ?? raw.total_revenue ?? raw.amount).toLocaleString('en-IN')}`,
    ticketsCount: num(raw.tickets_count ?? raw.count),
  };
}

// Map SLA breakdown details (State scope only)
function mapSlaBreakdown(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    withinSla: num(raw.within_sla ?? raw.withinSla ?? raw.met),
    breached: num(raw.breached ?? raw.breachedSla ?? raw.missed),
    total: num(raw.total ?? raw.total_tickets),
    compliancePercentage: num(raw.compliance_percentage ?? raw.compliance ?? raw.percentage ?? (raw.total ? Math.round((num(raw.within_sla) / num(raw.total)) * 100) : 0)),
    avgResolutionTimeHours: raw.avg_resolution_time_hours != null ? num(raw.avg_resolution_time_hours) : null,
    details: Array.isArray(raw.details) ? raw.details : [],
  };
}

// GET /admin/dashboard
// A state-admin gets data.scope = "state" with stats scoped to their own state_id.
// A district-admin or taluka-admin gets data.scope = "coverage".
// Returns { scope, stats, recent_tickets, sla_breakdown, monthly_revenue_trend, district_breakdown }
export async function getStateAdminDashboard() {
  try {
    const response = await apiClient.get('/admin/dashboard');
    const data = response.data?.data || response.data || {};
    const statsRaw = data.stats || {};

    const stats = {
      // State-scope only.
      totalRevenue: pick(statsRaw, ['revenue', 'total_revenue']),
      customerCount: pick(statsRaw, ['customers', 'customer_count', 'customers_count']),
      escalatedTickets: pick(statsRaw, ['escalated', 'escalated_tickets']),
      pendingVendors: pick(statsRaw, ['pending_vendors']),
      // Coverage-scope (district/taluka-admin) only.
      overdueTickets: pick(statsRaw, ['overdue', 'overdue_tickets']),
      unassignedTickets: pick(statsRaw, ['unassigned', 'unassigned_tickets']),
      availableVendors: pick(statsRaw, ['available_vendors']),
      // Shared — present in both scopes, under different keys.
      vendorCount: pick(statsRaw, ['vendors', 'vendor_count', 'vendors_count']),
      totalTickets: pick(statsRaw, ['tickets', 'total_tickets', 'tickets_count']),
      activeTickets: pick(statsRaw, ['open', 'open_tickets', 'active_tickets']),
      ...statsRaw, // Keep any extra backend fields accessible
    };

    return {
      scope: data.scope || 'state',
      stats,
      recentTickets: Array.isArray(data.recent_tickets) ? data.recent_tickets.map(mapRecentTicket) : [],
      slaBreakdown: data.sla_breakdown ? mapSlaBreakdown(data.sla_breakdown) : null,
      monthlyRevenueTrend: Array.isArray(data.monthly_revenue_trend) ? data.monthly_revenue_trend.map(mapRevenueTrendRow) : [],
      districtBreakdown: Array.isArray(data.district_breakdown) ? data.district_breakdown.map(mapDistrictRow) : [],
      raw: data,
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
