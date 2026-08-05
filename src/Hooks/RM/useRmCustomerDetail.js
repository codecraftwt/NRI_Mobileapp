import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchRmCustomerDetail, resetRmCustomerDetail } from '../../Redux/slices/rmCustomerDetailSlice';

export function useRmCustomerDetail(customer) {
  const dispatch = useDispatch();
  const detail = useSelector(s => s.rmCustomerDetail.detail);
  const status = useSelector(s => s.rmCustomerDetail.status);
  const error = useSelector(s => s.rmCustomerDetail.error);

  useEffect(() => {
    if (customer != null) dispatch(fetchRmCustomerDetail(customer));
    return () => dispatch(resetRmCustomerDetail());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer]);

  return {
    detail,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    refresh: () => dispatch(fetchRmCustomerDetail(customer)),
  };
}
