import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDistricts } from '../Redux/slices/geoSlice';

export function useDistricts(stateName) {
  const dispatch = useDispatch();
  const states = useSelector(state => state.geo.states);
  const districts = useSelector(state => state.geo.districts);
  const status = useSelector(state => state.geo.districtsStatus);
  const error = useSelector(state => state.geo.districtsError);
  const fetchedStateId = useSelector(state => state.geo.districtsStateId);

  const stateId = stateName ? states.find(s => s.name === stateName)?.id : null;

  useEffect(() => {
    if (stateId && stateId !== fetchedStateId && status !== 'loading') {
      dispatch(fetchDistricts(stateId));
    }
  }, [stateId, fetchedStateId, status, dispatch]);

  return {
    districts,
    districtNames: districts.map(d => d.name),
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => stateId && dispatch(fetchDistricts(stateId)),
  };
}
