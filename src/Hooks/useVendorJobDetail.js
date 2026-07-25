import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVendorJobDetail, clearJobDetail } from '../Redux/slices/vendorJobsSlice';

export function useVendorJobDetail(ticket) {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.vendorJobs.detail);
  const status = useSelector(state => state.vendorJobs.detailStatus);
  const error = useSelector(state => state.vendorJobs.detailError);

  useEffect(() => {
    if (ticket != null) dispatch(fetchVendorJobDetail(ticket));
    return () => dispatch(clearJobDetail());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket]);

  return {
    detail,
    loading: status === 'loading' || status === 'idle',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchVendorJobDetail(ticket)),
  };
}
