import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
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
    priority: (raw.priority || 'medium').toLowerCase(),
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
      totalRegistrations: num(statsRaw.total_registrations ?? statsRaw.registrations),
      completedMembers: num(statsRaw.completed_members ?? statsRaw.active_members),
      pendingMembers: num(statsRaw.pending_members ?? statsRaw.pending_payments),
      noMembershipMembers: num(statsRaw.no_membership_members),
      totalRevenue: num(statsRaw.total_revenue ?? statsRaw.revenue),
      activeTickets: num(statsRaw.active_tickets ?? statsRaw.open_tickets),
      totalTickets: num(statsRaw.total_tickets ?? statsRaw.tickets_count),
      resolvedTickets: num(statsRaw.resolved_tickets ?? statsRaw.closed_tickets),
      pendingTickets: num(statsRaw.pending_tickets),
      vendorCount: num(statsRaw.vendor_count ?? statsRaw.vendors_count ?? statsRaw.vendors),
      customerCount: num(statsRaw.customer_count ?? statsRaw.customers_count ?? statsRaw.customers),
      slaCompliance: statsRaw.sla_compliance != null ? num(statsRaw.sla_compliance) : null,
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
