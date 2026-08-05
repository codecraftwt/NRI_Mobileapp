import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchRmPlanner,
  addRmPlannerEvent,
  completeRmPlannerEvent,
  deleteRmPlannerEvent,
} from '../../Redux/slices/rmPlannerSlice';

export function useRmPlanner() {
  const dispatch = useDispatch();
  const overdue = useSelector(s => s.rmPlanner.overdue);
  const today = useSelector(s => s.rmPlanner.today);
  const upcoming = useSelector(s => s.rmPlanner.upcoming);
  const recentlyDone = useSelector(s => s.rmPlanner.recentlyDone);
  const status = useSelector(s => s.rmPlanner.status);
  const error = useSelector(s => s.rmPlanner.error);
  const adding = useSelector(s => s.rmPlanner.adding);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchRmPlanner());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    overdue,
    today,
    upcoming,
    recentlyDone,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    adding,
    refresh: () => dispatch(fetchRmPlanner()),
    add: (payload) => dispatch(addRmPlannerEvent(payload)),
    complete: (event) => dispatch(completeRmPlannerEvent(event)),
    remove: (event) => dispatch(deleteRmPlannerEvent(event)),
  };
}
