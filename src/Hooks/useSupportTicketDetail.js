import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSupportTicketDetail, replySupportTicket, escalateSupportTicket } from '../Redux/slices/supportTicketsSlice';

export function useSupportTicketDetail(ticketId) {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.supportTickets.detail);
  const replies = useSelector(state => state.supportTickets.replies);
  const status = useSelector(state => state.supportTickets.detailStatus);
  const error = useSelector(state => state.supportTickets.detailError);
  const replyStatus = useSelector(state => state.supportTickets.replyStatus);
  const replyError = useSelector(state => state.supportTickets.replyError);
  const escalateStatus = useSelector(state => state.supportTickets.escalateStatus);
  const escalateError = useSelector(state => state.supportTickets.escalateError);

  useEffect(() => {
    if (ticketId) dispatch(fetchSupportTicketDetail(ticketId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const isCurrent = detail && detail.id === ticketId;

  return {
    detail: isCurrent ? detail : null,
    replies: isCurrent ? replies : [],
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => ticketId && dispatch(fetchSupportTicketDetail(ticketId)),

    replyLoading: replyStatus === 'loading',
    replyError,
    reply: (message) => dispatch(replySupportTicket({ ticketId, message })),

    escalateLoading: escalateStatus === 'loading',
    escalateError,
    escalate: () => dispatch(escalateSupportTicket(ticketId)),
  };
}
