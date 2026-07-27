import { useDispatch, useSelector } from 'react-redux';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../Redux/slices/notificationsSlice';

export function useNotifications() {
  const dispatch = useDispatch();
  const items = useSelector(s => s.notifications.items);
  const unreadCount = useSelector(s => s.notifications.unreadCount);
  const meta = useSelector(s => s.notifications.meta);
  const status = useSelector(s => s.notifications.status);
  const error = useSelector(s => s.notifications.error);

  return {
    items,
    unreadCount,
    meta,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetch: (params) => dispatch(fetchNotifications(params)),
    markRead: (id) => dispatch(markNotificationRead(id)),
    markAllRead: () => dispatch(markAllNotificationsRead()),
  };
}
