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

const initialState = {
  detail: null,
  status: 'idle',
  error: null,
  addNoteStatus: 'idle',
  addNoteError: null,
  escalateStatus: 'idle',
  escalateError: null,
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
  },
});

export const { resetRmRequestDetail } = rmRequestDetailSlice.actions;
export default rmRequestDetailSlice.reducer;
