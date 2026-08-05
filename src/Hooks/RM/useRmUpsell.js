import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRmUpsell } from '../../Redux/slices/rmUpsellSlice';

export function useRmUpsell() {
  const dispatch = useDispatch();
  const opportunities = useSelector(s => s.rmUpsell.opportunities);
  const totalValue = useSelector(s => s.rmUpsell.totalValue);
  const status = useSelector(s => s.rmUpsell.status);
  const error = useSelector(s => s.rmUpsell.error);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchRmUpsell());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    opportunities,
    totalValue,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    refresh: () => dispatch(fetchRmUpsell()),
  };
}
