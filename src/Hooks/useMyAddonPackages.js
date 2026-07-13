import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMyAddonPackages,
  subscribeAddonPackage,
  cancelAddonSubscription,
  verifyAddonPayment,
} from '../Redux/slices/addonSubscriptionSlice';

export function useMyAddonPackages() {
  const dispatch = useDispatch();
  const packages = useSelector(state => state.addonSubscription.packages);
  const status = useSelector(state => state.addonSubscription.status);
  const error = useSelector(state => state.addonSubscription.error);
  const mutating = useSelector(state => state.addonSubscription.mutationStatus === 'loading');

  useEffect(() => {
    if (status === 'idle') dispatch(fetchMyAddonPackages());
  }, [status, dispatch]);

  return {
    packages,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchMyAddonPackages()),
    mutating,
    subscribe: (packageId, gateway) => dispatch(subscribeAddonPackage({ packageId, gateway })),
    cancelSubscription: (subscriptionId) => dispatch(cancelAddonSubscription(subscriptionId)),
    verifyPayment: (params) => dispatch(verifyAddonPayment(params)),
    refetch: () => dispatch(fetchMyAddonPackages()),
  };
}
