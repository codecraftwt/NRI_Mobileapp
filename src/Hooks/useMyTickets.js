import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMyTickets } from '../Redux/slices/myTicketsSlice';

export function useMyTickets(page = 1) {
  const dispatch = useDispatch();
  const tickets = useSelector(state => state.myTickets.tickets);
  const meta = useSelector(state => state.myTickets.meta);
  const status = useSelector(state => state.myTickets.status);
  const error = useSelector(state => state.myTickets.error);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchMyTickets({ page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    tickets,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchMyTickets({ page: p })),
    retry: () => dispatch(fetchMyTickets({ page })),
  };
}
