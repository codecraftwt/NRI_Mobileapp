import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as membershipApi from '../../Api/membershipApi';

export const fetchMembership = createAsyncThunk('membership/fetch', async (_, { rejectWithValue }) => {
  try {
    return await membershipApi.getMembership();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchMembershipHistory = createAsyncThunk('membership/fetchHistory', async (_, { rejectWithValue }) => {
  try {
    return await membershipApi.getMembershipHistory();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const validateMembershipCoupon = createAsyncThunk('membership/validateCoupon', async (params, { rejectWithValue }) => {
  try {
    return await membershipApi.validateMembershipCoupon(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const checkoutMembership = createAsyncThunk('membership/checkout', async (params, { rejectWithValue }) => {
  try {
    return await membershipApi.checkoutMembership(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const verifyMembershipPayment = createAsyncThunk(
  'membership/verifyPayment',
  async ({ paymentId, ...params }, { rejectWithValue }) => {
    try {
      return await membershipApi.verifyPayment(paymentId, params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  membership: null,
  usage: null,
  status: 'idle',
  error: null,
  history: [],
  historyStatus: 'idle',
  historyError: null,
  couponResult: null,
  couponStatus: 'idle',
  couponError: null,
  checkoutStatus: 'idle',
  checkoutError: null,
  verifyStatus: 'idle',
  verifyError: null,
};

const membershipSlice = createSlice({
  name: 'membership',
  initialState,
  reducers: {
    clearCouponResult: (state) => {
      state.couponResult = null;
      state.couponStatus = 'idle';
      state.couponError = null;
    },
    resetCheckoutStatus: (state) => {
      state.checkoutStatus = 'idle';
      state.checkoutError = null;
      state.verifyStatus = 'idle';
      state.verifyError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMembership.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMembership.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.membership = action.payload.membership;
        state.usage = action.payload.usage;
      })
      .addCase(fetchMembership.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchMembershipHistory.pending, (state) => {
        state.historyStatus = 'loading';
        state.historyError = null;
      })
      .addCase(fetchMembershipHistory.fulfilled, (state, action) => {
        state.historyStatus = 'succeeded';
        state.history = action.payload;
      })
      .addCase(fetchMembershipHistory.rejected, (state, action) => {
        state.historyStatus = 'failed';
        state.historyError = action.payload;
      })
      .addCase(validateMembershipCoupon.pending, (state) => {
        state.couponStatus = 'loading';
        state.couponError = null;
      })
      .addCase(validateMembershipCoupon.fulfilled, (state, action) => {
        state.couponStatus = 'succeeded';
        state.couponResult = action.payload;
      })
      .addCase(validateMembershipCoupon.rejected, (state, action) => {
        state.couponStatus = 'failed';
        state.couponError = action.payload;
        state.couponResult = null;
      })
      .addCase(checkoutMembership.pending, (state) => {
        state.checkoutStatus = 'loading';
        state.checkoutError = null;
      })
      .addCase(checkoutMembership.fulfilled, (state) => {
        state.checkoutStatus = 'succeeded';
      })
      .addCase(checkoutMembership.rejected, (state, action) => {
        state.checkoutStatus = 'failed';
        state.checkoutError = action.payload;
      })
      .addCase(verifyMembershipPayment.pending, (state) => {
        state.verifyStatus = 'loading';
        state.verifyError = null;
      })
      .addCase(verifyMembershipPayment.fulfilled, (state) => {
        state.verifyStatus = 'succeeded';
      })
      .addCase(verifyMembershipPayment.rejected, (state, action) => {
        state.verifyStatus = 'failed';
        state.verifyError = action.payload;
      });
  },
});

export const { clearCouponResult, resetCheckoutStatus } = membershipSlice.actions;
export default membershipSlice.reducer;
