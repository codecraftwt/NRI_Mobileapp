import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchFamilyMembers } from '../Redux/slices/familySlice';

export function useFamilyMembers() {
  const dispatch = useDispatch();
  const members = useSelector(state => state.family.members);
  const status = useSelector(state => state.family.status);
  const error = useSelector(state => state.family.error);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchFamilyMembers());
    }
  }, [status, dispatch]);

  return {
    members,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchFamilyMembers()),
  };
}
