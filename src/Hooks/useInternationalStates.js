import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInternationalStates } from '../Redux/slices/geoSlice';

// Autocomplete assist for the international state/province field on the
// profile — proxied from a free third-party API and cached per country.
// Not master data: the caller should still accept free text on save.
export function useInternationalStates(country) {
  const dispatch = useDispatch();
  const states = useSelector(state => state.geo.internationalStates);
  const status = useSelector(state => state.geo.internationalStatesStatus);
  const error = useSelector(state => state.geo.internationalStatesError);

  const lastCountryRef = useRef(null);

  useEffect(() => {
    if (!country) return;
    if (country !== lastCountryRef.current && status !== 'loading') {
      lastCountryRef.current = country;
      dispatch(fetchInternationalStates(country));
    }
  }, [country, status, dispatch]);

  return {
    stateNames: country ? states : [],
    loading: !!country && status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => {
      if (!country) return;
      lastCountryRef.current = country;
      dispatch(fetchInternationalStates(country));
    },
  };
}
