import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCities } from '../Redux/slices/geoSlice';

export function useCities(stateName, districtName) {
  const dispatch = useDispatch();
  const states = useSelector(state => state.geo.states);
  const districts = useSelector(state => state.geo.districts);
  const cities = useSelector(state => state.geo.cities);
  const status = useSelector(state => state.geo.citiesStatus);
  const error = useSelector(state => state.geo.citiesError);

  const stateId = stateName ? states.find(s => s.name === stateName)?.id : null;
  const districtId = districtName ? districts.find(d => d.name === districtName)?.id : null;

  const lastFilterRef = useRef(null);

  useEffect(() => {
    if (!stateId && !districtId) return;
    const filterObj = districtId ? { stateId, districtId } : { stateId, districtId: null };
    const currentKey = JSON.stringify(filterObj);
    if (currentKey !== lastFilterRef.current && status !== 'loading') {
      lastFilterRef.current = currentKey;
      dispatch(fetchCities(filterObj));
    }
  }, [stateId, districtId, status, dispatch]);

  const currentFilter = districtId
    ? { stateId, districtId }
    : stateId
      ? { stateId, districtId: null }
      : null;

  return {
    cities,
    cityNames: cities.map(c => c.name),
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => {
      if (currentFilter) {
        lastFilterRef.current = JSON.stringify(currentFilter);
        dispatch(fetchCities(currentFilter));
      }
    },
  };
}
