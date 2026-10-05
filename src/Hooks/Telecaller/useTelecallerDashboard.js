import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTelecallerDashboard } from '../../Redux/slices/telecallerDashboardSlice';

export function useTelecallerDashboard() {
  const dispatch = useDispatch();
  const stats = useSelector(s => s.telecallerDashboard?.stats);
  const calls = useSelector(s => s.telecallerDashboard?.calls);
  const unreadChats = useSelector(s => s.telecallerDashboard?.unreadChats ?? 0);
  const area = useSelector(s => s.telecallerDashboard?.area);
  const awaitingChats = useSelector(s => s.telecallerDashboard?.awaitingChats || []);
  const linkedRequests = useSelector(s => s.telecallerDashboard?.linkedRequests || []);
  const status = useSelector(s => s.telecallerDashboard?.status || 'idle');
  const error = useSelector(s => s.telecallerDashboard?.error);

  const refresh = useCallback(() => {
    return dispatch(fetchTelecallerDashboard());
  }, [dispatch]);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchTelecallerDashboard());
    }
  }, [status, dispatch]);

  return {
    stats,
    calls,
    unreadChats,
    area,
    awaitingChats,
    linkedRequests,
    loading: status === 'loading',
    failed: status === 'failed',
    status,
    error,
    refresh,
  };
}
