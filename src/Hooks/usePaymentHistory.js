import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchPaymentHistory } from '../Redux/slices/billingSlice';

export function usePaymentHistory(page = 1) {
  const dispatch = useDispatch();
  const payments = useSelector(state => state.billing.payments);
  const meta = useSelector(state => state.billing.paymentsMeta);
  const status = useSelector(state => state.billing.paymentsStatus);
  const error = useSelector(state => state.billing.paymentsError);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchPaymentHistory({ page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    payments,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchPaymentHistory({ page: p })),
    retry: () => dispatch(fetchPaymentHistory({ page })),
  };
}
