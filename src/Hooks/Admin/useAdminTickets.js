import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { fetchAdminTickets } from '../../Redux/slices/adminTicketsSlice';

export function useAdminTickets(search = '', status = 'all') {
  const dispatch = useDispatch();
  const tickets = useSelector(s => s.adminTickets.tickets);
  const meta = useSelector(s => s.adminTickets.meta);
  const sliceStatus = useSelector(s => s.adminTickets.status);
  const error = useSelector(s => s.adminTickets.error);

  const statusParam = status === 'all' ? undefined : status;

  // Re-fetch whenever search text or status filter changes.
  useEffect(() => {
    const delay = search ? 350 : 0;
    const t = setTimeout(() => {
      dispatch(fetchAdminTickets({
        search: search.trim() || undefined,
        status: statusParam,
      }));
    }, delay);
    return () => clearTimeout(t);
  }, [dispatch, search, statusParam]);

  // Re-fetch whenever the Tickets screen gains focus.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchAdminTickets({
        search: search.trim() || undefined,
        status: statusParam,
      }));
    }, [dispatch, search, statusParam])
  );

  const fetchNextPage = () => {
    if (sliceStatus !== 'loading' && meta && meta.currentPage < meta.lastPage) {
      dispatch(fetchAdminTickets({
        search: search.trim() || undefined,
        status: statusParam,
        page: meta.currentPage + 1,
      }));
    }
  };

  return {
    tickets,
    meta,
    statusCounts: meta?.statusCounts || {},
    total: meta?.total ?? 0,
    loading: sliceStatus === 'loading',
    failed: sliceStatus === 'failed',
    error,
    fetchNextPage,
    refresh: () => dispatch(fetchAdminTickets({
      search: search.trim() || undefined,
      status: statusParam,
    })),
  };
}
