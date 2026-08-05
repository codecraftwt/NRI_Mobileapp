import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRmReports, reviewRmReport, sendRmReport } from '../../Redux/slices/rmReportsSlice';

export function useRmReports(filter = 'pending') {
  const dispatch = useDispatch();
  const reports = useSelector(s => s.rmReports.reports);
  const meta = useSelector(s => s.rmReports.meta);
  const status = useSelector(s => s.rmReports.status);
  const error = useSelector(s => s.rmReports.error);
  const reviewingId = useSelector(s => s.rmReports.reviewingId);
  const sendingId = useSelector(s => s.rmReports.sendingId);

  // Refetch whenever the active filter changes.
  useEffect(() => {
    dispatch(fetchRmReports({ filter }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return {
    reports,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    refresh: () => dispatch(fetchRmReports({ filter })),
    fetchPage: (p) => dispatch(fetchRmReports({ filter, page: p })),

    review: (report, comment) => dispatch(reviewRmReport({ report, comment })),
    reviewingId,
    send: (report) => dispatch(sendRmReport({ report })),
    sendingId,
  };
}
