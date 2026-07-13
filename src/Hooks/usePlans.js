import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPlans } from '../Redux/slices/planSlice';

export function usePlans() {
  const dispatch = useDispatch();
  const plans = useSelector(state => state.plan.plans);
  const status = useSelector(state => state.plan.plansStatus);
  const error = useSelector(state => state.plan.plansError);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchPlans());
    }
  }, [status, dispatch]);

  return {
    plans,
    regularPlans: plans.filter(p => !p.isCustomPricing),
    corporatePlan: plans.find(p => p.isCustomPricing) || null,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchPlans()),
  };
}
