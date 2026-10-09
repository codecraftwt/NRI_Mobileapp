import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStateAdminCustomers, fetchNextStateAdminCustomers } from '../../Redux/slices/stateAdminCustomersSlice';

export function useStateAdminCustomers() {
  const dispatch = useDispatch();
  const customers = useSelector(s => s.stateAdminCustomers?.customers || []);
  const meta = useSelector(s => s.stateAdminCustomers?.meta || { currentPage: 1, lastPage: 1, total: 0 });
  const status = useSelector(s => s.stateAdminCustomers?.status || 'idle');
  const error = useSelector(s => s.stateAdminCustomers?.error);

  const loadCustomers = useCallback((params = {}) => {
    return dispatch(fetchStateAdminCustomers(params));
  }, [dispatch]);

  const loadMore = useCallback((params = {}) => {
    if (status === 'loadingMore' || (meta.currentPage >= meta.lastPage)) return;
    dispatch(fetchNextStateAdminCustomers(params));
  }, [dispatch, status, meta]);

  return {
    customers,
    meta,
    loading: status === 'loading',
    loadingMore: status === 'loadingMore',
    status,
    error,
    loadCustomers,
    loadMore,
  };
}
