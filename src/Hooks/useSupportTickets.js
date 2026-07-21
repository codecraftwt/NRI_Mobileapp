import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSupportTickets, createSupportTicket, resetCreateStatus } from '../Redux/slices/supportTicketsSlice';

export function useSupportTickets(page = 1) {
  const dispatch = useDispatch();
  const tickets = useSelector(state => state.supportTickets.tickets);
  const meta = useSelector(state => state.supportTickets.meta);
  const status = useSelector(state => state.supportTickets.status);
  const error = useSelector(state => state.supportTickets.error);
  const createStatus = useSelector(state => state.supportTickets.createStatus);
  const createError = useSelector(state => state.supportTickets.createError);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchSupportTickets({ page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    tickets,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchSupportTickets({ page: p })),
    retry: () => dispatch(fetchSupportTickets({ page })),

    createLoading: createStatus === 'loading',
    createError,
    create: (subject, message, ticketId) => dispatch(createSupportTicket({ subject, message, ticketId })),
    resetCreate: () => dispatch(resetCreateStatus()),
  };
}
