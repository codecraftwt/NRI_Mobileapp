import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRmDashboard } from '../../Redux/slices/rmDashboardSlice';

export function useRmDashboard() {
  const dispatch = useDispatch();
  const stats = useSelector(s => s.rmDashboard.stats);
  const pendingRequests = useSelector(s => s.rmDashboard.pendingRequests);
  const upcomingBirthdays = useSelector(s => s.rmDashboard.upcomingBirthdays);
  const todayEvents = useSelector(s => s.rmDashboard.todayEvents);
  const status = useSelector(s => s.rmDashboard.status);
  const error = useSelector(s => s.rmDashboard.error);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchRmDashboard());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    stats,
    pendingRequests,
    upcomingBirthdays,
    todayEvents,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    refresh: () => dispatch(fetchRmDashboard()),
  };
}
