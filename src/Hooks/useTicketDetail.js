import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTicketDetail, rateTicket } from '../Redux/slices/myTicketsSlice';

export function useTicketDetail(ticketId) {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.myTickets.detail);
  const status = useSelector(state => state.myTickets.detailStatus);
  const error = useSelector(state => state.myTickets.detailError);
  const rateStatus = useSelector(state => state.myTickets.rateStatus);
  const rateError = useSelector(state => state.myTickets.rateError);

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

    rateLoading: rateStatus === 'loading',
    rateError,
    rate: (rating, note) => dispatch(rateTicket({ ticketId, rating, note })),
  };
}
