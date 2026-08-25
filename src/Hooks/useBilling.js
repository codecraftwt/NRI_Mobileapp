import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchBillingOverview,
  payBillableItem,
  verifyBillingPayment,
  stopMembershipAutoRenew,
  cancelAllSubscriptions,
  subscribeRecurringBundle,
} from '../Redux/slices/billingSlice';

export function useBilling() {
  const dispatch = useDispatch();
  const overview = useSelector(state => state.billing.overview);
  const status = useSelector(state => state.billing.overviewStatus);
  const error = useSelector(state => state.billing.overviewError);

  const payLoading = useSelector(state => state.billing.payStatus === 'loading');
  const verifyLoading = useSelector(state => state.billing.verifyStatus === 'loading');
  const stopAutoRenewLoading = useSelector(state => state.billing.stopAutoRenewStatus === 'loading');
  const cancelAllLoading = useSelector(state => state.billing.cancelAllStatus === 'loading');
  const subscribeRecurringLoading = useSelector(state => state.billing.subscribeRecurringStatus === 'loading');

  useEffect(() => {
    if (status === 'idle') dispatch(fetchBillingOverview());
  }, [status, dispatch]);

  return {
    overview,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchBillingOverview()),

    payLoading,
    pay: (payableType, id, gateway, useWallet) => dispatch(payBillableItem({ payableType, id, gateway, useWallet })),

    verifyLoading,
    verifyPayment: (params) => dispatch(verifyBillingPayment(params)),

    stopAutoRenewLoading,
    stopAutoRenew: (membershipId, traceId) => dispatch(stopMembershipAutoRenew({ membershipId, traceId })),

    cancelAllLoading,
    cancelAllSubscriptions: (traceId) => dispatch(cancelAllSubscriptions(traceId)),

    subscribeRecurringLoading,
    subscribeRecurring: (bundleId) => dispatch(subscribeRecurringBundle(bundleId)),
  };
}
