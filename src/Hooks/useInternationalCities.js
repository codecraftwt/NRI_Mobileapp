import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchInternationalCities } from '../Redux/slices/geoSlice';

// Autocomplete assist for the international city field on the profile —
// proxied from a free third-party API and cached per country + state
// combination. Not master data: the caller should still accept free text.
export function useInternationalCities(country, stateName) {
  const dispatch = useDispatch();
  const cities = useSelector(state => state.geo.internationalCities);
  const status = useSelector(state => state.geo.internationalCitiesStatus);
  const error = useSelector(state => state.geo.internationalCitiesError);

  const lastFilterRef = useRef(null);

  useEffect(() => {
    if (!country) return;
    const filterObj = { country, state: stateName || null };
    const currentKey = JSON.stringify(filterObj);
    if (currentKey !== lastFilterRef.current && status !== 'loading') {
      lastFilterRef.current = currentKey;
      dispatch(fetchInternationalCities(filterObj));
    }
  }, [country, stateName, status, dispatch]);

  return {
    cityNames: country ? cities : [],
    loading: !!country && status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => {
      if (!country) return;
      const filterObj = { country, state: stateName || null };
      lastFilterRef.current = JSON.stringify(filterObj);
      dispatch(fetchInternationalCities(filterObj));
    },
  };
}
