import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as ticketApi from '../../Api/ticketApi';

export const fetchMyTickets = createAsyncThunk('myTickets/fetchAll', async (params, { rejectWithValue }) => {
  try {
    return await ticketApi.getTickets(params);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchTicketDetail = createAsyncThunk('myTickets/fetchDetail', async (ticketId, { rejectWithValue }) => {
  try {
    return await ticketApi.getTicketDetail(ticketId);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  tickets: [],
  meta: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  status: 'idle',
  error: null,
  detail: null,
  detailStatus: 'idle',
  detailError: null,
};

const myTicketsSlice = createSlice({
  name: 'myTickets',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyTickets.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMyTickets.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.tickets = action.payload.tickets;
        state.meta = action.payload.meta;
      })
      .addCase(fetchMyTickets.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchTicketDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchTicketDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchTicketDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      });
  },
});

export default myTicketsSlice.reducer;
