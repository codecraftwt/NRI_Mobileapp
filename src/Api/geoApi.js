import apiClient, { normalizeApiError } from './client';

function mapCountry(raw) {
  return {
    id: raw.id,
    name: raw.name,
    isoCode: raw.iso2,
    phoneCode: raw.phone_code,
    currencyCode: raw.currency_code,
    currencySymbol: raw.currency_symbol,
    flagEmoji: raw.flag_emoji,
  };
}

export async function getCountries() {
  try {
    const response = await apiClient.get('/geo/countries');
    const list = response.data?.data || response.data || [];
    return list.map(mapCountry);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapState(raw) {
  return {
    id: raw.id,
    name: raw.name,
  };
}

export async function getStates() {
  try {
    const response = await apiClient.get('/geo/states');
    const list = response.data?.data || response.data || [];
    return list.map(mapState);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapDistrict(raw) {
  return {
    id: raw.id,
    stateId: raw.state_id,
    name: raw.name,
  };
}

export async function getDistricts(stateId) {
  try {
    const response = await apiClient.get('/geo/districts', { params: { state_id: stateId } });
    const list = response.data?.data || response.data || [];
    return list.map(mapDistrict);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapCity(raw) {
  return {
    id: raw.id,
    stateId: raw.state_id,
    districtId: raw.district_id,
    name: raw.name,
  };
}

export async function getCities({ stateId, districtId } = {}) {
  try {
    const params = {};
    if (districtId) params.district_id = districtId;
    else if (stateId) params.state_id = stateId;
    const response = await apiClient.get('/geo/cities', { params });
    const list = response.data?.data || response.data || [];
    return list.map(mapCity);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function mapTaluka(raw) {
  return {
    id: raw.id,
    districtId: raw.district_id,
    cityId: raw.city_id,
    name: raw.name,
  };
}

export async function getTalukas({ districtId, cityId } = {}) {
  try {
    const params = {};
    if (cityId) params.city_id = cityId;
    else if (districtId) params.district_id = districtId;
    const response = await apiClient.get('/geo/talukas', { params });
    const list = response.data?.data || response.data || [];
    return list.map(mapTaluka);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// The API's docs only promise "matching postal codes with their geo chain" —
// the exact shape of that chain isn't nailed down (and the endpoint
// currently 500s server-side on every code, so there's no real payload to
// verify against yet). This mapper is deliberately defensive: it accepts
// either nested relation objects (state/district/city/taluka) or flat
// `*_name` fields, whichever the backend ends up sending.
function mapPostalCode(raw) {
  return {
    id: raw.id,
    code: raw.code ?? raw.pincode ?? raw.postal_code,
    stateId: raw.state_id ?? raw.state?.id ?? null,
    stateName: raw.state?.name ?? raw.state_name ?? null,
    districtId: raw.district_id ?? raw.district?.id ?? null,
    districtName: raw.district?.name ?? raw.district_name ?? null,
    cityId: raw.city_id ?? raw.city?.id ?? null,
    cityName: raw.city?.name ?? raw.city_name ?? null,
    talukaId: raw.taluka_id ?? raw.taluka?.id ?? null,
    talukaName: raw.taluka?.name ?? raw.taluka_name ?? null,
  };
}

export async function lookupPostalCode(code) {
  try {
    const response = await apiClient.get('/geo/postal-codes', { params: { code } });
    const list = response.data?.data || response.data || [];
    return list.map(mapPostalCode);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Both international endpoints proxy a free third-party API and just return
// flat name strings (not master data — free text is still accepted on save),
// so the mapper only needs to normalize string vs. { name } shapes.
function mapGeoName(raw) {
  return typeof raw === 'string' ? raw : raw?.name;
}

export async function getInternationalStates(country) {
  try {
    const response = await apiClient.get('/geo/international-states', { params: { country } });
    const list = response.data?.data?.states || response.data?.data || response.data || [];
    return list.map(mapGeoName).filter(Boolean);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getInternationalCities({ country, state } = {}) {
  try {
    const params = { country };
    if (state) params.state = state;
    const response = await apiClient.get('/geo/international-cities', { params });
    const list = response.data?.data?.cities || response.data?.data || response.data || [];
    return list.map(mapGeoName).filter(Boolean);
  } catch (error) {
    throw normalizeApiError(error);
  }
}
