import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRmCustomers } from '../../Redux/slices/rmCustomersSlice';

export function useRmCustomers(search = '') {
  const dispatch = useDispatch();
  const customers = useSelector(s => s.rmCustomers.customers);
  const meta = useSelector(s => s.rmCustomers.meta);
  const status = useSelector(s => s.rmCustomers.status);
  const error = useSelector(s => s.rmCustomers.error);

  // Debounce search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => dispatch(fetchRmCustomers({ search: search.trim() || undefined })), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchNextPage = () => {
    if (status !== 'loading' && meta && meta.currentPage < meta.lastPage) {
      dispatch(fetchRmCustomers({ search: search.trim() || undefined, page: meta.currentPage + 1 }));
    }
  };

  return {
    customers,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchNextPage,
    refresh: () => dispatch(fetchRmCustomers({ search: search.trim() || undefined })),
  };
}
