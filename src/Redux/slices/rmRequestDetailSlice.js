import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as rmRequestsApi from '../../Api/RM/rmRequestsApi';

export const fetchRmRequestDetail = createAsyncThunk('rmRequestDetail/fetch', async (ticket, { rejectWithValue }) => {
  try {
    return await rmRequestsApi.getRmRequestDetail(ticket);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const addRmRequestNote = createAsyncThunk('rmRequestDetail/addNote', async ({ ticket, note }, { rejectWithValue }) => {
  try {
    return await rmRequestsApi.addRmRequestNote(ticket, note);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const escalateRmRequest = createAsyncThunk('rmRequestDetail/escalate', async ({ ticket, reason, escalatedTo }, { rejectWithValue }) => {
  try {
    return await rmRequestsApi.escalateRmRequest(ticket, { reason, escalatedTo });
  } catch (error) {
    return rejectWithValue(error);
  }
});

// Additional-payment mutations — each refetches the detail on success so the
// charge history / vendor-disputes list reflects the new state without a
// manual reload (same pattern as vendorJobsSlice's job mutations).
export const requestRmAdditionalPayment = createAsyncThunk(
  'rmRequestDetail/requestAdditionalPayment',
  async ({ ticket, amount, reason }, { dispatch, rejectWithValue }) => {
    try {
      const res = await rmRequestsApi.requestRmAdditionalPayment(ticket, { amount, reason });
      await dispatch(fetchRmRequestDetail(ticket));
      return res;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const cancelRmAdditionalCharge = createAsyncThunk(
  'rmRequestDetail/cancelAdditionalCharge',
  async ({ ticket, chargeId }, { dispatch, rejectWithValue }) => {
    try {
      const res = await rmRequestsApi.cancelRmAdditionalCharge(ticket, chargeId);
      await dispatch(fetchRmRequestDetail(ticket));
      return res;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const convertRmVendorDispute = createAsyncThunk(
  'rmRequestDetail/convertVendorDispute',
  async ({ ticket, disputeId, amount, reason }, { dispatch, rejectWithValue }) => {
    try {
      const res = await rmRequestsApi.convertRmVendorDispute(ticket, disputeId, { amount, reason });
      await dispatch(fetchRmRequestDetail(ticket));
      return res;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const notifyRmVendorForCharge = createAsyncThunk(
  'rmRequestDetail/notifyVendorForCharge',
  async ({ ticket, chargeId }, { dispatch, rejectWithValue }) => {
    try {
      const res = await rmRequestsApi.notifyRmVendorForCharge(ticket, chargeId);
      await dispatch(fetchRmRequestDetail(ticket));
      return res;
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  detail: null,
  status: 'idle',
  error: null,
  addNoteStatus: 'idle',
  addNoteError: null,
  escalateStatus: 'idle',
  escalateError: null,
  additionalPaymentStatus: 'idle',
  additionalPaymentError: null,
};

const rmRequestDetailSlice = createSlice({
  name: 'rmRequestDetail',
  initialState,
  reducers: {
    resetRmRequestDetail: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRmRequestDetail.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchRmRequestDetail.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchRmRequestDetail.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      // Optimistically append the new note so the thread updates immediately;
      // the screen also re-fetches the detail to stay authoritative.
      .addCase(addRmRequestNote.pending, (state) => {
        state.addNoteStatus = 'loading';
        state.addNoteError = null;
      })
      .addCase(addRmRequestNote.fulfilled, (state, action) => {
        state.addNoteStatus = 'succeeded';
        if (state.detail && action.payload?.note) {
          state.detail.internalNotes = [...(state.detail.internalNotes || []), action.payload.note];
        }
      })
      .addCase(addRmRequestNote.rejected, (state, action) => {
        state.addNoteStatus = 'failed';
        state.addNoteError = action.payload;
      })
      .addCase(escalateRmRequest.pending, (state) => {
        state.escalateStatus = 'loading';
        state.escalateError = null;
      })
      .addCase(escalateRmRequest.fulfilled, (state, action) => {
        state.escalateStatus = 'succeeded';
        if (state.detail && action.payload?.escalation) {
          state.detail.escalations = [...(state.detail.escalations || []), action.payload.escalation];
        }
      })
      .addCase(escalateRmRequest.rejected, (state, action) => {
        state.escalateStatus = 'failed';
        state.escalateError = action.payload;
      });

    // Shared pending/fulfilled/rejected handling for the three additional-
    // payment mutations — each refetches the detail itself on success, so
    // this slice only needs to track a shared loading/error flag.
    [requestRmAdditionalPayment, cancelRmAdditionalCharge, convertRmVendorDispute, notifyRmVendorForCharge].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.additionalPaymentStatus = 'loading';
          state.additionalPaymentError = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.additionalPaymentStatus = 'succeeded';
        })
        .addCase(thunk.rejected, (state, action) => {
          state.additionalPaymentStatus = 'failed';
          state.additionalPaymentError = action.payload;
        });
    });
  },
});

export const { resetRmRequestDetail } = rmRequestDetailSlice.actions;
export default rmRequestDetailSlice.reducer;
