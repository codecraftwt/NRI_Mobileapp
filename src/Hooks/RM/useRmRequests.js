import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRmRequests } from '../../Redux/slices/rmRequestsSlice';

export function useRmRequests(params) {
  const dispatch = useDispatch();
  const requests = useSelector(s => s.rmRequests.requests);
  const meta = useSelector(s => s.rmRequests.meta);
  const status = useSelector(s => s.rmRequests.status);
  const error = useSelector(s => s.rmRequests.error);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchRmRequests(params || {}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    requests,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchRmRequests({ ...(params || {}), page: p })),
    refresh: (overrides) => dispatch(fetchRmRequests({ ...(params || {}), ...(overrides || {}) })),
  };
}
