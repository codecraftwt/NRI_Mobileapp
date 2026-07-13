import { useEffect } from 'react';
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
  const filterKey = useSelector(state => state.catalog[type].filterKey);

  const categoryId = categoryName ? categories.find(c => c.name === categoryName)?.id : null;
  const stateId = stateName ? states.find(s => s.name === stateName)?.id : null;

  useEffect(() => {
    if (!categoryId) return;
    const filterObj = { categoryId, type, stateId: stateId || null };
    if (JSON.stringify(filterObj) !== filterKey && status !== 'loading') {
      dispatch(fetchServices(filterObj));
    }
  }, [categoryId, stateId, type, filterKey, status, dispatch]);

  const currentFilter = categoryId ? { categoryId, type, stateId: stateId || null } : null;

  return {
    services,
    serviceNames: services.map(s => s.name),
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => currentFilter && dispatch(fetchServices(currentFilter)),
  };
}
