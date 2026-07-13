import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as propertyApi from '../../Api/propertyApi';

export const fetchProperties = createAsyncThunk('properties/fetchAll', async (_, { rejectWithValue }) => {
  try {
    return await propertyApi.getProperties();
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const fetchPropertyDetail = createAsyncThunk('properties/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await propertyApi.getProperty(id);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const addProperty = createAsyncThunk('properties/add', async (data, { rejectWithValue }) => {
  try {
    return await propertyApi.createProperty(data);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const updateProperty = createAsyncThunk('properties/update', async ({ id, ...data }, { rejectWithValue }) => {
  try {
    return await propertyApi.updateProperty(id, data);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const removeProperty = createAsyncThunk('properties/remove', async (id, { rejectWithValue }) => {
  try {
    return await propertyApi.deleteProperty(id);
  } catch (error) {
    return rejectWithValue(error);
  }
});

export const uploadPropertyAttachment = createAsyncThunk(
  'properties/uploadAttachment',
  async ({ propertyId, type, label, file }, { rejectWithValue }) => {
    try {
      const attachment = await propertyApi.uploadAttachment(propertyId, { type, label, file });
      return { propertyId, attachment };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const removePropertyAttachment = createAsyncThunk(
  'properties/removeAttachment',
  async ({ propertyId, attachmentId }, { rejectWithValue }) => {
    try {
      await propertyApi.deleteAttachment(propertyId, attachmentId);
      return { propertyId, attachmentId };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

function patchProperty(state, propertyId, patch) {
  const index = state.properties.findIndex(p => p.id === propertyId);
  if (index !== -1) state.properties[index] = patch(state.properties[index]);
  if (state.detail && state.detail.id === propertyId) state.detail = patch(state.detail);
}

const initialState = {
  properties: [],
  status: 'idle',
  error: null,
  detail: null,
  detailStatus: 'idle',
  detailError: null,
  mutationStatus: 'idle',
  mutationError: null,
  attachmentStatus: 'idle',
  attachmentError: null,
};

const propertiesSlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProperties.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProperties.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.properties = action.payload;
      })
      .addCase(fetchProperties.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchPropertyDetail.pending, (state) => {
        state.detailStatus = 'loading';
        state.detailError = null;
      })
      .addCase(fetchPropertyDetail.fulfilled, (state, action) => {
        state.detailStatus = 'succeeded';
        state.detail = action.payload;
      })
      .addCase(fetchPropertyDetail.rejected, (state, action) => {
        state.detailStatus = 'failed';
        state.detailError = action.payload;
      })
      .addCase(addProperty.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(addProperty.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.properties.push(action.payload);
      })
      .addCase(addProperty.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload;
      })
      .addCase(updateProperty.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(updateProperty.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        const index = state.properties.findIndex(p => p.id === action.payload.id);
        if (index !== -1) state.properties[index] = action.payload;
        if (state.detail && state.detail.id === action.payload.id) state.detail = action.payload;
      })
      .addCase(updateProperty.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload;
      })
      .addCase(removeProperty.pending, (state) => {
        state.mutationStatus = 'loading';
        state.mutationError = null;
      })
      .addCase(removeProperty.fulfilled, (state, action) => {
        state.mutationStatus = 'succeeded';
        state.properties = state.properties.filter(p => p.id !== action.payload);
      })
      .addCase(removeProperty.rejected, (state, action) => {
        state.mutationStatus = 'failed';
        state.mutationError = action.payload;
      })
      .addCase(uploadPropertyAttachment.pending, (state) => {
        state.attachmentStatus = 'loading';
        state.attachmentError = null;
      })
      .addCase(uploadPropertyAttachment.fulfilled, (state, action) => {
        state.attachmentStatus = 'succeeded';
        const { propertyId, attachment } = action.payload;
        patchProperty(state, propertyId, (p) => ({ ...p, attachments: [attachment, ...p.attachments] }));
      })
      .addCase(uploadPropertyAttachment.rejected, (state, action) => {
        state.attachmentStatus = 'failed';
        state.attachmentError = action.payload;
      })
      .addCase(removePropertyAttachment.pending, (state) => {
        state.attachmentStatus = 'loading';
        state.attachmentError = null;
      })
      .addCase(removePropertyAttachment.fulfilled, (state, action) => {
        state.attachmentStatus = 'succeeded';
        const { propertyId, attachmentId } = action.payload;
        patchProperty(state, propertyId, (p) => ({ ...p, attachments: p.attachments.filter(a => a.id !== attachmentId) }));
      })
      .addCase(removePropertyAttachment.rejected, (state, action) => {
        state.attachmentStatus = 'failed';
        state.attachmentError = action.payload;
      });
  },
});

export default propertiesSlice.reducer;
