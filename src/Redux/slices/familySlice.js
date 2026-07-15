import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as familyApi from '../../Api/familyApi';

export const fetchFamilyMembers = createAsyncThunk('family/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return await familyApi.getFamilyMembers();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchFamilyMemberDetail = createAsyncThunk('family/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await familyApi.getFamilyMember(id);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const addFamilyMember = createAsyncThunk('family/add', async (data, { rejectWithValue }) => {
  try {
    return await familyApi.createFamilyMember(data);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const updateFamilyMember = createAsyncThunk('family/update', async ({ id, ...data }, { rejectWithValue }) => {
  try {
    return await familyApi.updateFamilyMember(id, data);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const removeFamilyMember = createAsyncThunk('family/remove', async (id, { rejectWithValue }) => {
  try {
    return await familyApi.deleteFamilyMember(id);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  members: [],
  status: 'idle',
  error: null,
  detail: null,
  detailStatus: 'idle',
  detailError: null,
  mutationStatus: 'idle',
  mutationError: null,
};

const familySlice = createSlice({
  name: 'family',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFamilyMembers.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchFamilyMembers.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.members = action.payload;
      })
      .addCase(fetchFamilyMembers.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchFamilyMemberDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
        // `detail` is a single shared slot — if it's left holding the
        // previous fetch's data while a new one is in flight, AddFamilyMember's
        // populate-on-load effect (guarded by a one-shot `hasPopulated` flag)
        // grabs this stale value before the fresh fetch resolves, then never
        // re-applies the corrected data once it arrives. Clearing it here
        // means the effect waits for the real result instead.
        state.detail = null;
      })
      .addCase(fetchFamilyMemberDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchFamilyMemberDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      })
      .addCase(addFamilyMember.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(addFamilyMember.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.members.push(action.payload);
      })
      .addCase(addFamilyMember.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload;
      })
      .addCase(updateFamilyMember.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(updateFamilyMember.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        const index = state.members.findIndex(m => m.id === action.payload.id);
        if (index !== -1) state.members[index] = action.payload;
      })
      .addCase(updateFamilyMember.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload;
      })
      .addCase(removeFamilyMember.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(removeFamilyMember.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.members = state.members.filter(m => m.id !== action.payload);
      })
      .addCase(removeFamilyMember.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload;
      });
  },
});

export default familySlice.reducer;
