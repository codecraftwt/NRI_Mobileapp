import apiClient, { normalizeApiError } from './client';

function mapPlanUsage(raw) {
  if (!raw) return null;
  return {
    requestsUsed: raw.requests_used,
    requestsLimit: raw.requests_limit,
    waiversUsed: raw.waivers_used,
    waiversLimit: raw.waivers_limit,
    visitsUsed: raw.visits_used,
    visitsLimit: raw.visits_limit,
    inspectionsRemaining: raw.inspections_remaining,
  };
}

function mapRecentTicket(raw) {
  return {
    id: raw.id,
    reference: raw.reference || raw.ticket_number || String(raw.id),
    service: raw.service?.name || raw.service_name || raw.title || (typeof raw.service === 'string' ? raw.service : 'Service Request'),
    vendor: raw.vendor?.name || raw.vendor_name || null,
    status: raw.status,
    date: raw.created_at || raw.date || null,
  };
}

function mapRecentReport(raw) {
  return {
    id: raw.id,
    title: raw.title || raw.name || 'Report',
    date: raw.created_at || raw.date || null,
    url: raw.file_url || raw.url || null,
  };
}

function mapDashboard(raw) {
  return {
    stats: {
      activeTickets: raw.stats?.active_tickets ?? 0,
      completedTickets: raw.stats?.completed_tickets ?? 0,
      walletBalance: raw.stats?.wallet_balance ?? 0,
    },
    rm: raw.rm ? {
      name: raw.rm.name,
      email: raw.rm.email,
      phone: raw.rm.phone,
      avatar: raw.rm.avatar || null,
    } : null,
    membership: raw.membership ? {
      planName: raw.membership.plan_name || raw.membership.name || null,
      status: raw.membership.status || null,
      startDate: raw.membership.start_date || null,
      endDate: raw.membership.end_date || null,
      renewalAlert: raw.membership.renewal_alert || raw.membership.renewal_notice || null,
    } : null,
    planUsage: mapPlanUsage(raw.plan_usage),
    recentTickets: (raw.recent_tickets || []).map(mapRecentTicket),
    recentReports: (raw.recent_reports || []).map(mapRecentReport),
  };
}

export async function getDashboard() {
  try {
    const response = await apiClient.get('/customer/dashboard');
    return mapDashboard(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
