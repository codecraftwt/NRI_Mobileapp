import apiClient, { normalizeApiError } from './client';
import { getTicketDetail } from './ticketApi';

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
    slaDeadline: raw.sla_deadline || null,
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
      // Plan price for the dashboard membership card. Prefer the USD price the
      // app displays in $; fall back to the base price if that's all there is.
      planPrice: raw.membership.plan?.usd_price ?? raw.membership.plan?.price ?? null,
      planCurrency: raw.membership.plan?.usd_price != null ? 'USD' : (raw.membership.plan?.currency || 'USD'),
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
    const data = mapDashboard(response.data?.data || response.data);

    // Same gap as the main ticket list (see getTickets() in ticketApi.js):
    // the summary here never includes `sla_deadline`, so an overdue request
    // can't be flagged without it. Verified live via GET /customer/tickets/5
    // that a "New" ticket can already have a past sla_deadline, so overdue
    // applies from creation — only completed/cancelled tickets are excluded.
    const ticketsNeedingSla = data.recentTickets.filter(
      t => !['completed', 'cancelled'].includes(t.status?.toLowerCase().replace('_', ' ')) && t.slaDeadline == null
    );
    if (ticketsNeedingSla.length > 0) {
      const results = await Promise.allSettled(ticketsNeedingSla.map(t => getTicketDetail(t.id)));
      const slaById = new Map();
      ticketsNeedingSla.forEach((t, i) => {
        const result = results[i];
        if (result.status === 'fulfilled' && result.value?.slaDeadline) slaById.set(t.id, result.value.slaDeadline);
      });
      data.recentTickets = data.recentTickets.map(t => (slaById.has(t.id) ? { ...t, slaDeadline: slaById.get(t.id) } : t));
    }

    return data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
