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
  flagJobCostIssue,
  submitJobFeedback,
} from '../../Redux/slices/vendorJobsSlice';

export function useVendorJobDetail(ticket) {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.vendorJobs.detail);
  const status = useSelector(state => state.vendorJobs.detailStatus);
  const error = useSelector(state => state.vendorJobs.detailError);
  const actionStatus = useSelector(state => state.vendorJobs.actionStatus);
  const actionError = useSelector(state => state.vendorJobs.actionError);
  const feedbackStatus = useSelector(state => state.vendorJobs.feedbackStatus);
  const feedbackError = useSelector(state => state.vendorJobs.feedbackError);

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
    flagCostIssue: ({ reason, amount }) => dispatch(flagJobCostIssue({ ticket, reason, amount })),

    submitFeedback: ({ rating, note }) => dispatch(submitJobFeedback({ ticket, rating, note })),
    feedbackLoading: feedbackStatus === 'loading',
    feedbackError,
  };
}
