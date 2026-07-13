import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCountries } from '../Redux/slices/geoSlice';

// Fetches the country list once per app session (cached in geoSlice) and
// exposes it in the flat string-array shape the app's SelectField components
// expect, plus loading/error state for the caller to render around it.
export function useCountries() {
  const dispatch = useDispatch();
  const countries = useSelector(state => state.geo.countries);
  const status = useSelector(state => state.geo.countriesStatus);
  const error = useSelector(state => state.geo.countriesError);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCountries());
    }
  }, [status, dispatch]);

  return {
    countries,
    countryNames: countries.map(c => c.name),
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchCountries()),
  };
}
