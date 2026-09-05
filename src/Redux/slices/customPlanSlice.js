import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as customPlanApi from '../../Api/customPlanApi';

export const fetchCustomPlans = createAsyncThunk('customPlan/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await customPlanApi.getCustomPlans(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const createCustomPlan = createAsyncThunk('customPlan/create', async ({ subject, message, serviceId, stateId, cityId, gateway }, { rejectWithValue }) => {
  try {
    return await customPlanApi.createCustomPlan({ subject, message, serviceId, stateId, cityId, gateway });
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchCustomPlanDetail = createAsyncThunk('customPlan/fetchDetail', async (ticketId, { rejectWithValue }) => {
  try {
    return await customPlanApi.getCustomPlanDetail(ticketId);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const replyCustomPlan = createAsyncThunk('customPlan/reply', async ({ ticketId, message }, { rejectWithValue }) => {
  try {
    const reply = await customPlanApi.replyCustomPlan(ticketId, message);
    // Backfill from what was actually sent — mirrors supportTicketsSlice's
    // replySupportTicket, since the reply endpoint sometimes echoes back an
    // incomplete/empty payload.
    return {
      ticketId,
      reply: {
        ...reply,
        id: reply.id ?? `local-${Date.now()}`,
        message: reply.message || message,
        createdAt: reply.createdAt || new Date().toISOString(),
        fromCustomer: true,
      },
    };
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const escalateCustomPlan = createAsyncThunk('customPlan/escalate', async (ticketId, { rejectWithValue }) => {
  try {
    const result = await customPlanApi.escalateCustomPlan(ticketId);
    return { ticketId, ...result };
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const acceptCustomPlanProposal = createAsyncThunk('customPlan/acceptPlan', async ({ ticketId, replyId }, { rejectWithValue }) => {
  try {
    return await customPlanApi.acceptCustomPlanProposal(ticketId, replyId);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  tickets: [],
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  error: null,

  createStatus: 'idle',
  createError: null,

  detail: null,
  replies: [],
  detailStatus: 'idle',
  detailError: null,

  replyStatus: 'idle',
  replyError: null,

  escalateStatus: 'idle',
  escalateError: null,

  acceptPlanStatus: 'idle',
  acceptPlanError: null,
};

const customPlanSlice = createSlice({
  name: 'customPlan',
  initialState,
  reducers: {
    resetCreateStatus: (state) => {
      state.createStatus = 'idle';
      state.createError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCustomPlans.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchCustomPlans.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets = action.payload.tickets;
        state.meta = action.payload.meta;
      })
      .addCase(fetchCustomPlans.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createCustomPlan.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createCustomPlan.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        if (action.payload.ticket) state.tickets = [action.payload.ticket, ...state.tickets];
      })
      .addCase(createCustomPlan.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload;
      })
      .addCase(fetchCustomPlanDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchCustomPlanDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload.ticket;
        state.replies = action.payload.replies;
      })
      .addCase(fetchCustomPlanDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      })
      .addCase(replyCustomPlan.pending, (state) => {
        state.replyStatus = 'loading';
        state.replyError = null;
      })
      .addCase(replyCustomPlan.fulfilled, (state, action) => {
        state.replyStatus = 'succeeded';
        if (state.detail && state.detail.id === action.payload.ticketId) {
          state.replies = [...state.replies, action.payload.reply];
        }
      })
      .addCase(replyCustomPlan.rejected, (state, action) => {
        state.replyStatus = 'failed';
        state.replyError = action.payload;
      })
      .addCase(escalateCustomPlan.pending, (state) => {
        state.escalateStatus = 'loading';
        state.escalateError = null;
      })
      .addCase(escalateCustomPlan.fulfilled, (state, action) => {
        state.escalateStatus = 'succeeded';
        if (state.detail && state.detail.id === action.payload.ticketId) {
          state.detail.status = 'escalated';
          state.detail.statusLabel = 'Escalated';
        }
      })
      .addCase(escalateCustomPlan.rejected, (state, action) => {
        state.escalateStatus = 'failed';
        state.escalateError = action.payload;
      })
      .addCase(acceptCustomPlanProposal.pending, (state) => {
        state.acceptPlanStatus = 'loading';
        state.acceptPlanError = null;
      })
      .addCase(acceptCustomPlanProposal.fulfilled, (state) => {
        state.acceptPlanStatus = 'succeeded';
      })
      .addCase(acceptCustomPlanProposal.rejected, (state, action) => {
        state.acceptPlanStatus = 'failed';
        state.acceptPlanError = action.payload;
      });
  },
});

export const { resetCreateStatus } = customPlanSlice.actions;
export default customPlanSlice.reducer;
