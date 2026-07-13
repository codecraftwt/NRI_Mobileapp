import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTicketDetail } from '../Redux/slices/myTicketsSlice';

export function useTicketDetail(ticketId) {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.myTickets.detail);
  const status = useSelector(state => state.myTickets.detailStatus);
  const error = useSelector(state => state.myTickets.detailError);

  useEffect(() => {
    if (ticketId) dispatch(fetchTicketDetail(ticketId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  return {
    detail: detail && detail.id === ticketId ? detail : null,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => ticketId && dispatch(fetchTicketDetail(ticketId)),
  };
}
