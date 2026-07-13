import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as documentApi from '../../Api/documentApi';

export const fetchDocuments = createAsyncThunk('documents/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return await documentApi.getDocuments();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const uploadDocument = createAsyncThunk('documents/upload', async (data, { rejectWithValue }) => {
  try {
    return await documentApi.uploadDocument(data);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const toggleShareDocument = createAsyncThunk('documents/toggleShare', async (id, { rejectWithValue }) => {
  try {
    return await documentApi.toggleShareDocument(id);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const removeDocument = createAsyncThunk('documents/remove', async (id, { rejectWithValue }) => {
  try {
    return await documentApi.deleteDocument(id);
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  documents: [],
  status: 'idle',
  error: null,
  mutationStatus: 'idle',
  mutationError: null,
};

const documentsSlice = createSlice({
  name: 'documents',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.documents = action.payload;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(uploadDocument.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.documents.unshift(action.payload);
      })
      .addCase(uploadDocument.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload;
      })
      .addCase(toggleShareDocument.fulfilled, (state, action) => {
        const index = state.documents.findIndex(d => d.id === action.payload.id);
        if (index !== -1) state.documents[index] = action.payload;
      })
      .addCase(removeDocument.fulfilled, (state, action) => {
        state.documents = state.documents.filter(d => d.id !== action.payload);
      });
  },
});

export default documentsSlice.reducer;
