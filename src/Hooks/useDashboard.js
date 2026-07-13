import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDashboard } from '../Redux/slices/dashboardSlice';

export function useDashboard() {
  const dispatch = useDispatch();
  const data = useSelector(state => state.dashboard.data);
  const status = useSelector(state => state.dashboard.status);
  const error = useSelector(state => state.dashboard.error);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchDashboard());
    }
  }, [status, dispatch]);

  return {
    data,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchDashboard()),
  };
}
