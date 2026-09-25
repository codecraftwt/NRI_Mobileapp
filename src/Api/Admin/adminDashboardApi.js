import apiClient, { normalizeApiError } from '../client';

function num(v) {
  return v == null ? 0 : Number(v);
}

// One row of the state-wise operations/revenue breakdown.
function mapStateBreakdown(raw = {}) {
  return {
    name: raw.name || '',
    ticketsCount: num(raw.tickets_count),
    customersCount: num(raw.customers_count),
    revenue: num(raw.revenue),
  };
}

// One row of the internal staff roles summary (super-admin, RM, etc.).
function mapRoleSummary(raw = {}) {
  return {
    name: raw.name || '',
    label: raw.label || raw.name || '',
    usersCount: num(raw.users_count),
  };
}

// GET /super-admin/dashboard — Control Centre overview: registration funnel,
// revenue, tickets, SLA, a state-wise operations/revenue breakdown, and an
// internal staff roles summary.
export async function getAdminDashboard() {
  try {
    const response = await apiClient.get('/super-admin/dashboard');
    const data = response.data?.data || response.data || {};
    const stats = data.stats || {};
    return {
      stats: {
        totalRegistrations: num(stats.total_registrations),
        completedMembers: num(stats.completed_members),
        pendingMembers: num(stats.pending_members),
        noMembershipMembers: num(stats.no_membership_members),
        totalRevenue: num(stats.total_revenue),
        activeTickets: num(stats.active_tickets),
        vendorCount: num(stats.vendor_count),
        slaCompliance: num(stats.sla_compliance),
      },
      stateBreakdown: (data.state_breakdown || []).map(mapStateBreakdown),
      rolesSummary: (data.roles_summary || []).map(mapRoleSummary),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
