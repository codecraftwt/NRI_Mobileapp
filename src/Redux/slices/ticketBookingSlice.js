import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as ticketApi from '../../Api/ticketApi';
import { payBillableItem } from '../../Api/billingApi';
import { verifyPayment } from '../../Api/paymentsApi';

// Transient booking-time state for CreateTicket — none of this is cached
// reference data, it's recomputed server-side every time the selection
// (base service / addons / urgency / coupon) changes.
export const fetchTicketQuote = createAsyncThunk(
  'ticketBooking/fetchQuote',
  async (params, { rejectWithValue }) => {
    try {
      return await ticketApi.getTicketQuote(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchTicketCoupons = createAsyncThunk(
  'ticketBooking/fetchCoupons',
  async (params, { rejectWithValue }) => {
    try {
      return await ticketApi.getTicketCoupons(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const applyTicketCoupon = createAsyncThunk(
  'ticketBooking/applyCoupon',
  async (params, { rejectWithValue }) => {
    try {
      return await ticketApi.validateTicketCoupon(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchTicketRequiredDocuments = createAsyncThunk(
  'ticketBooking/fetchRequiredDocuments',
  async (serviceIds, { rejectWithValue }) => {
    try {
      return await ticketApi.getTicketRequiredDocuments(serviceIds);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const addTicketDocuments = createAsyncThunk(
  'ticketBooking/addDocuments',
  async ({ ticketId, documents }, { rejectWithValue }) => {
    try {
      return await ticketApi.addTicketDocuments(ticketId, documents);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const submitTicket = createAsyncThunk(
  'ticketBooking/submit',
  async (params, { rejectWithValue }) => {
    try {
      return await ticketApi.createTicket(params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const payForTicket = createAsyncThunk(
  'ticketBooking/pay',
  async ({ ticketId, gateway, useWallet }, { rejectWithValue }) => {
    try {
      return await payBillableItem('ticket', ticketId, { gateway, useWallet });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const verifyTicketPayment = createAsyncThunk(
  'ticketBooking/verifyPayment',
  async ({ paymentId, ...params }, { rejectWithValue }) => {
    try {
      return await verifyPayment(paymentId, params);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  quote: null,
  quoteStatus: 'idle',
  quoteError: null,
  coupons: [],
  couponsStatus: 'idle',
  couponsError: null,
  appliedCoupon: null,
  couponApplyStatus: 'idle',
  couponApplyError: null,
  requiredDocuments: [],
  requiredDocsStatus: 'idle',
  requiredDocsError: null,
  docsUploadStatus: 'idle',
  docsUploadError: null,
  submitStatus: 'idle',
  submitError: null,
  payStatus: 'idle',
  payError: null,
  verifyStatus: 'idle',
  verifyError: null,
};

const ticketBookingSlice = createSlice({
  name: 'ticketBooking',
  initialState,
  reducers: {
    clearAppliedCoupon: (state) => {
      state.appliedCoupon = null;
      state.couponApplyStatus = 'idle';
      state.couponApplyError = null;
    },
    clearTicketRequiredDocuments: (state) => {
      state.requiredDocuments = [];
      state.requiredDocsStatus = 'idle';
      state.requiredDocsError = null;
    },
    resetTicketBooking: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTicketQuote.pending, (state) => {
        state.quoteStatus = 'loading';
        state.quoteError = null;
      })
      .addCase(fetchTicketQuote.fulfilled, (state, action) => {
        state.quoteStatus = 'succeeded';
        state.quote = action.payload;
      })
      .addCase(fetchTicketQuote.rejected, (state, action) => {
        state.quoteStatus = 'failed';
        state.quoteError = action.payload;
      })
      .addCase(fetchTicketCoupons.pending, (state) => {
        state.couponsStatus = 'loading';
        state.couponsError = null;
      })
      .addCase(fetchTicketCoupons.fulfilled, (state, action) => {
        state.couponsStatus = 'succeeded';
        state.coupons = action.payload;
      })
      .addCase(fetchTicketCoupons.rejected, (state, action) => {
        state.couponsStatus = 'failed';
        state.couponsError = action.payload;
      })
      .addCase(applyTicketCoupon.pending, (state) => {
        state.couponApplyStatus = 'loading';
        state.couponApplyError = null;
      })
      .addCase(applyTicketCoupon.fulfilled, (state, action) => {
        state.couponApplyStatus = 'succeeded';
        state.appliedCoupon = action.payload;
      })
      .addCase(applyTicketCoupon.rejected, (state, action) => {
        state.couponApplyStatus = 'failed';
        state.couponApplyError = action.payload;
        state.appliedCoupon = null;
      })
      .addCase(fetchTicketRequiredDocuments.pending, (state) => {
        state.requiredDocsStatus = 'loading';
        state.requiredDocsError = null;
      })
      .addCase(fetchTicketRequiredDocuments.fulfilled, (state, action) => {
        state.requiredDocsStatus = 'succeeded';
        state.requiredDocuments = action.payload;
      })
      .addCase(fetchTicketRequiredDocuments.rejected, (state, action) => {
        state.requiredDocsStatus = 'failed';
        state.requiredDocsError = action.payload;
      })
      .addCase(addTicketDocuments.pending, (state) => {
        state.docsUploadStatus = 'loading';
        state.docsUploadError = null;
      })
      .addCase(addTicketDocuments.fulfilled, (state) => {
        state.docsUploadStatus = 'succeeded';
      })
      .addCase(addTicketDocuments.rejected, (state, action) => {
        state.docsUploadStatus = 'failed';
        state.docsUploadError = action.payload;
      })
      .addCase(submitTicket.pending, (state) => {
        state.submitStatus = 'loading';
        state.submitError = null;
      })
      .addCase(submitTicket.fulfilled, (state) => {
        state.submitStatus = 'succeeded';
      })
      .addCase(submitTicket.rejected, (state, action) => {
        state.submitStatus = 'failed';
        state.submitError = action.payload;
      })
      .addCase(payForTicket.pending, (state) => {
        state.payStatus = 'loading';
        state.payError = null;
      })
      .addCase(payForTicket.fulfilled, (state) => {
        state.payStatus = 'succeeded';
      })
      .addCase(payForTicket.rejected, (state, action) => {
        state.payStatus = 'failed';
        state.payError = action.payload;
      })
      .addCase(verifyTicketPayment.pending, (state) => {
        state.verifyStatus = 'loading';
        state.verifyError = null;
      })
      .addCase(verifyTicketPayment.fulfilled, (state) => {
        state.verifyStatus = 'succeeded';
      })
      .addCase(verifyTicketPayment.rejected, (state, action) => {
        state.verifyStatus = 'failed';
        state.verifyError = action.payload;
      });
  },
});

export const { clearAppliedCoupon, clearTicketRequiredDocuments, resetTicketBooking } = ticketBookingSlice.actions;
export default ticketBookingSlice.reducer;
