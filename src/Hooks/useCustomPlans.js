import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchCustomPlans, createCustomPlan, resetCreateStatus } from '../Redux/slices/customPlanSlice';

export function useCustomPlans(page = 1) {
  const dispatch = useDispatch();
  const tickets = useSelector(state => state.customPlan.tickets);
  const meta = useSelector(state => state.customPlan.meta);
  const status = useSelector(state => state.customPlan.status);
  const error = useSelector(state => state.customPlan.error);
  const createStatus = useSelector(state => state.customPlan.createStatus);
  const createError = useSelector(state => state.customPlan.createError);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchCustomPlans({ page }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    tickets,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchPage: (p) => dispatch(fetchCustomPlans({ page: p })),
    retry: () => dispatch(fetchCustomPlans({ page })),

    createLoading: createStatus === 'loading',
    createError,
    create: (payload) => dispatch(createCustomPlan(payload)),
    resetCreate: () => dispatch(resetCreateStatus()),
  };
}
