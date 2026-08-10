import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVendorDashboard } from '../../Redux/slices/vendorDashboardSlice';

export function useVendorDashboard() {
  const dispatch = useDispatch();
  const counts = useSelector(s => s.vendorDashboard.counts);
  const pendingPayout = useSelector(s => s.vendorDashboard.pendingPayout);
  const recentJobs = useSelector(s => s.vendorDashboard.recentJobs);
  const vendorStatus = useSelector(s => s.vendorDashboard.vendorStatus);
  const reqStatus = useSelector(s => s.vendorDashboard.status);
  const error = useSelector(s => s.vendorDashboard.error);

  useEffect(() => {
    if (reqStatus === 'idle') dispatch(fetchVendorDashboard());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    counts,
    pendingPayout,
    recentJobs,
    vendorStatus,
    loading: reqStatus === 'loading',
    failed: reqStatus === 'failed',
    error,
    refresh: () => dispatch(fetchVendorDashboard()),
  };
}
