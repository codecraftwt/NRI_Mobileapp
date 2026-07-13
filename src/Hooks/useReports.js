import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReports } from '../Redux/slices/reportsSlice';

export function useReports(page = 1) {
  const dispatch = useDispatch();
  const reports = useSelector(state => state.reports.reports);
  const meta = useSelector(state => state.reports.reportsMeta);
  const status = useSelector(state => state.reports.reportsStatus);
  const error = useSelector(state => state.reports.reportsError);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchReports({ page }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    reports,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchReports({ page: p })),
    retry: () => dispatch(fetchReports({ page })),
  };
}
