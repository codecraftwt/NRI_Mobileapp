import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchVendorJobDetail,
  clearJobDetail,
  acceptJob,
  rejectJob,
  completeJob,
  addReportAttachments,
  saveTracking,
} from '../Redux/slices/vendorJobsSlice';

export function useVendorJobDetail(ticket) {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.vendorJobs.detail);
  const status = useSelector(state => state.vendorJobs.detailStatus);
  const error = useSelector(state => state.vendorJobs.detailError);
  const actionStatus = useSelector(state => state.vendorJobs.actionStatus);
  const actionError = useSelector(state => state.vendorJobs.actionError);

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

    // Mutations — each returns the dispatched thunk promise so callers can
    // `.unwrap()`; on success the detail is refetched by the thunk.
    actionLoading: actionStatus === 'loading',
    actionError,
    accept: (vendorEta) => dispatch(acceptJob({ ticket, vendorEta })),
    reject: (reason) => dispatch(rejectJob({ ticket, reason })),
    complete: ({ reportText, files }) => dispatch(completeJob({ ticket, reportText, files })),
    addAttachments: (files) => dispatch(addReportAttachments({ ticket, files })),
    saveTracking: ({ trackingNumber, trackingUrl }) => dispatch(saveTracking({ ticket, trackingNumber, trackingUrl })),
  };
}
