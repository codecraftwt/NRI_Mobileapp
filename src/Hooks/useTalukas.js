import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchTalukas } from '../Redux/slices/geoSlice';

// Prefers filtering by city when both a district and city are known (more
// specific), falling back to district alone — mirrors useCities' pattern.
export function useTalukas(districtName, cityName) {
  const dispatch = useDispatch();
  const districts = useSelector(state => state.geo.districts);
  const cities = useSelector(state => state.geo.cities);
  const talukas = useSelector(state => state.geo.talukas);
  const status = useSelector(state => state.geo.talukasStatus);
  const error = useSelector(state => state.geo.talukasError);

  const districtId = districtName ? districts.find(d => d.name === districtName)?.id : null;
  const cityId = cityName ? cities.find(c => c.name === cityName)?.id : null;

  const lastFilterRef = useRef(null);

  useEffect(() => {
    if (!districtId && !cityId) return;
    const filterObj = cityId ? { cityId, districtId: null } : { districtId, cityId: null };
    const currentKey = JSON.stringify(filterObj);
    if (currentKey !== lastFilterRef.current && status !== 'loading') {
      lastFilterRef.current = currentKey;
      dispatch(fetchTalukas(filterObj));
    }
  }, [districtId, cityId, status, dispatch]);

  const currentFilter = cityId
    ? { cityId, districtId: null }
    : districtId
      ? { districtId, cityId: null }
      : null;

  return {
    talukas,
    talukaNames: talukas.map(t => t.name),
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => {
      if (currentFilter) {
        lastFilterRef.current = JSON.stringify(currentFilter);
        dispatch(fetchTalukas(currentFilter));
      }
    },
  };
}
