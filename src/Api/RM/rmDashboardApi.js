import apiClient, { normalizeApiError } from '../client';

// Response field names follow the backend's snake_case; these mappers stay
// tolerant of a couple of plausible key variants — consistent with the other
// dashboard mappers (see vendorDashboardApi.js).

function num(v) {
  return v == null ? 0 : Number(v);
}

// One SLA-queue row shown in the "Pending Requests" list.
function mapPendingRequest(raw = {}) {
  return {
    id: String(raw.id),
    ticket: raw.ticket_number || raw.ticket || '',
    customer: raw.customer_name || raw.customer || '',
    service: raw.service?.name || raw.service_name || 'Service Request',
    status: raw.status || '',
    slaDeadline: raw.sla_deadline || null,
    overdue: !!raw.overdue,
  };
}

function mapBirthday(raw = {}, index = 0) {
  return {
    id: String(raw.id ?? raw.customer_id ?? index),
    name: raw.name || raw.customer_name || '',
    date: raw.date || raw.dob || raw.birthday || null,
    relation: raw.relation || null,
  };
}

// GET /rm/dashboard — the relationship manager's stat counts, SLA queue and
// upcoming birthday alerts. 403 if the account isn't an RM.
export async function getRmDashboard() {
  try {
    const response = await apiClient.get('/rm/dashboard');
    const data = response.data?.data || response.data || {};
    const stats = data.stats || {};
    return {
      stats: {
        myCustomers: num(stats.my_customers),
        openRequests: num(stats.open_requests),
        overdue: num(stats.overdue),
        reportsPending: num(stats.reports_pending),
        renewalsDue: num(stats.renewals_due),
      },
      pendingRequests: (data.pending_requests || []).map(mapPendingRequest),
      upcomingBirthdays: (data.upcoming_birthdays || []).map(mapBirthday),
      todayEvents: data.today_events || [],
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
