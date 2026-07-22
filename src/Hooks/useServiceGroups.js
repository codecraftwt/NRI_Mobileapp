import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchServiceGroups } from '../Redux/slices/catalogSlice';

// Services for a category split into one-time (allows_single_use) and
// recurring (allows_recurring) buckets. `stateName` optionally requests
// state-specific pricing. Used by the ServiceDetail screen's two tabs.
export function useServiceGroups(categoryName, stateName) {
  const dispatch = useDispatch();
  const categories = useSelector(state => state.catalog.categories);
  const states = useSelector(state => state.geo.states);
  const groups = useSelector(state => state.catalog.groups);

  const categoryId = categoryName ? categories.find(c => c.name === categoryName)?.id : null;
  const stateId = stateName ? states.find(s => s.name === stateName)?.id : null;

  const lastFilterRef = useRef(null);

  useEffect(() => {
    if (!categoryId) return;
    const currentFilter = { categoryId, stateId: stateId || null };
    const currentKey = JSON.stringify(currentFilter);
    if (currentKey !== lastFilterRef.current && groups.status !== 'loading') {
      lastFilterRef.current = currentKey;
      dispatch(fetchServiceGroups(currentFilter));
    }
  }, [categoryId, stateId, groups.status, dispatch]);

  const retry = () => {
    if (categoryId) {
      const currentFilter = { categoryId, stateId: stateId || null };
      lastFilterRef.current = JSON.stringify(currentFilter);
      dispatch(fetchServiceGroups(currentFilter));
    }
  };

  return {
    oneTime: groups.oneTime,
    recurring: groups.recurring,
    loading: groups.status === 'loading',
    failed: groups.status === 'failed',
    error: groups.error,
    retry,
  };
}
