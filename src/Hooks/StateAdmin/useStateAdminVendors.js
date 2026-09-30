import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStateAdminVendors, fetchNextStateAdminVendors } from '../../Redux/slices/stateAdminVendorsSlice';

export function useStateAdminVendors({
  initialSearch = '',
  initialStatus = 'all',
  initialVendorType = 'all',
  categoryId,
  serviceId,
} = {}) {
  const dispatch = useDispatch();
  const vendors = useSelector(s => s.stateAdminVendors?.vendors || []);
  const meta = useSelector(s => s.stateAdminVendors?.meta);
  const status = useSelector(s => s.stateAdminVendors?.status || 'idle');
  const error = useSelector(s => s.stateAdminVendors?.error);

  const [search, setSearch] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [filterType, setFilterType] = useState(initialVendorType);

  const debounceTimer = useRef(null);

  const loadVendors = useCallback((overrideParams = {}) => {
    return dispatch(
      fetchStateAdminVendors({
        search: overrideParams.search !== undefined ? overrideParams.search : search,
        status: overrideParams.status !== undefined ? overrideParams.status : filterStatus,
        vendorType: overrideParams.vendorType !== undefined ? overrideParams.vendorType : filterType,
        categoryId,
        serviceId,
        page: 1,
      })
    );
  }, [dispatch, search, filterStatus, filterType, categoryId, serviceId]);

  const fetchNextPage = useCallback(() => {
    if (status === 'loading' || status === 'loadingMore') return;
    if (meta?.currentPage >= meta?.lastPage) return;
    dispatch(
      fetchNextStateAdminVendors({
        search,
        status: filterStatus,
        vendorType: filterType,
        categoryId,
        serviceId,
      })
    );
  }, [dispatch, search, filterStatus, filterType, categoryId, serviceId, status, meta]);

  const refresh = useCallback(() => {
    return loadVendors();
  }, [loadVendors]);

  // Handle search with debounce
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadVendors();
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [search, filterStatus, filterType]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    vendors,
    meta,
    loading: status === 'loading',
    loadingMore: status === 'loadingMore',
    failed: status === 'failed',
    error,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    filterType,
    setFilterType,
    fetchNextPage,
    refresh,
  };
}
