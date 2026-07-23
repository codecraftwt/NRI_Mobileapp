import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPriorities } from '../Redux/slices/catalogSlice';

// One-time request priority tiers (GET /priorities). Session-cached reference
// data — the chosen tier's `slug` is posted as `urgency` when booking a ticket.
export function usePriorities() {
  const dispatch = useDispatch();
  const priorities = useSelector(state => state.catalog.priorities);
  const status = useSelector(state => state.catalog.prioritiesStatus);
  const error = useSelector(state => state.catalog.prioritiesError);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPriorities());
    }
  }, [status, dispatch]);

  return {
    priorities,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchPriorities()),
  };
}
