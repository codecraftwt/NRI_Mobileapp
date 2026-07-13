import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProperties } from '../Redux/slices/propertiesSlice';

export function useProperties() {
  const dispatch = useDispatch();
  const properties = useSelector(state => state.properties.properties);
  const status = useSelector(state => state.properties.status);
  const error = useSelector(state => state.properties.error);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchProperties());
    }
  }, [status, dispatch]);

  return {
    properties,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchProperties()),
  };
}
