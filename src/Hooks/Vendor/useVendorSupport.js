import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVendorDisputes, raiseVendorDispute, resetRaiseStatus } from '../../Redux/slices/vendorSupportSlice';

export function useVendorSupport(page = 1) {
  const dispatch = useDispatch();
  const disputes = useSelector(state => state.vendorSupport.disputes);
  const meta = useSelector(state => state.vendorSupport.meta);
  const status = useSelector(state => state.vendorSupport.status);
  const error = useSelector(state => state.vendorSupport.error);
  const raiseStatus = useSelector(state => state.vendorSupport.raiseStatus);
  const raiseError = useSelector(state => state.vendorSupport.raiseError);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchVendorDisputes({ page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    disputes,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchVendorDisputes({ page: p })),
    retry: () => dispatch(fetchVendorDisputes({ page })),

    raiseLoading: raiseStatus === 'loading',
    raiseSucceeded: raiseStatus === 'succeeded',
    raiseError,
    raise: ({ ticketId, reason, amount }) => dispatch(raiseVendorDispute({ ticketId, reason, amount })),
    resetRaise: () => dispatch(resetRaiseStatus()),
  };
}
