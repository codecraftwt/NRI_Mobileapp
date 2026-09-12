import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as vendorWalletApi from '../../Api/Vendor/vendorWalletApi';

export const fetchVendorWallet = createAsyncThunk('vendorWallet/fetch', async (params, { rejectWithValue }) => {
  try {
    return await vendorWalletApi.getVendorWallet(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

// Refreshes the wallet (balance + requests list) on success so the new
// request appears and the balance reflects it without a manual reload.
export const requestWithdrawal = createAsyncThunk('vendorWallet/requestWithdrawal', async (params, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorWalletApi.requestVendorWalletWithdrawal(params);
    await dispatch(fetchVendorWallet({}));
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  balance: 0,
  feePercent: 0,
  withdrawalModes: [],
  payoutDetails: null,
  // Full list every fetch — the backend doesn't paginate withdrawal requests.
  withdrawals: [],
  // Paginated wallet ledger (job credits, withdrawal debits, etc) — `meta`
  // below describes this list.
  transactions: [],
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  // Separate flag for appending later pages (infinite scroll) so the visible
  // list isn't replaced by the full-screen loader while page 2+ loads.
  loadingMore: false,
  error: null,

  withdrawStatus: 'idle',
  withdrawError: null,
};

const vendorWalletSlice = createSlice({
  name: 'vendorWallet',
  initialState,
  reducers: {
    resetWithdrawalRequest: (state) => {
      state.withdrawStatus = 'idle';
      state.withdrawError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorWallet.pending, (state, action) => {
        const page = action.meta.arg?.page ?? 1;
        if (page > 1) state.loadingMore = true;
        else state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorWallet.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.loadingMore = false;
        state.balance = action.payload.balance;
        state.feePercent = action.payload.feePercent;
        state.withdrawalModes = action.payload.withdrawalModes;
        state.payoutDetails = action.payload.payoutDetails;
        // Not paginated — always the full current set.
        state.withdrawals = action.payload.withdrawals;
        const page = action.payload.meta?.currentPage ?? 1;
        if (page > 1) {
          const seen = new Set(state.transactions.map(t => t.id));
          state.transactions = [...state.transactions, ...action.payload.transactions.filter(t => !seen.has(t.id))];
        } else {
          state.transactions = action.payload.transactions;
        }
        state.meta = action.payload.meta;
      })
      .addCase(fetchVendorWallet.rejected, (state, action) => {
        state.status = state.loadingMore ? 'succeeded' : 'failed';
        state.loadingMore = false;
        state.error = action.payload;
      })
      .addCase(requestWithdrawal.pending, (state) => {
        state.withdrawStatus = 'loading';
        state.withdrawError = null;
      })
      .addCase(requestWithdrawal.fulfilled, (state) => {
        state.withdrawStatus = 'succeeded';
      })
      .addCase(requestWithdrawal.rejected, (state, action) => {
        state.withdrawStatus = 'failed';
        state.withdrawError = action.payload;
      });
  },
});

export const { resetWithdrawalRequest } = vendorWalletSlice.actions;
export default vendorWalletSlice.reducer;
