import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMembership, fetchMembershipHistory } from '../Redux/slices/membershipSlice';

export function useMembership() {
  const dispatch = useDispatch();
  const membership = useSelector(state => state.membership.membership);
  const usage = useSelector(state => state.membership.usage);
  const status = useSelector(state => state.membership.status);
  const error = useSelector(state => state.membership.error);

  const history = useSelector(state => state.membership.history);
  const historyStatus = useSelector(state => state.membership.historyStatus);
  const historyError = useSelector(state => state.membership.historyError);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchMembership());
  }, [status, dispatch]);

  useEffect(() => {
    if (historyStatus === 'idle') dispatch(fetchMembershipHistory());
  }, [historyStatus, dispatch]);

  return {
    membership,
    usage,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchMembership()),

    history,
    historyLoading: historyStatus === 'loading',
    historyFailed: historyStatus === 'failed',
    historyError,
    retryHistory: () => dispatch(fetchMembershipHistory()),
  };
}
