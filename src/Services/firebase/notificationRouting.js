import { store } from '../../Redux/store';
import { navigate } from '../../Navigations/navigationRef';

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

export function handleNotificationNavigation(data) {
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
  // RM screens live under the Dashboard tab of the RMHome tab navigator, so we
  // deep-link as RMHome → Dashboard → <screen>. Order matters: the more specific
  // support-ticket / request-chat routes are matched before the generic ones.
  if (isRm) {
    const toDashboard = (screen, params) =>
      navigate('RMHome', { screen: 'Dashboard', params: params ? { screen, params } : { screen } });
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
    return navigate('RMHome');
  }

  // Support / chat replies → the role's Support area.
  if (/support|chat|dispute/.test(hay)) {
    if (isVendor) return navigate('VendorHome', { screen: 'Support', params: { screen: 'SupportMain' } });
    return navigate('AppHome', { screen: 'Requests', params: { screen: 'RequestsMain' } });
  }

  // Vendor job events (assigned, SLA breach, report reviewed, …).
  if (isVendor) {
    if (id && /job|ticket|sla/.test(hay)) {
      return navigate('VendorHome', { screen: 'MyJobs', params: { screen: 'JobDetail', params: { ticketId: id } } });
    }
    if (/earning|payout/.test(hay)) {
      return navigate('VendorHome', { screen: 'Earnings', params: { screen: 'EarningsMain' } });
    }
    return navigate('VendorHome');
  }

  // Customer ticket/request events.
  if (id && /ticket|request|job|sla/.test(hay)) {
    return navigate('AppHome', { screen: 'Requests', params: { screen: 'TicketDetail', params: { ticketId: id } } });
  }
  // Fallback — just bring the app to its home.
  return navigate('AppHome');
}
