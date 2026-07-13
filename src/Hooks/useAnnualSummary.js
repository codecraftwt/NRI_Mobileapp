import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAnnualSummary } from '../Redux/slices/reportsSlice';

export function useAnnualSummary(year) {
  const dispatch = useDispatch();
  const summary = useSelector(state => state.reports.annualSummary);
  const status = useSelector(state => state.reports.annualSummaryStatus);
  const error = useSelector(state => state.reports.annualSummaryError);

  useEffect(() => {
    if (year) dispatch(fetchAnnualSummary({ year }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  return {
    summary,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchAnnualSummary({ year })),
  };
}
