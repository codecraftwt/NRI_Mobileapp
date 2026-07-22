import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRequiredDocuments,
  fetchServiceSubscriptions,
  createServiceSubscription,
  cancelServiceSubscription,
  clearRequiredDocuments,
  resetServiceSubscription,
} from '../Redux/slices/serviceSubscriptionSlice';

// Recurring per-service subscription flow: which documents a selection
// requires, the create action (returns checkout_url / plan_id), and the
// customer's existing subscriptions.
export function useServiceSubscription() {
  const dispatch = useDispatch();

  const requiredDocuments = useSelector(s => s.serviceSubscription.requiredDocuments);
  const requiredDocsLoading = useSelector(s => s.serviceSubscription.requiredDocsStatus === 'loading');
  const requiredDocsError = useSelector(s => s.serviceSubscription.requiredDocsError);

  const subscriptions = useSelector(s => s.serviceSubscription.subscriptions);
  const listLoading = useSelector(s => s.serviceSubscription.listStatus === 'loading');

  const createLoading = useSelector(s => s.serviceSubscription.createStatus === 'loading');
  const createError = useSelector(s => s.serviceSubscription.createError);
  const cancelLoading = useSelector(s => s.serviceSubscription.cancelStatus === 'loading');

  return {
    requiredDocuments,
    requiredDocsLoading,
    requiredDocsError,
    fetchRequiredDocuments: (serviceIds) => dispatch(fetchRequiredDocuments(serviceIds)),
    clearRequiredDocuments: () => dispatch(clearRequiredDocuments()),

    subscriptions,
    listLoading,
    fetchSubscriptions: () => dispatch(fetchServiceSubscriptions()),

    createLoading,
    createError,
    createSubscription: (params) => dispatch(createServiceSubscription(params)),

    cancelLoading,
    cancelSubscription: (id) => dispatch(cancelServiceSubscription(id)),

    reset: () => dispatch(resetServiceSubscription()),
  };
}
