import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as vendorProfileApi from '../../Api/vendorProfileApi';

export const fetchVendorProfile = createAsyncThunk('vendorProfile/fetch', async (_, { rejectWithValue }) => {
  try {
    return await vendorProfileApi.getVendorProfile();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchVendorRates = createAsyncThunk('vendorProfile/fetchRates', async (_, { rejectWithValue }) => {
  try {
    return await vendorProfileApi.getVendorRates();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchVendorDocumentTypes = createAsyncThunk('vendorProfile/fetchDocumentTypes', async (_, { rejectWithValue }) => {
  try {
    return await vendorProfileApi.getVendorDocumentTypes();
  } catch (error) {
    return rejectWithValue(error);
  }
});

// Mutations refresh the profile on success so the UI reflects saved changes.
export const updateVendorProfile = createAsyncThunk('vendorProfile/update', async (fields, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorProfileApi.updateVendorProfile(fields);
    await dispatch(fetchVendorProfile());
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const updateVendorAvailability = createAsyncThunk('vendorProfile/availability', async (params, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorProfileApi.updateVendorAvailability(params);
    await dispatch(fetchVendorProfile());
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const uploadVendorDocument = createAsyncThunk('vendorProfile/uploadDocument', async (params, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorProfileApi.uploadVendorDocument(params);
    await dispatch(fetchVendorProfile());
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const deleteVendorDocument = createAsyncThunk('vendorProfile/deleteDocument', async (documentId, { dispatch, rejectWithValue }) => {
  try {
    const res = await vendorProfileApi.deleteVendorDocument(documentId);
    await dispatch(fetchVendorProfile());
    return res;
  } catch (error) {
    return rejectWithValue(error);
  }
});

const initialState = {
  profile: null,
  status: 'idle',
  error: null,

  rates: null,
  ratesStatus: 'idle',
  ratesError: null,

  documentTypes: [],
  documentTypesStatus: 'idle',

  // Shared status for all profile mutations (update / availability / documents).
  actionStatus: 'idle',
  actionError: null,
};

const vendorProfileSlice = createSlice({
  name: 'vendorProfile',
  initialState,
  reducers: {
    resetProfileAction: (state) => {
      state.actionStatus = 'idle';
      state.actionError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVendorProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchVendorProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.profile = action.payload;
      })
      .addCase(fetchVendorProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchVendorRates.pending, (state) => {
        state.ratesStatus = 'loading';
        state.ratesError = null;
      })
      .addCase(fetchVendorRates.fulfilled, (state, action) => {
        state.ratesStatus = 'succeeded';
        state.rates = action.payload;
      })
      .addCase(fetchVendorRates.rejected, (state, action) => {
        state.ratesStatus = 'failed';
        state.ratesError = action.payload;
      })
      .addCase(fetchVendorDocumentTypes.pending, (state) => {
        state.documentTypesStatus = 'loading';
      })
      .addCase(fetchVendorDocumentTypes.fulfilled, (state, action) => {
        state.documentTypesStatus = 'succeeded';
        state.documentTypes = action.payload;
      })
      .addCase(fetchVendorDocumentTypes.rejected, (state) => {
        state.documentTypesStatus = 'failed';
      });

    [updateVendorProfile, updateVendorAvailability, uploadVendorDocument, deleteVendorDocument].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.actionStatus = 'loading';
          state.actionError = null;
        })
        .addCase(thunk.fulfilled, (state) => {
          state.actionStatus = 'succeeded';
        })
        .addCase(thunk.rejected, (state, action) => {
          state.actionStatus = 'failed';
          state.actionError = action.payload;
        });
    });
  },
});

export const { resetProfileAction } = vendorProfileSlice.actions;
export default vendorProfileSlice.reducer;
