import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminVendors } from '../../Redux/slices/adminVendorsSlice';

export function useAdminVendors(search = '') {
  const dispatch = useDispatch();
  const vendors = useSelector(s => s.adminVendors.vendors);
  const meta = useSelector(s => s.adminVendors.meta);
  const status = useSelector(s => s.adminVendors.status);
  const error = useSelector(s => s.adminVendors.error);

  // Debounce search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => dispatch(fetchAdminVendors({ search: search.trim() || undefined })), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const fetchNextPage = () => {
    if (status !== 'loading' && meta && meta.currentPage < meta.lastPage) {
      dispatch(fetchAdminVendors({ search: search.trim() || undefined, page: meta.currentPage + 1 }));
    }
  };

  return {
    vendors,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchNextPage,
    refresh: () => dispatch(fetchAdminVendors({ search: search.trim() || undefined })),
  };
}
