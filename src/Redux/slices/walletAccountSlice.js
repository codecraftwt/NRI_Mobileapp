import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as walletApi from '../../Api/walletApi';

// Real-API-backed wallet state (balance/cashout/transactions) — kept
// separate from the older `walletSlice` (still used for the local demo
// coupon list, since no real "list my coupons" endpoint exists yet).
export const fetchWallet = createAsyncThunk('walletAccount/fetch', async (_, { rejectWithValue }) => {
  try {
    return await walletApi.getWallet();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchWalletTransactions = createAsyncThunk(
  'walletAccount/fetchTransactions',
  async (params, { rejectWithValue }) => {
    try {
      return await walletApi.getWalletTransactions(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const requestCashout = createAsyncThunk(
  'walletAccount/requestCashout',
  async (params, { rejectWithValue }) => {
    try {
      return await walletApi.requestCashout(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  balance: 0,
  cashout: null,
  status: 'idle',
  error: null,
  transactions: [],
  transactionsMeta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  transactionsStatus: 'idle',
  transactionsError: null,
  cashoutStatus: 'idle',
  cashoutError: null,
};

const walletAccountSlice = createSlice({
  name: 'walletAccount',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWallet.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchWallet.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.balance = action.payload.balance;
        state.cashout = action.payload.cashout;
      })
      .addCase(fetchWallet.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchWalletTransactions.pending, (state) => {
        state.transactionsStatus = 'loading';
        state.transactionsError = null;
      })
      .addCase(fetchWalletTransactions.fulfilled, (state, action) => {
        state.transactionsStatus = 'succeeded';
        state.transactions = action.payload.transactions;
        state.transactionsMeta = action.payload.meta;
      })
      .addCase(fetchWalletTransactions.rejected, (state, action) => {
        state.transactionsStatus = 'failed';
        state.transactionsError = action.payload;
      })
      .addCase(requestCashout.pending, (state) => {
        state.cashoutStatus = 'loading';
        state.cashoutError = null;
      })
      .addCase(requestCashout.fulfilled, (state) => {
        state.cashoutStatus = 'succeeded';
      })
      .addCase(requestCashout.rejected, (state, action) => {
        state.cashoutStatus = 'failed';
        state.cashoutError = action.payload;
      });
  },
});

export default walletAccountSlice.reducer;
