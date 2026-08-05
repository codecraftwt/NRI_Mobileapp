import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRmRequestDetail,
  addRmRequestNote,
  escalateRmRequest,
  resetRmRequestDetail,
} from '../../Redux/slices/rmRequestDetailSlice';

export function useRmRequestDetail(ticket) {
  const dispatch = useDispatch();
  const detail = useSelector(s => s.rmRequestDetail.detail);
  const status = useSelector(s => s.rmRequestDetail.status);
  const error = useSelector(s => s.rmRequestDetail.error);
  const addNoteStatus = useSelector(s => s.rmRequestDetail.addNoteStatus);
  const addNoteError = useSelector(s => s.rmRequestDetail.addNoteError);
  const escalateStatus = useSelector(s => s.rmRequestDetail.escalateStatus);
  const escalateError = useSelector(s => s.rmRequestDetail.escalateError);

  // Refetch whenever the ticket changes; reset on unmount so the next request
  // never flashes the previous one's data.
  useEffect(() => {
    if (ticket != null) dispatch(fetchRmRequestDetail(ticket));
    return () => dispatch(resetRmRequestDetail());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  return {
    detail,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    refresh: () => dispatch(fetchRmRequestDetail(ticket)),

    addNote: (note) => dispatch(addRmRequestNote({ ticket, note })),
    addingNote: addNoteStatus === 'loading',
    addNoteError,

    escalate: ({ reason, escalatedTo }) => dispatch(escalateRmRequest({ ticket, reason, escalatedTo })),
    escalating: escalateStatus === 'loading',
    escalateError,
  };
}
