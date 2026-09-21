import { useDispatch, useSelector } from 'react-redux';
import {
  fetchServiceSubscriptions,
  createServiceSubscription,
  finalizeServiceSubscription,
  cancelServiceSubscription,
  resetServiceSubscription,
} from '../Redux/slices/serviceSubscriptionSlice';

// Recurring per-service subscription flow: the create action (returns
// checkout_url / plan_id) and the customer's existing subscriptions.
export function useServiceSubscription() {
  const dispatch = useDispatch();

  const subscriptions = useSelector(s => s.serviceSubscription.subscriptions);
  const listLoading = useSelector(s => s.serviceSubscription.listStatus === 'loading');

  const createLoading = useSelector(s => s.serviceSubscription.createStatus === 'loading');
  const createError = useSelector(s => s.serviceSubscription.createError);
  const finalizeLoading = useSelector(s => s.serviceSubscription.finalizeStatus === 'loading');
  const cancelLoading = useSelector(s => s.serviceSubscription.cancelStatus === 'loading');

  return {
    subscriptions,
    listLoading,
    fetchSubscriptions: () => dispatch(fetchServiceSubscriptions()),

    createLoading,
    createError,
    createSubscription: (params) => dispatch(createServiceSubscription(params)),

    finalizeLoading,
    finalizeSubscription: (params) => dispatch(finalizeServiceSubscription(params)),

    cancelLoading,
    cancelSubscription: (id) => dispatch(cancelServiceSubscription(id)),

    reset: () => dispatch(resetServiceSubscription()),
  };
}
