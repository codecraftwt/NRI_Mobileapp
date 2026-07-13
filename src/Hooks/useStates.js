import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStates } from '../Redux/slices/geoSlice';

// Fetches the active Indian states list once per app session (cached in
// geoSlice) and exposes it in the flat string-array shape the app's
// SelectField components expect, plus loading/error state for the caller.
export function useStates() {
  const dispatch = useDispatch();
  const states = useSelector(state => state.geo.states);
  const status = useSelector(state => state.geo.statesStatus);
  const error = useSelector(state => state.geo.statesError);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchStates());
    }
  }, [status, dispatch]);

  return {
    states,
    stateNames: states.map(s => s.name),
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchStates()),
  };
}
