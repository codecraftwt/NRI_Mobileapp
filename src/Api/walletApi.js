import apiClient, { normalizeApiError } from './client';

function mapCashout(raw) {
  if (!raw) return null;
  return {
    eligible: !!raw.eligible,
    isElite: !!raw.is_elite,
    minBalance: raw.min_balance,
    pendingRequest: raw.pending_request || null,
  };
}

export async function getWallet() {
  try {
    const response = await apiClient.get('/customer/wallet');
    const data = response.data?.data || {};
    return {
      balance: data.balance ?? 0,
      cashout: mapCashout(data.cashout),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// NOTE: this account has no transaction history to verify a populated
// response against, so field names beyond `type`/`amount` are a best-effort
// guess following this backend's established snake_case conventions.
function mapTransaction(raw) {
  return {
    id: raw.id,
    type: raw.type,
    amount: raw.amount,
    description: raw.description || raw.source || raw.note || null,
    source: raw.source || null,
    createdAt: raw.created_at,
  };
}

export async function getWalletTransactions({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/customer/wallet/transactions', { params });
    const list = response.data?.data || [];
    return {
      transactions: list.map(mapTransaction),
      meta: {
        currentPage: response.data?.meta?.current_page ?? 1,
        lastPage: response.data?.meta?.last_page ?? 1,
        perPage: response.data?.meta?.per_page ?? list.length,
        total: response.data?.meta?.total ?? list.length,
      },
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function requestCashout({ amount, bankDetails }) {
  try {
    const response = await apiClient.post('/customer/wallet/cashout', {
      amount,
      bank_details: bankDetails,
    });
    return { message: response.data?.message, data: response.data?.data || null };
  } catch (error) {
    throw normalizeApiError(error);
  }
}
