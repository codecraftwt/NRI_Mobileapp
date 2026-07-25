import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVendorJobs } from '../Redux/slices/vendorJobsSlice';

// status: undefined (all) | 'assigned' | 'in_progress' | 'completed'
export function useVendorJobs({ status, page = 1 } = {}) {
  const dispatch = useDispatch();
  const jobs = useSelector(state => state.vendorJobs.jobs);
  const counts = useSelector(state => state.vendorJobs.counts);
  const meta = useSelector(state => state.vendorJobs.meta);
  const reqStatus = useSelector(state => state.vendorJobs.status);
  const error = useSelector(state => state.vendorJobs.error);

  useEffect(() => {
    if (reqStatus === 'idle') dispatch(fetchVendorJobs({ status, page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    jobs,
    counts,
    meta,
    loading: reqStatus === 'loading',
    failed: reqStatus === 'failed',
    error,
    fetch: (params) => dispatch(fetchVendorJobs(params)),
    retry: () => dispatch(fetchVendorJobs({ status, page })),
  };
}
