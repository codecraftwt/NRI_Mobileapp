import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAdminCustomers } from '../../Redux/slices/adminCustomersSlice';

// `membershipStatus` is one of active|pending|none, or '' for all.
// `nriCountry` filters by the customer's NRI country of residence.
export function useAdminCustomers(search = '', membershipStatus = '', nriCountry = '') {
  const dispatch = useDispatch();
  const customers = useSelector(s => s.adminCustomers.customers);
  const meta = useSelector(s => s.adminCustomers.meta);
  const status = useSelector(s => s.adminCustomers.status);
  const error = useSelector(s => s.adminCustomers.error);

  const buildParams = (extra) => ({
    search: search.trim() || undefined,
    membershipStatus: membershipStatus || undefined,
    nriCountry: nriCountry.trim() || undefined,
    ...extra,
  });

  // Debounce so typing doesn't fire a request per keystroke; the membership
  // filter re-triggers this effect too (no separate debounce needed).
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(fetchAdminCustomers(buildParams()));
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, membershipStatus, nriCountry]);

  const fetchNextPage = () => {
    if (status !== 'loading' && meta && meta.currentPage < meta.lastPage) {
      dispatch(fetchAdminCustomers(buildParams({ page: meta.currentPage + 1 })));
    }
  };

  return {
    customers,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchNextPage,
    refresh: () => dispatch(fetchAdminCustomers(buildParams())),
  };
}
