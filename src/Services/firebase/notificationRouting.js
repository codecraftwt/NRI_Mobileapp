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

function currentRole() {
  return String(store.getState()?.user?.user?.role || '').toLowerCase();
}

export function handleNotificationNavigation(data) {
  if (!data) return;
  // Don't push a signed-out user into an authenticated area.
  if (!store.getState()?.user?.isAuthenticated) return;
  const url = String(data.url || '');
  const event = String(data.event || '').toLowerCase();
  const hay = `${url.toLowerCase()} ${event}`;
  const id = extractId(url);
  const role = currentRole();
  const isVendor = /vendor/.test(role);
  const isRm = /relationship|manager|\brm\b/.test(role);

  // Support / chat replies → the role's Support area.
  if (/support|chat|dispute/.test(hay)) {
    if (isVendor) return navigate('VendorHome', { screen: 'Support', params: { screen: 'SupportMain' } });
    if (isRm) return navigate('RMHome');
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

  if (isRm) return navigate('RMHome');

  // Customer ticket/request events.
  if (id && /ticket|request|job|sla/.test(hay)) {
    return navigate('AppHome', { screen: 'Requests', params: { screen: 'TicketDetail', params: { ticketId: id } } });
  }
  // Fallback — just bring the app to its home.
  return navigate('AppHome');
}
