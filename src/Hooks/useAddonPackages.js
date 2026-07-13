import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAddonPackages } from '../Redux/slices/planSlice';

export function useAddonPackages() {
  const dispatch = useDispatch();
  const packages = useSelector(state => state.plan.addonPackages);
  const status = useSelector(state => state.plan.addonPackagesStatus);
  const error = useSelector(state => state.plan.addonPackagesError);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchAddonPackages());
    }
  }, [status, dispatch]);

  return {
    packages,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchAddonPackages()),
  };
}
