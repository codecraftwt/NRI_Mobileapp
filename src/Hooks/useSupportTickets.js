import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchSupportTickets, fetchSupportCategories, createSupportTicket, resetCreateStatus } from '../Redux/slices/supportTicketsSlice';

export function useSupportTickets(page = 1) {
  const dispatch = useDispatch();
  const tickets = useSelector(state => state.supportTickets.tickets);
  const categories = useSelector(state => state.supportTickets.categories);
  const categoriesStatus = useSelector(state => state.supportTickets.categoriesStatus);
  const meta = useSelector(state => state.supportTickets.meta);
  const status = useSelector(state => state.supportTickets.status);
  const error = useSelector(state => state.supportTickets.error);
  const createStatus = useSelector(state => state.supportTickets.createStatus);
  const createError = useSelector(state => state.supportTickets.createError);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchSupportTickets({ page }));
    // Categories are a static, cacheable catalog — fetch once per session.
    if (categoriesStatus === 'idle') dispatch(fetchSupportCategories());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    tickets,
    categories,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchSupportTickets({ page: p })),
    retry: () => dispatch(fetchSupportTickets({ page })),

    createLoading: createStatus === 'loading',
    createError,
    create: (payload) => dispatch(createSupportTicket(payload)),
    resetCreate: () => dispatch(resetCreateStatus()),
  };
}
