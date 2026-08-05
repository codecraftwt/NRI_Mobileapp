import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRmEscalations } from '../../Redux/slices/rmEscalationsSlice';

export function useRmEscalations(page = 1) {
  const dispatch = useDispatch();
  const escalations = useSelector(s => s.rmEscalations.escalations);
  const meta = useSelector(s => s.rmEscalations.meta);
  const status = useSelector(s => s.rmEscalations.status);
  const error = useSelector(s => s.rmEscalations.error);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchRmEscalations({ page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    escalations,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchRmEscalations({ page: p })),
    refresh: () => dispatch(fetchRmEscalations({ page })),
  };
}
