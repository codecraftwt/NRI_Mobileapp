import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as supportTicketApi from '../../Api/supportTicketApi';

export const fetchSupportTickets = createAsyncThunk('supportTickets/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await supportTicketApi.getSupportTickets(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const createSupportTicket = createAsyncThunk('supportTickets/create', async ({ subject, message, ticketId }, { rejectWithValue }) => {
  try {
    return await supportTicketApi.createSupportTicket({ subject, message, ticketId });
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchSupportTicketDetail = createAsyncThunk('supportTickets/fetchDetail', async (ticketId, { rejectWithValue }) => {
  try {
    return await supportTicketApi.getSupportTicketDetail(ticketId);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const replySupportTicket = createAsyncThunk('supportTickets/reply', async ({ ticketId, message }, { rejectWithValue }) => {
  try {
    const reply = await supportTicketApi.replySupportTicket(ticketId, message);
    // The reply endpoint's response sometimes omits the echoed text (or returns
    // only a status message) and no id/timestamp — which left the freshly-sent
    // bubble blank until a manual refresh. Backfill from what the user actually
    // sent so it shows immediately.
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

export const escalateSupportTicket = createAsyncThunk('supportTickets/escalate', async (ticketId, { rejectWithValue }) => {
  try {
    const result = await supportTicketApi.escalateSupportTicket(ticketId);
    return { ticketId, ...result };
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
};

const supportTicketsSlice = createSlice({
  name: 'supportTickets',
  initialState,
  reducers: {
    resetCreateStatus: (state) => {
      state.createStatus = 'idle';
      state.createError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSupportTickets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchSupportTickets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets = action.payload.tickets;
        state.meta = action.payload.meta;
      })
      .addCase(fetchSupportTickets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(createSupportTicket.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createSupportTicket.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.tickets = [action.payload.ticket, ...state.tickets];
      })
      .addCase(createSupportTicket.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload;
      })
      .addCase(fetchSupportTicketDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchSupportTicketDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload.ticket;
        state.replies = action.payload.replies;
      })
      .addCase(fetchSupportTicketDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      })
      .addCase(replySupportTicket.pending, (state) => {
        state.replyStatus = 'loading';
        state.replyError = null;
      })
      .addCase(replySupportTicket.fulfilled, (state, action) => {
        state.replyStatus = 'succeeded';
        if (state.detail && state.detail.id === action.payload.ticketId) {
          state.replies = [...state.replies, action.payload.reply];
        }
      })
      .addCase(replySupportTicket.rejected, (state, action) => {
        state.replyStatus = 'failed';
        state.replyError = action.payload;
      })
      .addCase(escalateSupportTicket.pending, (state) => {
        state.escalateStatus = 'loading';
        state.escalateError = null;
      })
      .addCase(escalateSupportTicket.fulfilled, (state, action) => {
        state.escalateStatus = 'succeeded';
        if (state.detail && state.detail.id === action.payload.ticketId) {
          state.detail.status = 'escalated';
          state.detail.statusLabel = 'Escalated';
        }
      })
      .addCase(escalateSupportTicket.rejected, (state, action) => {
        state.escalateStatus = 'failed';
        state.escalateError = action.payload;
      });
  },
});

export const { resetCreateStatus } = supportTicketsSlice.actions;
export default supportTicketsSlice.reducer;
