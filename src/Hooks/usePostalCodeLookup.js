import { useDispatch, useSelector } from 'react-redux';
import { fetchPostalCode } from '../Redux/slices/geoSlice';

// Unlike the other geo hooks, this isn't cached reference data — it's a
// one-off search triggered explicitly (e.g. a "Find" button next to a
// pincode field), so it exposes a `lookup(code)` trigger rather than
// fetching automatically on mount.
export function usePostalCodeLookup() {
  const dispatch = useDispatch();
  const results = useSelector(state => state.geo.postalCodeResults);
  const status = useSelector(state => state.geo.postalCodeStatus);
  const error = useSelector(state => state.geo.postalCodeError);

  return {
    results,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    lookup: (code) => dispatch(fetchPostalCode(code)),
  };
}
