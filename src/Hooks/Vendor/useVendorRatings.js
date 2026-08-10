import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVendorRatings } from '../../Redux/slices/vendorRatingsSlice';

export function useVendorRatings(page = 1) {
  const dispatch = useDispatch();
  const summary = useSelector(state => state.vendorRatings.summary);
  const ratings = useSelector(state => state.vendorRatings.ratings);
  const meta = useSelector(state => state.vendorRatings.meta);
  const status = useSelector(state => state.vendorRatings.status);
  const error = useSelector(state => state.vendorRatings.error);

  // Fetch fresh every time the screen mounts so newly-received ratings show up
  // on re-open (not just the first-ever visit).
  useEffect(() => {
    dispatch(fetchVendorRatings({ page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    summary,
    ratings,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchVendorRatings({ page: p })),
    retry: () => dispatch(fetchVendorRatings({ page })),
  };
}
