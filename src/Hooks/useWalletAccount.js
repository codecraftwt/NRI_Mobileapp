import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchWallet,
  fetchWalletTransactions,
  requestCashout,
} from '../Redux/slices/walletAccountSlice';

export function useWalletAccount() {
  const dispatch = useDispatch();
  const balance = useSelector(state => state.walletAccount.balance);
  const cashout = useSelector(state => state.walletAccount.cashout);
  const status = useSelector(state => state.walletAccount.status);
  const error = useSelector(state => state.walletAccount.error);

  const transactions = useSelector(state => state.walletAccount.transactions);
  const transactionsMeta = useSelector(state => state.walletAccount.transactionsMeta);
  const transactionsStatus = useSelector(state => state.walletAccount.transactionsStatus);
  const transactionsError = useSelector(state => state.walletAccount.transactionsError);

  const cashoutStatus = useSelector(state => state.walletAccount.cashoutStatus);
  const cashoutError = useSelector(state => state.walletAccount.cashoutError);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchWallet());
  }, [status, dispatch]);

  useEffect(() => {
    if (transactionsStatus === 'idle') dispatch(fetchWalletTransactions({}));
  }, [transactionsStatus, dispatch]);

  return {
    balance,
    cashout,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchWallet()),

    transactions,
    transactionsMeta,
    transactionsLoading: transactionsStatus === 'loading',
    transactionsFailed: transactionsStatus === 'failed',
    transactionsError,
    fetchTransactions: (page) => dispatch(fetchWalletTransactions({ page })),

    cashoutLoading: cashoutStatus === 'loading',
    cashoutFailed: cashoutStatus === 'failed',
    cashoutError,
    requestCashout: (amount, bankDetails) => dispatch(requestCashout({ amount, bankDetails })),
  };
}
