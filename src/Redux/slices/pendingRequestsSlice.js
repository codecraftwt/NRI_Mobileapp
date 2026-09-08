import { createSlice } from '@reduxjs/toolkit';
import { onboardingUserKey } from './onboardingSlice';

// Every service request that's been PAID for but not yet finalized (who/where
// + documents not yet submitted) — the ticket doesn't exist server-side until
// that finalize call succeeds, so this is the only client-side record that it
// happened at all. Keyed by user (same pattern as onboarding.completedByUser)
// and persisted + exempt from the auth-identity reset (see store.js) so it
// survives an app kill or a logout/login in between paying and finishing.
//
// Stored as arrays, upserted by paymentId/bundleId — a customer can have more
// than one abandoned-mid-flow payment at once (e.g. paid for a cart request,
// then separately paid for a single-service request, without finishing
// either), and each needs its own entry rather than the newest silently
// overwriting the last.
const initialState = {
  byUser: {}, // { [userId]: { ticketFinalizes: [...], bundleFinishes: [...], subscriptionFinalizes: [...] } }
};

// Defensively normalizes the shape, not just presence — this slice's shape
// changed from single objects ({ticketFinalize, bundleFinish}) to arrays
// ({ticketFinalizes, bundleFinishes}) mid-development. Anyone with an entry
// already persisted under the old shape (or any future shape drift) would
// otherwise crash on `.push`/`.filter` or silently read as empty via a
// selector's `|| []` fallback — self-heal instead of requiring a reinstall.
function entryFor(state, userId) {
  if (!state.byUser[userId]) state.byUser[userId] = {};
  const entry = state.byUser[userId];
  if (!Array.isArray(entry.ticketFinalizes)) entry.ticketFinalizes = [];
  if (!Array.isArray(entry.bundleFinishes)) entry.bundleFinishes = [];
  if (!Array.isArray(entry.subscriptionFinalizes)) entry.subscriptionFinalizes = [];
  return entry;
}

const pendingRequestsSlice = createSlice({
  name: 'pendingRequests',
  initialState,
  reducers: {
    // payload: { userId, paymentId, serviceIds, serviceNames, stateId, cityId,
    //            stateName, cityName, amount, currency, origin: 'cart'|'single' }
    setPendingTicketFinalize: (state, action) => {
      const { userId, ...fields } = action.payload || {};
      if (userId == null || fields.paymentId == null) return;
      const entry = entryFor(state, userId);
      const idx = entry.ticketFinalizes.findIndex(t => t.paymentId === fields.paymentId);
      if (idx >= 0) entry.ticketFinalizes[idx] = fields;
      else entry.ticketFinalizes.push(fields);
    },
    // payload: { userId, paymentId }
    clearPendingTicketFinalize: (state, action) => {
      const { userId, paymentId } = action.payload || {};
      if (userId == null) return;
      const entry = entryFor(state, userId);
      entry.ticketFinalizes = entry.ticketFinalizes.filter(t => t.paymentId !== paymentId);
    },
    // payload: { userId, bundleId, serviceNames, stateId, cityId, stateName, cityName }
    setPendingBundleFinish: (state, action) => {
      const { userId, ...fields } = action.payload || {};
      if (userId == null || fields.bundleId == null) return;
      const entry = entryFor(state, userId);
      const idx = entry.bundleFinishes.findIndex(b => b.bundleId === fields.bundleId);
      if (idx >= 0) entry.bundleFinishes[idx] = fields;
      else entry.bundleFinishes.push(fields);
    },
    // payload: { userId, bundleId }
    clearPendingBundleFinish: (state, action) => {
      const { userId, bundleId } = action.payload || {};
      if (userId == null) return;
      const entry = entryFor(state, userId);
      entry.bundleFinishes = entry.bundleFinishes.filter(b => b.bundleId !== bundleId);
    },
    // payload: { userId, paymentId, serviceIds, serviceNames, stateId, cityId,
    //            stateName, cityName }
    setPendingSubscriptionFinalize: (state, action) => {
      const { userId, ...fields } = action.payload || {};
      if (userId == null || fields.paymentId == null) return;
      const entry = entryFor(state, userId);
      const idx = entry.subscriptionFinalizes.findIndex(s => s.paymentId === fields.paymentId);
      if (idx >= 0) entry.subscriptionFinalizes[idx] = fields;
      else entry.subscriptionFinalizes.push(fields);
    },
    // payload: { userId, paymentId }
    clearPendingSubscriptionFinalize: (state, action) => {
      const { userId, paymentId } = action.payload || {};
      if (userId == null) return;
      const entry = entryFor(state, userId);
      entry.subscriptionFinalizes = entry.subscriptionFinalizes.filter(s => s.paymentId !== paymentId);
    },
    // Reconciles against the authoritative, cross-device server lists from
    // GET /customer/dashboard (`pending_ticket_finalizations` /
    // `pending_checkout_bundles`) — this is what surfaces an item paid from
    // another session/device (e.g. the web app) that this device never set
    // locally, and drops a local record once the server confirms it's no
    // longer pending (finalized elsewhere, or expired).
    //
    // A record the server lists but this device never originated (no local
    // match) only carries what the server gives us — payment/bundle id,
    // serviceNames, display amount/currency — none of the richer local-only
    // context (serviceIds, state/city) a same-device finalize normally has.
    // FinishRequest/etc. degrade gracefully without it (e.g. no required-
    // documents lookup, no taluka options) rather than failing.
    // payload: { userId, ticketFinalizations: [{paymentId,...}], checkoutBundles: [{bundleId,...}],
    //            subscriptionFinalizations: [{paymentId,...}] }
    setPendingFromDashboard: (state, action) => {
      const { userId, ticketFinalizations = [], checkoutBundles = [], subscriptionFinalizations = [] } = action.payload || {};
      if (userId == null) return;
      const entry = entryFor(state, userId);

      const serverTicketIds = new Set(ticketFinalizations.map(t => t.paymentId));
      const mergedTickets = entry.ticketFinalizes
        .filter(t => serverTicketIds.has(t.paymentId))
        .map(local => {
          const server = ticketFinalizations.find(t => t.paymentId === local.paymentId);
          return { ...local, serviceNames: server.serviceNames ?? local.serviceNames, amount: server.amount ?? local.amount, currency: server.currency ?? local.currency };
        });
      const localTicketIds = new Set(mergedTickets.map(t => t.paymentId));
      ticketFinalizations.forEach(server => {
        if (!localTicketIds.has(server.paymentId)) mergedTickets.push(server);
      });
      entry.ticketFinalizes = mergedTickets;

      const serverBundleIds = new Set(checkoutBundles.map(b => b.bundleId));
      const mergedBundles = entry.bundleFinishes
        .filter(b => serverBundleIds.has(b.bundleId))
        .map(local => {
          const server = checkoutBundles.find(b => b.bundleId === local.bundleId);
          return { ...local, serviceNames: server.serviceNames ?? local.serviceNames };
        });
      const localBundleIds = new Set(mergedBundles.map(b => b.bundleId));
      checkoutBundles.forEach(server => {
        if (!localBundleIds.has(server.bundleId)) mergedBundles.push(server);
      });
      entry.bundleFinishes = mergedBundles;

      const serverSubscriptionIds = new Set(subscriptionFinalizations.map(s => s.paymentId));
      const mergedSubscriptions = entry.subscriptionFinalizes
        .filter(s => serverSubscriptionIds.has(s.paymentId))
        .map(local => {
          const server = subscriptionFinalizations.find(s => s.paymentId === local.paymentId);
          return { ...local, serviceNames: server.serviceNames ?? local.serviceNames, amount: server.amount ?? local.amount, currency: server.currency ?? local.currency };
        });
      const localSubscriptionIds = new Set(mergedSubscriptions.map(s => s.paymentId));
      subscriptionFinalizations.forEach(server => {
        if (!localSubscriptionIds.has(server.paymentId)) mergedSubscriptions.push(server);
      });
      entry.subscriptionFinalizes = mergedSubscriptions;
    },
  },
});

export const {
  setPendingTicketFinalize,
  clearPendingTicketFinalize,
  setPendingBundleFinish,
  clearPendingBundleFinish,
  setPendingSubscriptionFinalize,
  clearPendingSubscriptionFinalize,
  setPendingFromDashboard,
} = pendingRequestsSlice.actions;

export function selectPendingTicketFinalizes(state) {
  const userId = onboardingUserKey(state.user.user);
  if (userId == null) return [];
  return state.pendingRequests.byUser[userId]?.ticketFinalizes || [];
}

export function selectPendingBundleFinishes(state) {
  const userId = onboardingUserKey(state.user.user);
  if (userId == null) return [];
  return state.pendingRequests.byUser[userId]?.bundleFinishes || [];
}

export function selectPendingSubscriptionFinalizes(state) {
  const userId = onboardingUserKey(state.user.user);
  if (userId == null) return [];
  return state.pendingRequests.byUser[userId]?.subscriptionFinalizes || [];
}

export function selectPendingTicketFinalizeByPaymentId(paymentId) {
  return (state) => selectPendingTicketFinalizes(state).find(t => t.paymentId === paymentId) || null;
}

export function selectPendingBundleFinishByBundleId(bundleId) {
  return (state) => selectPendingBundleFinishes(state).find(b => b.bundleId === bundleId) || null;
}

export function selectPendingSubscriptionFinalizeByPaymentId(paymentId) {
  return (state) => selectPendingSubscriptionFinalizes(state).find(s => s.paymentId === paymentId) || null;
}

export default pendingRequestsSlice.reducer;
