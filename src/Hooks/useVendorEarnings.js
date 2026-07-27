import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVendorEarnings, fetchVendorPayoutDetail, clearPayoutDetail } from '../Redux/slices/vendorEarningsSlice';

// status: undefined (all) | 'pending' | 'processed' | 'paid'
export function useVendorEarnings({ status, page = 1 } = {}) {
  const dispatch = useDispatch();
  const totals = useSelector(s => s.vendorEarnings.totals);
  const payouts = useSelector(s => s.vendorEarnings.payouts);
  const meta = useSelector(s => s.vendorEarnings.meta);
  const reqStatus = useSelector(s => s.vendorEarnings.status);
  const error = useSelector(s => s.vendorEarnings.error);

  useEffect(() => {
    if (reqStatus === 'idle') dispatch(fetchVendorEarnings({ status, page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    totals,
    payouts,
    meta,
    loading: reqStatus === 'loading',
    failed: reqStatus === 'failed',
    error,
    fetch: (params) => dispatch(fetchVendorEarnings(params)),
    retry: () => dispatch(fetchVendorEarnings({ status, page })),
  };
}

export function useVendorPayoutDetail(payoutId) {
  const dispatch = useDispatch();
  const detail = useSelector(s => s.vendorEarnings.detail);
  const status = useSelector(s => s.vendorEarnings.detailStatus);
  const error = useSelector(s => s.vendorEarnings.detailError);

  useEffect(() => {
    if (payoutId != null) dispatch(fetchVendorPayoutDetail(payoutId));
    return () => dispatch(clearPayoutDetail());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payoutId]);

  return {
    detail,
    loading: status === 'loading' || status === 'idle',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchVendorPayoutDetail(payoutId)),
  };
}
