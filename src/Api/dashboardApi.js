import apiClient, { normalizeApiError } from './client';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

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
      id: raw.membership.id,
      planId: raw.membership.plan?.id ?? null,
      planName: raw.membership.plan?.name || null,
      planSlug: raw.membership.plan?.slug || null,
      status: raw.membership.status || null,
      startDate: raw.membership.starts_at || null,
      endDate: raw.membership.expires_at || null,
      autoRenew: !!raw.membership.auto_renew,
      renewalDue: !!raw.membership.renewal_due,
      // The backend only exposes a `renewal_due` boolean, not a ready-made
      // message — compose one client-side so the existing renewal banner
      // has something to show.
      renewalAlert: raw.membership.renewal_due
        ? `Your ${raw.membership.plan?.name || 'membership'} plan expires on ${formatDate(raw.membership.expires_at)} — renew soon to avoid a lapse.`
        : null,
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
