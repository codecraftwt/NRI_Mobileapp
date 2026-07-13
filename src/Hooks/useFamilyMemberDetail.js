import { useDispatch, useSelector } from 'react-redux';
import { fetchFamilyMemberDetail } from '../Redux/slices/familySlice';

// On-demand lookup (like usePlanDetail) — used to refresh a single family
// member's detail (e.g. when opening the edit screen).
export function useFamilyMemberDetail() {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.family.detail);
  const status = useSelector(state => state.family.detailStatus);
  const error = useSelector(state => state.family.detailError);

  return {
    detail,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchDetail: (id) => dispatch(fetchFamilyMemberDetail(id)),
  };
}
