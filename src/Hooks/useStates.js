import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchStates } from '../Redux/slices/geoSlice';

// Fetches the Indian states list once per app session (cached in geoSlice)
// and exposes it in the flat string-array shape the app's SelectField
// components expect, plus loading/error state for the caller.
//
// Pass { forCustomer: true } on every customer-facing screen (address,
// property, family member, booking, cart, custom plan, service location) so
// the backend scopes the list to Maharashtra only. Leave it unset on
// vendor sign-up/coverage and other staff screens to keep the full list.
export function useStates({ forCustomer = false } = {}) {
  const dispatch = useDispatch();
  // Separate cache slots per mode (see geoSlice) so a screen using the
  // unfiltered list and one using the Maharashtra-only list can both be
  // mounted at once (e.g. React Navigation keeps prior screens alive in the
  // background) without fighting over the same status/cache and looping
  // fetches forever.
  const states = useSelector(state => forCustomer ? state.geo.customerStates : state.geo.states);
  const status = useSelector(state => forCustomer ? state.geo.customerStatesStatus : state.geo.statesStatus);
  const error = useSelector(state => forCustomer ? state.geo.customerStatesError : state.geo.statesError);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchStates(forCustomer));
    }
  }, [status, forCustomer, dispatch]);

  return {
    states,
    stateNames: states.map(s => s.name),
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchStates(forCustomer)),
  };
}
