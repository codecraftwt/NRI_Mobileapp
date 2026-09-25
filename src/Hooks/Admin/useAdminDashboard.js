import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminDashboard } from '../../Redux/slices/adminDashboardSlice';

export function useAdminDashboard() {
  const dispatch = useDispatch();
  const stats = useSelector(s => s.adminDashboard.stats);
  const stateBreakdown = useSelector(s => s.adminDashboard.stateBreakdown);
  const rolesSummary = useSelector(s => s.adminDashboard.rolesSummary);
  const status = useSelector(s => s.adminDashboard.status);
  const error = useSelector(s => s.adminDashboard.error);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchAdminDashboard());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    stats,
    stateBreakdown,
    rolesSummary,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    refresh: () => dispatch(fetchAdminDashboard()),
  };
}
