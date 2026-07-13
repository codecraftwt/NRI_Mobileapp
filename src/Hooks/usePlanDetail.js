import { useDispatch, useSelector } from 'react-redux';
import { fetchPlanDetail } from '../Redux/slices/planSlice';

// On-demand lookup (like usePostalCodeLookup) rather than cached list data —
// used to refresh a single plan's detail (e.g. a "View details" sheet).
export function usePlanDetail() {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.plan.planDetail);
  const status = useSelector(state => state.plan.planDetailStatus);
  const error = useSelector(state => state.plan.planDetailError);

  return {
    detail,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchDetail: (planId) => dispatch(fetchPlanDetail(planId)),
  };
}
