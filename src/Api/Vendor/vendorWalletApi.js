import apiClient, { normalizeApiError } from '../client';

// Response field names aren't fully pinned in the OpenAPI schema, so these
// mappers stay tolerant across a few plausible snake_case shapes — consistent
// with the other vendor mappers.

function num(v) {
  return v == null ? 0 : Number(v);
}

// {value, label} withdrawal-mode option — rendered directly, not hardcoded.
function mapWithdrawalMode(raw) {
  if (!raw) return null;
  if (typeof raw === 'string') return { value: raw, label: raw };
  return { value: raw.value, label: raw.label || raw.value };
}

// The vendor's saved payout details, used to prefill/confirm the withdrawal
// form so they don't retype their bank/UPI details every time.
function mapPayoutDetails(raw = {}) {
  return {
    bankAccountName: raw.bank_account_name || '',
    bankAccountNumber: raw.bank_account_number || '',
    bankIfsc: raw.bank_ifsc || '',
    bankName: raw.bank_name || '',
    upiId: raw.upi_id || '',
  };
}

// One row in "My Withdrawal Requests" — not paginated by the backend (it
// returns the vendor's withdrawal requests in full on every call).
function mapWithdrawal(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    amount: num(raw.amount),
    feePercent: num(raw.fee_percent),
    fee: num(raw.fee_amount),
    payable: num(raw.payable_amount ?? (raw.amount - raw.fee_amount)),
    mode: raw.mode || null,
    modeLabel: raw.mode_label || raw.mode || '—',
    status: raw.status || 'pending',
    statusLabel: raw.status_label || raw.status || 'Pending',
    rejectionReason: raw.rejection_reason || null,
    createdAt: raw.created_at || raw.requested_at || null,
  };
}

// One row in "Wallet History" — the ledger of credits/debits behind the
// balance (job payouts, withdrawals taken out, etc). This is the list the
// `meta` pagination block actually applies to.
function mapTransaction(raw) {
  if (!raw) return null;
  return {
    id: raw.id,
    type: raw.type || 'credit',
    amount: num(raw.amount),
    source: raw.source || null,
    description: raw.description || '',
    createdAt: raw.created_at || null,
  };
}

function mapMeta(rawMeta = {}, listLen = 0) {
  return {
    currentPage: rawMeta.current_page ?? 1,
    lastPage: rawMeta.last_page ?? 1,
    perPage: rawMeta.per_page ?? listLen,
    total: rawMeta.total ?? listLen,
  };
}

// GET /vendor/wallet?page= — balance, withdrawal fee %, available withdrawal
// modes, saved payout details, the full withdrawal-requests list, and a
// paginated wallet transaction history (`meta` describes this list).
export async function getVendorWallet({ page } = {}) {
  try {
    const params = {};
    if (page) params.page = page;
    const response = await apiClient.get('/vendor/wallet', { params });
    const data = response.data?.data || {};
    const transactions = data.transactions || [];
    return {
      balance: num(data.balance ?? data.wallet_balance ?? data.available_balance),
      feePercent: num(data.withdrawal_fee_percent ?? data.fee_percent ?? data.fee_percentage),
      withdrawalModes: (data.withdrawal_modes || []).map(mapWithdrawalMode).filter(Boolean),
      payoutDetails: mapPayoutDetails(data.payout_details),
      withdrawals: (data.withdrawals || []).map(mapWithdrawal).filter(Boolean),
      transactions: transactions.map(mapTransaction).filter(Boolean),
      meta: mapMeta(response.data?.meta || data.meta, transactions.length),
    };
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// POST /vendor/wallet/withdraw — raises a new withdrawal request against the
// current balance. The payout-detail fields are only relevant for their
// matching mode (UPI ID for 'upi', bank_* for 'bank') and are omitted from the
// body entirely when blank rather than sent as empty strings.
export async function requestVendorWalletWithdrawal({ amount, mode, upiId, bankAccountName, bankAccountNumber, bankIfsc, bankName }) {
  try {
    const body = { amount, mode };
    if (upiId) body.upi_id = upiId;
    if (bankAccountName) body.bank_account_name = bankAccountName;
    if (bankAccountNumber) body.bank_account_number = bankAccountNumber;
    if (bankIfsc) body.bank_ifsc = bankIfsc;
    if (bankName) body.bank_name = bankName;
    const response = await apiClient.post('/vendor/wallet/withdraw', body);
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
