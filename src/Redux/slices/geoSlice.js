import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as geoApi from '../../Api/geoApi';

// Reference/master data — fetched once and cached for the app session rather
// than re-fetched by every screen that needs a country selector.
export const fetchCountries = createAsyncThunk(
  'geo/fetchCountries',
  async (_, { rejectWithValue }) => {
    try {
      return await geoApi.getCountries();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Same caching rationale as fetchCountries, for the Indian state selector.
export const fetchStates = createAsyncThunk(
  'geo/fetchStates',
  async (_, { rejectWithValue }) => {
    try {
      return await geoApi.getStates();
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchDistricts = createAsyncThunk(
  'geo/fetchDistricts',
  async (stateId, { rejectWithValue }) => {
    try {
      return await geoApi.getDistricts(stateId);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchCities = createAsyncThunk(
  'geo/fetchCities',
  async ({ stateId, districtId }, { rejectWithValue }) => {
    try {
      return await geoApi.getCities({ stateId, districtId });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

export const fetchTalukas = createAsyncThunk(
  'geo/fetchTalukas',
  async ({ districtId, cityId }, { rejectWithValue }) => {
    try {
      return await geoApi.getTalukas({ districtId, cityId });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Autocomplete assist for the international state/province field — cached
// per country rather than once per session, since the list depends on it.
export const fetchInternationalStates = createAsyncThunk(
  'geo/fetchInternationalStates',
  async (country, { rejectWithValue }) => {
    try {
      return await geoApi.getInternationalStates(country);
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// Autocomplete assist for the international city field — cached per
// country + state combination.
export const fetchInternationalCities = createAsyncThunk(
  'geo/fetchInternationalCities',
  async ({ country, state }, { rejectWithValue }) => {
    try {
      return await geoApi.getInternationalCities({ country, state });
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

// A one-off search rather than cached reference data — every call replaces
// the previous lookup's result instead of being keyed/merged.
export const fetchPostalCode = createAsyncThunk(
  'geo/fetchPostalCode',
  async (code, { rejectWithValue }) => {
    try {
      return { code, results: await geoApi.lookupPostalCode(code) };
    } catch (error) {
      return rejectWithValue(error);
    }
  }
);

const initialState = {
  countries: [], // [{ id, name, isoCode }]
  countriesStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  countriesError: null,
  states: [], // [{ id, name }]
  statesStatus: 'idle', // 'idle' | 'loading' | 'succeeded' | 'failed'
  statesError: null,
  districts: [], // [{ id, stateId, name }]
  districtsStatus: 'idle',
  districtsError: null,
  districtsStateId: null,
  cities: [], // [{ id, stateId, districtId, name }]
  citiesStatus: 'idle',
  citiesError: null,
  citiesFilterKey: null,
  talukas: [], // [{ id, districtId, cityId, name }]
  talukasStatus: 'idle',
  talukasError: null,
  talukasFilterKey: null,
  internationalStates: [], // string[]
  internationalStatesStatus: 'idle',
  internationalStatesError: null,
  internationalStatesCountry: null,
  internationalCities: [], // string[]
  internationalCitiesStatus: 'idle',
  internationalCitiesError: null,
  internationalCitiesFilterKey: null,
  postalCodeQuery: null,
  postalCodeResults: [], // [{ code, stateName, districtName, cityName, talukaName, ... }]
  postalCodeStatus: 'idle',
  postalCodeError: null,
};

const geoSlice = createSlice({
  name: 'geo',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCountries.pending, (state) => {
        state.countriesStatus = 'loading';
        state.countriesError = null;
      })
      .addCase(fetchCountries.fulfilled, (state, action) => {
        state.countriesStatus = 'succeeded';
        state.countries = action.payload;
      })
      .addCase(fetchCountries.rejected, (state, action) => {
        state.countriesStatus = 'failed';
        state.countriesError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchStates.pending, (state) => {
        state.statesStatus = 'loading';
        state.statesError = null;
      })
      .addCase(fetchStates.fulfilled, (state, action) => {
        state.statesStatus = 'succeeded';
        state.states = action.payload;
      })
      .addCase(fetchStates.rejected, (state, action) => {
        state.statesStatus = 'failed';
        state.statesError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchDistricts.pending, (state, action) => {
        state.districtsStatus = 'loading';
        state.districtsError = null;
        state.districtsStateId = action.meta.arg;
      })
      .addCase(fetchDistricts.fulfilled, (state, action) => {
        state.districtsStatus = 'succeeded';
        state.districts = action.payload;
      })
      .addCase(fetchDistricts.rejected, (state, action) => {
        state.districtsStatus = 'failed';
        state.districtsError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchCities.pending, (state, action) => {
        state.citiesStatus = 'loading';
        state.citiesError = null;
        state.citiesFilterKey = JSON.stringify(action.meta.arg);
      })
      .addCase(fetchCities.fulfilled, (state, action) => {
        state.citiesStatus = 'succeeded';
        state.cities = action.payload;
      })
      .addCase(fetchCities.rejected, (state, action) => {
        state.citiesStatus = 'failed';
        state.citiesError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchTalukas.pending, (state, action) => {
        state.talukasStatus = 'loading';
        state.talukasError = null;
        state.talukasFilterKey = JSON.stringify(action.meta.arg);
      })
      .addCase(fetchTalukas.fulfilled, (state, action) => {
        state.talukasStatus = 'succeeded';
        state.talukas = action.payload;
      })
      .addCase(fetchTalukas.rejected, (state, action) => {
        state.talukasStatus = 'failed';
        state.talukasError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchInternationalStates.pending, (state, action) => {
        state.internationalStatesStatus = 'loading';
        state.internationalStatesError = null;
        state.internationalStatesCountry = action.meta.arg;
      })
      .addCase(fetchInternationalStates.fulfilled, (state, action) => {
        state.internationalStatesStatus = 'succeeded';
        state.internationalStates = action.payload;
      })
      .addCase(fetchInternationalStates.rejected, (state, action) => {
        state.internationalStatesStatus = 'failed';
        state.internationalStatesError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchInternationalCities.pending, (state, action) => {
        state.internationalCitiesStatus = 'loading';
        state.internationalCitiesError = null;
        state.internationalCitiesFilterKey = JSON.stringify(action.meta.arg);
      })
      .addCase(fetchInternationalCities.fulfilled, (state, action) => {
        state.internationalCitiesStatus = 'succeeded';
        state.internationalCities = action.payload;
      })
      .addCase(fetchInternationalCities.rejected, (state, action) => {
        state.internationalCitiesStatus = 'failed';
        state.internationalCitiesError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      })
      .addCase(fetchPostalCode.pending, (state, action) => {
        state.postalCodeStatus = 'loading';
        state.postalCodeError = null;
        state.postalCodeQuery = action.meta.arg;
      })
      .addCase(fetchPostalCode.fulfilled, (state, action) => {
        state.postalCodeStatus = 'succeeded';
        state.postalCodeResults = action.payload.results;
      })
      .addCase(fetchPostalCode.rejected, (state, action) => {
        state.postalCodeStatus = 'failed';
        state.postalCodeResults = [];
        state.postalCodeError = action.payload || { message: 'Something went wrong. Please try again.', errors: null };
      });
  },
});

export default geoSlice.reducer;
