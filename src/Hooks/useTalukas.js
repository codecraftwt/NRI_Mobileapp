import { useEffect } from 'react';
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
  const filterKey = useSelector(state => state.geo.talukasFilterKey);

  const districtId = districtName ? districts.find(d => d.name === districtName)?.id : null;
  const cityId = cityName ? cities.find(c => c.name === cityName)?.id : null;

  useEffect(() => {
    if (!districtId && !cityId) return;
    const filterObj = cityId ? { cityId, districtId: null } : { districtId, cityId: null };
    if (JSON.stringify(filterObj) !== filterKey && status !== 'loading') {
      dispatch(fetchTalukas(filterObj));
    }
  }, [districtId, cityId, filterKey, status, dispatch]);

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
    retry: () => currentFilter && dispatch(fetchTalukas(currentFilter)),
  };
}
