import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as billingApi from '../../Api/billingApi';
import * as paymentsApi from '../../Api/paymentsApi';

export const fetchBillingOverview = createAsyncThunk('billing/fetchOverview', async (_, { rejectWithValue }) => {
  try {
    return await billingApi.getBillingOverview();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const payBillableItem = createAsyncThunk(
  'billing/pay',
  async ({ payableType, id, gateway, useWallet }, { rejectWithValue }) => {
    try {
      return await billingApi.payBillableItem(payableType, id, { gateway, useWallet });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const verifyBillingPayment = createAsyncThunk(
  'billing/verifyPayment',
  async ({ paymentId, ...params }, { rejectWithValue }) => {
    try {
      return await paymentsApi.verifyPayment(paymentId, params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const stopMembershipAutoRenew = createAsyncThunk(
  'billing/stopAutoRenew',
  async (membershipId, { rejectWithValue }) => {
    try {
      return await billingApi.stopMembershipAutoRenew(membershipId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchPaymentHistory = createAsyncThunk(
  'billing/fetchPaymentHistory',
  async (params, { rejectWithValue }) => {
    try {
      return await paymentsApi.getPaymentHistory(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  overview: null,
  overviewStatus: 'idle',
  overviewError: null,
  payStatus: 'idle',
  payError: null,
  verifyStatus: 'idle',
  verifyError: null,
  stopAutoRenewStatus: 'idle',
  stopAutoRenewError: null,
  payments: [],
  paymentsMeta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  paymentsStatus: 'idle',
  paymentsError: null,
};

const billingSlice = createSlice({
  name: 'billing',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBillingOverview.pending, (state) => {
        state.overviewStatus = 'loading';
        state.overviewError = null;
      })
      .addCase(fetchBillingOverview.fulfilled, (state, action) => {
        state.overviewStatus = 'succeeded';
        state.overview = action.payload;
      })
      .addCase(fetchBillingOverview.rejected, (state, action) => {
        state.overviewStatus = 'failed';
        state.overviewError = action.payload;
      })
      .addCase(payBillableItem.pending, (state) => {
        state.payStatus = 'loading';
        state.payError = null;
      })
      .addCase(payBillableItem.fulfilled, (state) => {
        state.payStatus = 'succeeded';
      })
      .addCase(payBillableItem.rejected, (state, action) => {
        state.payStatus = 'failed';
        state.payError = action.payload;
      })
      .addCase(verifyBillingPayment.pending, (state) => {
        state.verifyStatus = 'loading';
        state.verifyError = null;
      })
      .addCase(verifyBillingPayment.fulfilled, (state) => {
        state.verifyStatus = 'succeeded';
      })
      .addCase(verifyBillingPayment.rejected, (state, action) => {
        state.verifyStatus = 'failed';
        state.verifyError = action.payload;
      })
      .addCase(stopMembershipAutoRenew.pending, (state) => {
        state.stopAutoRenewStatus = 'loading';
        state.stopAutoRenewError = null;
      })
      .addCase(stopMembershipAutoRenew.fulfilled, (state) => {
        state.stopAutoRenewStatus = 'succeeded';
        if (state.overview) state.overview.autoRenewingMembership = null;
      })
      .addCase(stopMembershipAutoRenew.rejected, (state, action) => {
        state.stopAutoRenewStatus = 'failed';
        state.stopAutoRenewError = action.payload;
      })
      .addCase(fetchPaymentHistory.pending, (state) => {
        state.paymentsStatus = 'loading';
        state.paymentsError = null;
      })
      .addCase(fetchPaymentHistory.fulfilled, (state, action) => {
        state.paymentsStatus = 'succeeded';
        state.payments = action.payload.payments;
        state.paymentsMeta = action.payload.meta;
      })
      .addCase(fetchPaymentHistory.rejected, (state, action) => {
        state.paymentsStatus = 'failed';
        state.paymentsError = action.payload;
      });
  },
});

export default billingSlice.reducer;
