import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchServices } from '../Redux/slices/catalogSlice';

// Lists services for a category, optionally with state-specific pricing.
// `type` is 'base' | 'addon' (defaults to 'base' — the common case for
// booking a service request). Each type is cached in its own bucket so
// fetching both for the same category doesn't overwrite one another.
export function useServicesByCategory(categoryName, stateName, { type = 'base' } = {}) {
  const dispatch = useDispatch();
  const categories = useSelector(state => state.catalog.categories);
  const states = useSelector(state => state.geo.states);
  const services = useSelector(state => state.catalog[type].services);
  const status = useSelector(state => state.catalog[type].status);
  const error = useSelector(state => state.catalog[type].error);

  const categoryId = categoryName ? categories.find(c => c.name === categoryName)?.id : null;
  const stateId = stateName ? states.find(s => s.name === stateName)?.id : null;

  const lastFilterRef = useRef(null);

  useEffect(() => {
    if (!categoryId) return;
    const currentFilter = { categoryId, type, stateId: stateId || null };
    const currentKey = JSON.stringify(currentFilter);
    if (currentKey !== lastFilterRef.current && status !== 'loading') {
      lastFilterRef.current = currentKey;
      dispatch(fetchServices(currentFilter));
    }
  }, [categoryId, stateId, type, status, dispatch]);

  const currentFilter = categoryId ? { categoryId, type, stateId: stateId || null } : null;

  return {
    services,
    serviceNames: services.map(s => s.name),
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => {
      if (currentFilter) {
        lastFilterRef.current = JSON.stringify(currentFilter);
        dispatch(fetchServices(currentFilter));
      }
    },
  };
}
