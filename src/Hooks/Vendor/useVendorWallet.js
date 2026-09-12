import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVendorWallet, requestWithdrawal, resetWithdrawalRequest } from '../../Redux/slices/vendorWalletSlice';

export function useVendorWallet() {
  const dispatch = useDispatch();
  const balance = useSelector(s => s.vendorWallet.balance);
  const feePercent = useSelector(s => s.vendorWallet.feePercent);
  const withdrawalModes = useSelector(s => s.vendorWallet.withdrawalModes);
  const payoutDetails = useSelector(s => s.vendorWallet.payoutDetails);
  const withdrawals = useSelector(s => s.vendorWallet.withdrawals);
  const transactions = useSelector(s => s.vendorWallet.transactions);
  const meta = useSelector(s => s.vendorWallet.meta);
  const status = useSelector(s => s.vendorWallet.status);
  const loadingMore = useSelector(s => s.vendorWallet.loadingMore);
  const error = useSelector(s => s.vendorWallet.error);
  const withdrawStatus = useSelector(s => s.vendorWallet.withdrawStatus);
  const withdrawError = useSelector(s => s.vendorWallet.withdrawError);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchVendorWallet({}));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    balance,
    feePercent,
    withdrawalModes,
    payoutDetails,
    withdrawals,
    transactions,
    meta,
    loading: status === 'loading',
    loadingMore,
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchVendorWallet({})),
    // Paginates the wallet History (transactions) list — withdrawal requests
    // aren't paginated by the backend.
    loadMore: () => {
      if (status === 'loading' || loadingMore || meta.currentPage >= meta.lastPage) return;
      dispatch(fetchVendorWallet({ page: meta.currentPage + 1 }));
    },

    requestWithdrawal: (params) => dispatch(requestWithdrawal(params)),
    withdrawing: withdrawStatus === 'loading',
    withdrawError,
    resetWithdrawalRequest: () => dispatch(resetWithdrawalRequest()),
  };
}
