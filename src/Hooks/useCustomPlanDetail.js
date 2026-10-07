import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomPlanDetail, replyCustomPlan, escalateCustomPlan, acceptCustomPlanProposal, payCustomPlanProposal, rejectCustomPlanProposal } from '../Redux/slices/customPlanSlice';

export function useCustomPlanDetail(ticketId) {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.customPlan.detail);
  const replies = useSelector(state => state.customPlan.replies);
  const status = useSelector(state => state.customPlan.detailStatus);
  const error = useSelector(state => state.customPlan.detailError);
  const replyStatus = useSelector(state => state.customPlan.replyStatus);
  const replyError = useSelector(state => state.customPlan.replyError);
  const escalateStatus = useSelector(state => state.customPlan.escalateStatus);
  const escalateError = useSelector(state => state.customPlan.escalateError);
  const acceptPlanStatus = useSelector(state => state.customPlan.acceptPlanStatus);
  const acceptPlanError = useSelector(state => state.customPlan.acceptPlanError);
  const payPlanStatus = useSelector(state => state.customPlan.payPlanStatus);
  const payPlanError = useSelector(state => state.customPlan.payPlanError);
  const rejectPlanStatus = useSelector(state => state.customPlan.rejectPlanStatus);
  const rejectPlanError = useSelector(state => state.customPlan.rejectPlanError);

  useEffect(() => {
    if (ticketId) dispatch(fetchCustomPlanDetail(ticketId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  const isCurrent = detail && detail.id === ticketId;

  return {
    detail: isCurrent ? detail : null,
    replies: isCurrent ? replies : [],
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => ticketId && dispatch(fetchCustomPlanDetail(ticketId)),

    replyLoading: replyStatus === 'loading',
    replyError,
    reply: (message) => dispatch(replyCustomPlan({ ticketId, message })),

    escalateLoading: escalateStatus === 'loading',
    escalateError,
    escalate: () => dispatch(escalateCustomPlan(ticketId)),

    acceptPlanLoading: acceptPlanStatus === 'loading',
    acceptPlanError,
    acceptPlan: (replyId) => dispatch(acceptCustomPlanProposal({ ticketId, replyId })),

    payPlanLoading: payPlanStatus === 'loading',
    payPlanError,
    payPlan: (replyId, { gateway, currency } = {}) => dispatch(payCustomPlanProposal({ ticketId, replyId, gateway, currency })),

    rejectPlanLoading: rejectPlanStatus === 'loading',
    rejectPlanError,
    rejectPlan: (replyId, reason) => dispatch(rejectCustomPlanProposal({ ticketId, replyId, reason })),
  };
}
