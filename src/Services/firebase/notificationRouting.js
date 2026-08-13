import { CommonActions } from '@react-navigation/native';
import { store } from '../../Redux/store';
import { navigate, dispatch } from '../../Navigations/navigationRef';
import { getSupportTickets } from '../../Api/supportTicketApi';
import { getVendorJobs, getVendorJobSupportChat } from '../../Api/Vendor/vendorJobsApi';

/**
 * Routes a tapped push notification to the right in-app screen.
 *
 * The backend push `data` carries `{ event, url }` where `url` is a WEB route
 * (e.g. https://app.com/vendor/jobs/123) — not a mobile deep link. Until the
 * backend adds a role-aware screen identifier, we parse the entity + trailing
 * id out of the url/event and map it to a screen based on the signed-in role.
 */

// Last numeric segment of a path — the entity id in these web routes.
function extractId(url) {
  if (!url) return null;
  const matches = String(url).match(/(\d+)(?!.*\d)/);
  return matches ? Number(matches[1]) : null;
}

// Fall back to common id-bearing keys the backend may send instead of a url
// (e.g. { ticket_id: 23 }). The notification's own `id` is usually a uuid, so
// numeric entity keys are preferred and generic `id` is checked last.
function idFromData(data) {
  if (!data || typeof data !== 'object') return null;
  const keys = [
    'ticket_id', 'ticketId', 'support_ticket_id', 'supportTicketId',
    'request_id', 'requestId', 'escalation_id', 'escalationId',
    'model_id', 'modelId', 'entity_id', 'entityId', 'id',
  ];
  for (const k of keys) {
    const v = data[k];
    if (v != null && v !== '' && !isNaN(Number(v))) return Number(v);
  }
  return null;
}

function currentRole() {
  return String(store.getState()?.user?.user?.role || '').toLowerCase();
}

// Ticket number embedded in the title/message/url, e.g. "SUP-2026-00022".
function extractTicketNumber(data) {
  const s = `${data?.title || ''} ${data?.message || ''} ${data?.url || ''}`;
  const m = s.match(/[A-Z]{2,}-\d{4}-\d+/i);
  return m ? m[0].toUpperCase() : undefined;
}

// A support-ticket is identified unambiguously by its "SUP-YYYY-NNNNN" number.
// Scan the whole payload (title/message/url + any data field) so it's found
// wherever the backend put it — the request number (NRI-…) in the subject must
// not be mistaken for it.
function extractSupportTicketNumber(data) {
  let s = `${data?.title || ''} ${data?.message || ''} ${data?.url || ''}`;
  try { s += ` ${JSON.stringify(data)}`; } catch (e) { /* ignore */ }
  const m = s.match(/SUP-\d{4}-\d+/i);
  return m ? m[0].toUpperCase() : undefined;
}

function extractRequestTicketNumber(data) {
  let s = `${data?.title || ''} ${data?.message || ''} ${data?.url || ''}`;
  try { s += ` ${JSON.stringify(data)}`; } catch (e) { /* ignore */ }
  const m = s.match(/NRI-\d{4}-\d+/i);
  return m ? m[0].toUpperCase() : undefined;
}

// The customer support-ticket chat needs the numeric id, but the notification
// only carries the SUP-… number. Resolve number → id via the customer's
// support-ticket list (the ticket is recent, so it's on the first page/s),
// then open that exact thread. Falls back to the list if it can't be resolved.
async function openCustomerSupportTicketByNumber(ticketNumber, openChat) {
  try {
    let page = 1;
    let lastPage = 1;
    do {
      const { tickets, meta } = await getSupportTickets({ page });
      lastPage = meta?.lastPage || 1;
      const match = (tickets || []).find(t => (t.ticketNumber || '').toUpperCase() === ticketNumber);
      if (match?.id != null) return openChat(match.id);
      page += 1;
    } while (page <= lastPage && page <= 5);
  } catch (e) { /* fall through to the list */ }
  return navigate('AppHome', { screen: 'Requests', params: { screen: 'RequestsMain' } });
}

async function findVendorJobIdByTicketNumber(ticketNumber) {
  if (!ticketNumber) return null;
  try {
    const { jobs } = await getVendorJobs({ search: ticketNumber });
    const match = (jobs || []).find(job => (job.ticket || '').toUpperCase() === ticketNumber);
    return match?.id || null;
  } catch (e) { /* fall through to normal vendor routing */ }
  return null;
}

async function getMatchingVendorSupportJobId(data) {
  const supportTicketNumber = extractSupportTicketNumber(data);
  const requestTicketNumber = extractRequestTicketNumber(data);
  if (!supportTicketNumber || !requestTicketNumber) return null;

  const jobId = await findVendorJobIdByTicketNumber(requestTicketNumber);
  if (!jobId) return null;

  try {
    const { chat } = await getVendorJobSupportChat(jobId);
    return (chat?.ticketNumber || '').toUpperCase() === supportTicketNumber ? jobId : null;
  } catch (e) { /* fall through to normal vendor routing */ }
  return null;
}

// Deep-link into a screen under the vendor My Jobs tab by rebuilding the whole
// navigation tree. The My Jobs stack becomes [MyJobsMain, <screen>] so Back
// always lands on MyJobs.js, the Home (Dashboard) tab is reset to its root so
// it never re-surfaces a leftover Notifications screen, and the other tabs are
// reset to their roots. Rebuilding the state — rather than navigate() — is what
// clears the stale screens notification taps used to leave behind.
function resetVendorToMyJobs(screen, params) {
  dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'VendorHome',
          state: {
            index: 1, // My Jobs tab focused
            routes: [
              { name: 'Dashboard', state: { index: 0, routes: [{ name: 'DashboardMain' }] } },
              { name: 'MyJobs', state: { index: 1, routes: [{ name: 'MyJobsMain' }, { name: screen, params }] } },
              { name: 'Earnings', state: { index: 0, routes: [{ name: 'EarningsMain' }] } },
              { name: 'Support', state: { index: 0, routes: [{ name: 'SupportMain' }] } },
              { name: 'Profile', state: { index: 0, routes: [{ name: 'ProfileMain' }] } },
            ],
          },
        },
      ],
    })
  );
}

// Pop the in-app Notifications screen off its (Home/Dashboard) stack before
// deep-linking to a different tab, so the Home tab never re-shows it.
function closeInAppNotifications(nav) {
  if (nav && typeof nav.popToTop === 'function') {
    try { nav.popToTop(); } catch (e) { /* ignore */ }
  }
}

// Deep-link into a screen under the RM Dashboard tab by rebuilding the whole
// navigation tree (mirrors resetVendorToMyJobs / resetCustomerRequests): the
// Dashboard stack becomes [DashboardMain, <screen>] so Back lands on the RM
// dashboard, the leftover Notifications screen is dropped, and the other tabs
// are reset to their roots.
function resetRmDashboard(screen, params) {
  dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'RMHome',
          state: {
            index: 0, // Dashboard tab focused
            routes: [
              { name: 'Dashboard', state: { index: 1, routes: [{ name: 'DashboardMain' }, { name: screen, params }] } },
              { name: 'Customers', state: { index: 0, routes: [{ name: 'MyCustomersMain' }] } },
              { name: 'TicketsTab', state: { index: 0, routes: [{ name: 'TicketsMain' }] } },
              { name: 'Profile', state: { index: 0, routes: [{ name: 'ProfileMain' }] } },
            ],
          },
        },
      ],
    })
  );
}

// Deep-link into a screen under the customer Requests tab by rebuilding the
// whole navigation tree (mirrors resetVendorToMyJobs): the Requests stack
// becomes [RequestsMain, <screen>] so Back lands on the request list, the Home
// (Dashboard) tab is reset to its root so it never re-surfaces a leftover
// Notifications screen, and the other tabs are reset to their roots.
function resetCustomerRequests(screen, params) {
  const requestsState = screen && screen !== 'RequestsMain'
    ? { index: 1, routes: [{ name: 'RequestsMain' }, { name: screen, params }] }
    : { index: 0, routes: [{ name: 'RequestsMain' }] };
  dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'AppHome',
          state: {
            index: 2, // Requests tab focused
            routes: [
              { name: 'Dashboard', state: { index: 0, routes: [{ name: 'DashboardMain' }] } },
              { name: 'Services', state: { index: 0, routes: [{ name: 'ServicesMain' }] } },
              { name: 'Requests', state: requestsState },
              { name: 'Profile', state: { index: 0, routes: [{ name: 'ProfileMain' }] } },
            ],
          },
        },
      ],
    })
  );
}

// `nav` is the in-app Notifications screen's own navigation prop (passed only
// for taps on the in-app list). Taps pop it off the Home stack and deep-link
// through the tab navigators instead, so the Home tab is never left showing
// the Notifications list and Back lands on the target tab's root screen.
// Real push-notification taps pass no `nav` and deep-link the same way.
export async function handleNotificationNavigation(data, nav) {
  if (!data) return;
  // Don't push a signed-out user into an authenticated area.
  if (!store.getState()?.user?.isAuthenticated) return;
  const url = String(data.url || '');
  const event = String(data.event || data.type || '').toLowerCase();
  // Match against the whole payload so routing works regardless of which key
  // carries the entity hint (url, event, type, model name, *_id, …).
  let blob = '';
  try { blob = JSON.stringify(data).toLowerCase(); } catch (e) { blob = ''; }
  const hay = `${url.toLowerCase()} ${event} ${blob}`;
  const id = extractId(url) ?? idFromData(data);
  const role = currentRole();
  const isVendor = /vendor/.test(role);
  const isRm = /relationship|manager|\brm\b/.test(role);

  // ---- Relationship Manager ----
  // RM screens live under the Dashboard tab of the RMHome tab navigator. The
  // navigation tree is rebuilt around the target (see resetRmDashboard) so
  // Back always lands on the RM dashboard and the Home tab is never left
  // showing the Notifications screen. Order matters: the more specific
  // support-ticket / request-chat routes are matched before the generic ones.
  if (isRm) {
    const toDashboard = (screen, params) => resetRmDashboard(screen, params);
    // General-support ticket thread (customer-raised support ticket). The
    // notification url carries the ticket id (/support-tickets/47); we also
    // pass the SUP-… number from the message for the header.
    if (id && /support[-_ ]?ticket/.test(hay)) {
      return toDashboard('RMSupportTicketDetail', { ticketId: id, ticketNumber: extractTicketNumber(data) });
    }
    // Request support chat (/rm/requests/{id}/support-chat).
    if (id && /support[-_ ]?chat/.test(hay)) {
      return toDashboard('RMSupportChat', { ticketId: id });
    }
    // Escalations tracker.
    if (/escalat/.test(hay)) {
      return toDashboard('Escalations');
    }
    // A customer request / ticket / SLA event → the ticket detail.
    if (id && /request|ticket|job|sla/.test(hay)) {
      return toDashboard('TicketDetail', { ticketId: id });
    }
    // Generic support/chat keyword with no id → the general-support list.
    if (/support|chat|dispute/.test(hay)) {
      return toDashboard('GeneralSupport');
    }
    closeInAppNotifications(nav);
    return navigate('RMHome');
  }

  // Customer support-ticket reply. Identified by its SUP-… number and/or a
  // support-tickets url (e.g. /my/support-tickets/6). Open that exact ticket's
  // chat thread: prefer the id from the url (the last path segment), and only
  // fall back to resolving the SUP-… number via the list when there's no id.
  // Always land on the Requests tab (not pushed onto the current stack) so
  // Back returns to the request list and the Home tab isn't left showing the
  // Notifications screen.
  const openCustomerChat = (ticketId) => {
    closeInAppNotifications(nav);
    return resetCustomerRequests('SupportTicketChat', { ticketId });
  };

  if (!isVendor) {
    const supNumber = extractSupportTicketNumber(data);
    const isSupportTicket = !!supNumber || /support[-_ ]?ticket/.test(hay);
    if (isSupportTicket) {
      if (id) return openCustomerChat(id);
      if (supNumber) return openCustomerSupportTicketByNumber(supNumber, openCustomerChat);
    }
  }

  // Support / chat replies → the role's Support area.
  if (isVendor) {
    const supportJobId = await getMatchingVendorSupportJobId(data);
    if (supportJobId) {
      // Always rebuild the My Jobs stack (not just push onto the current one)
      // so Back from the chat lands on MyJobs.js and the Home tab is not left
      // showing the Notifications screen the tap came from.
      return resetVendorToMyJobs('JobSupportChat', { ticketId: supportJobId });
    }
  }

  if (/support|chat|dispute/.test(hay)) {
    if (isVendor) {
      closeInAppNotifications(nav);
      return navigate('VendorHome', { screen: 'Support', params: { screen: 'SupportMain' } });
    }
    closeInAppNotifications(nav);
    return navigate('AppHome', { screen: 'Requests', params: { screen: 'RequestsMain' } });
  }

  // Vendor job events (assigned, SLA breach, report reviewed, …).
  if (isVendor) {
    if (id && /job|ticket|sla/.test(hay)) {
      return resetVendorToMyJobs('JobDetail', { ticketId: id });
    }
    if (/earning|payout/.test(hay)) {
      closeInAppNotifications(nav);
      return navigate('VendorHome', { screen: 'Earnings', params: { screen: 'EarningsMain' } });
    }
    closeInAppNotifications(nav);
    return navigate('VendorHome');
  }

  // Customer ticket/request events. Land on the Requests tab with a clean
  // stack so Back returns to the request list (same reasoning as above).
  if (id && /ticket|request|job|sla/.test(hay)) {
    closeInAppNotifications(nav);
    return resetCustomerRequests('TicketDetail', { ticketId: id });
  }
  // Fallback — just bring the app to its home.
  closeInAppNotifications(nav);
  return navigate('AppHome');
}
