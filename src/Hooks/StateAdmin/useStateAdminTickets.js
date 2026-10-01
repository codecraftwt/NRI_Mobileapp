import { useState, useEffect, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStateAdminTickets, fetchNextStateAdminTickets } from '../../Redux/slices/stateAdminTicketsSlice';

export function useStateAdminTickets({
  initialSearch = '',
  initialStatus = 'all',
  initialOpenOnly = false,
  initialSort = 'latest',
} = {}) {
  const dispatch = useDispatch();
  const tickets = useSelector(s => s.stateAdminTickets?.tickets || []);
  const meta = useSelector(s => s.stateAdminTickets?.meta);
  const status = useSelector(s => s.stateAdminTickets?.status || 'idle');
  const error = useSelector(s => s.stateAdminTickets?.error);

  const [search, setSearch] = useState(initialSearch);
  const [filterStatus, setFilterStatus] = useState(initialStatus);
  const [openOnly, setOpenOnly] = useState(initialOpenOnly);
  const [sort, setSort] = useState(initialSort);

  const debounceTimer = useRef(null);

  const loadTickets = useCallback((overrideParams = {}) => {
    return dispatch(
      fetchStateAdminTickets({
        search: overrideParams.search !== undefined ? overrideParams.search : search,
        status: overrideParams.status !== undefined ? overrideParams.status : filterStatus,
        openOnly: overrideParams.openOnly !== undefined ? overrideParams.openOnly : openOnly,
        sort: overrideParams.sort !== undefined ? overrideParams.sort : sort,
        page: 1,
      })
    );
  }, [dispatch, search, filterStatus, openOnly, sort]);

  const fetchNextPage = useCallback(() => {
    if (status === 'loading' || status === 'loadingMore') return;
    if (meta?.currentPage >= meta?.lastPage) return;
    dispatch(
      fetchNextStateAdminTickets({ search, status: filterStatus, openOnly, sort })
    );
  }, [dispatch, search, filterStatus, openOnly, sort, status, meta]);

  const refresh = useCallback(() => {
    return loadTickets();
  }, [loadTickets]);

  // Status/openOnly/sort are discrete taps, not continuous typing — refetch
  // immediately (also covers the very first load on mount) so meta.statusCounts
  // is fresh by the time the filter modal can be opened, instead of sitting
  // behind the same debounce window as search text.
  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, openOnly, sort]);

  // Debounced search — skip the mount-time run above so it doesn't double-fetch.
  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadTickets();
    }, 350);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return {
    tickets,
    meta,
    loading: status === 'loading',
    loadingMore: status === 'loadingMore',
    failed: status === 'failed',
    error,
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    openOnly,
    setOpenOnly,
    sort,
    setSort,
    fetchNextPage,
    refresh,
  };
}
