import apiClient, { normalizeApiError } from './client';

// NOTE: `referred`/`rewards` are empty for the account this was verified
// against, so item-level field names beyond the obvious ones are a
// best-effort guess following this backend's snake_case conventions.
function mapReferredPerson(raw) {
  return {
    name: raw.name,
    plan: raw.plan || null,
    joinedAt: raw.joined_at || raw.created_at || null,
    status: raw.status || null,
  };
}

function mapReward(raw) {
  return {
    name: raw.name,
    amount: raw.amount,
    status: raw.status,
    date: raw.date || raw.created_at || null,
  };
}

function mapLeaderboardEntry(raw) {
  return {
    name: raw.name,
    count: raw.count,
    isMe: !!raw.me,
  };
}

export async function getReferralOverview() {
  try {
    const response = await apiClient.get('/customer/referrals');
    const data = response.data?.data || {};
    return {
      referralCode: data.referral_code,
      shareLink: data.share_link,
      totals: {
        signups: data.totals?.signups ?? 0,
        earned: data.totals?.earned ?? 0,
        pending: data.totals?.pending ?? 0,
      },
      referred: (data.referred || []).map(mapReferredPerson),
      rewards: (data.rewards || []).map(mapReward),
      leaderboard: (data.leaderboard || []).map(mapLeaderboardEntry),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
