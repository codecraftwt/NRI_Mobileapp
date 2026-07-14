import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchReferralOverview } from '../Redux/slices/referralSlice';

export function useReferrals() {
  const dispatch = useDispatch();
  const referralCode = useSelector(state => state.referral.referralCode);
  const shareLink = useSelector(state => state.referral.shareLink);
  const totals = useSelector(state => state.referral.totals);
  const referred = useSelector(state => state.referral.referred);
  const rewards = useSelector(state => state.referral.rewards);
  const leaderboard = useSelector(state => state.referral.leaderboard);
  const status = useSelector(state => state.referral.status);
  const error = useSelector(state => state.referral.error);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchReferralOverview());
  }, [status, dispatch]);

  return {
    referralCode,
    shareLink,
    totals,
    referred,
    rewards,
    leaderboard,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchReferralOverview()),
  };
}
