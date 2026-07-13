import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchServiceCategories } from '../Redux/slices/catalogSlice';

export function useServiceCategories() {
  const dispatch = useDispatch();
  const categories = useSelector(state => state.catalog.categories);
  const status = useSelector(state => state.catalog.categoriesStatus);
  const error = useSelector(state => state.catalog.categoriesError);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchServiceCategories());
    }
  }, [status, dispatch]);

  return {
    categories,
    categoryNames: categories.map(c => c.name),
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchServiceCategories()),
  };
}
