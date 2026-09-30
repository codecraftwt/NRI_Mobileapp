import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStateAdminDashboard } from '../../Redux/slices/stateAdminDashboardSlice';

export function useStateAdminDashboard() {
  const dispatch = useDispatch();
  const scope = useSelector(s => s.stateAdminDashboard?.scope);
  const stats = useSelector(s => s.stateAdminDashboard?.stats);
  const recentTickets = useSelector(s => s.stateAdminDashboard?.recentTickets || []);
  const slaBreakdown = useSelector(s => s.stateAdminDashboard?.slaBreakdown);
  const monthlyRevenueTrend = useSelector(s => s.stateAdminDashboard?.monthlyRevenueTrend || []);
  const districtBreakdown = useSelector(s => s.stateAdminDashboard?.districtBreakdown || []);
  const status = useSelector(s => s.stateAdminDashboard?.status || 'idle');
  const error = useSelector(s => s.stateAdminDashboard?.error);

  const refresh = useCallback(() => {
    return dispatch(fetchStateAdminDashboard());
  }, [dispatch]);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchStateAdminDashboard());
    }
  }, [status, dispatch]);

  return {
    scope,
    stats,
    recentTickets,
    slaBreakdown,
    monthlyRevenueTrend,
    districtBreakdown,
    loading: status === 'loading',
    failed: status === 'failed',
    status,
    error,
    refresh,
  };
}
