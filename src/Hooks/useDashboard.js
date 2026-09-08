import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard } from '../Redux/slices/dashboardSlice';
import { setPendingFromDashboard } from '../Redux/slices/pendingRequestsSlice';
import { onboardingUserKey } from '../Redux/slices/onboardingSlice';

export function useDashboard() {
  const dispatch = useDispatch();
  const data = useSelector(state => state.dashboard.data);
  const status = useSelector(state => state.dashboard.status);
  const error = useSelector(state => state.dashboard.error);
  const userId = useSelector(state => onboardingUserKey(state.user.user));

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchDashboard());
    }
  }, [status, dispatch]);

  // Reconcile the server's authoritative pending-item lists into local state
  // every time the dashboard refreshes — this is what surfaces a request paid
  // for from another device/session (e.g. the web app) that this device's
  // own local tracking could never have known about.
  useEffect(() => {
    if (!data || userId == null) return;
    dispatch(setPendingFromDashboard({
      userId,
      ticketFinalizations: data.pendingTicketFinalizations || [],
      checkoutBundles: data.pendingCheckoutBundles || [],
      subscriptionFinalizations: data.pendingSubscriptionFinalizations || [],
    }));
  }, [data, userId, dispatch]);

  return {
    data,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchDashboard()),
  };
}
