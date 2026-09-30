import { useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchStateAdminUsers,
  fetchNextStateAdminUsers,
  fetchAssignableRoles,
  fetchUserRegionScope,
  fetchStateAdminUserDetail,
  createStateAdminUser,
  updateStateAdminUser,
  deleteStateAdminUser,
  restoreStateAdminUser,
  toggleStateAdminUserStatus,
  resetUserActionStatus,
  clearSelectedUser,
} from '../../Redux/slices/stateAdminUsersSlice';

export function useStateAdminUsers() {
  const dispatch = useDispatch();
  const usersState = useSelector(state => state.stateAdminUsers) || {};

  const {
    users = [],
    meta = { currentPage: 1, lastPage: 1, total: 0 },
    status = 'idle',
    error = null,
    assignableRoles = [],
    regionScope = null,
    selectedUser = null,
    detailStatus = 'idle',
    actionStatus = 'idle',
    actionError = null,
  } = usersState;

  const loadUsers = useCallback((params = {}) => {
    return dispatch(fetchStateAdminUsers(params));
  }, [dispatch]);

  const loadMore = useCallback((params = {}) => {
    if (status === 'loadingMore' || (meta.currentPage >= meta.lastPage)) return;
    dispatch(fetchNextStateAdminUsers(params));
  }, [dispatch, status, meta]);

  const loadAssignableRoles = useCallback(() => {
    return dispatch(fetchAssignableRoles());
  }, [dispatch]);

  const loadRegionScope = useCallback(() => {
    return dispatch(fetchUserRegionScope());
  }, [dispatch]);

  const loadUserDetail = useCallback((userId) => {
    return dispatch(fetchStateAdminUserDetail(userId));
  }, [dispatch]);

  const createUser = useCallback((payload) => {
    return dispatch(createStateAdminUser(payload)).unwrap();
  }, [dispatch]);

  const updateUser = useCallback((userId, data) => {
    return dispatch(updateStateAdminUser({ userId, data })).unwrap();
  }, [dispatch]);

  const deleteUser = useCallback((userId) => {
    return dispatch(deleteStateAdminUser(userId)).unwrap();
  }, [dispatch]);

  const restoreUser = useCallback((userId) => {
    return dispatch(restoreStateAdminUser(userId)).unwrap();
  }, [dispatch]);

  const toggleUserStatus = useCallback((userId) => {
    return dispatch(toggleStateAdminUserStatus(userId)).unwrap();
  }, [dispatch]);

  const clearActionStatus = useCallback(() => {
    dispatch(resetUserActionStatus());
  }, [dispatch]);

  const resetDetail = useCallback(() => {
    dispatch(clearSelectedUser());
  }, [dispatch]);

  return {
    users,
    meta,
    loading: status === 'loading',
    loadingMore: status === 'loadingMore',
    error,
    assignableRoles,
    regionScope,
    selectedUser,
    detailLoading: detailStatus === 'loading',
    actionLoading: actionStatus === 'loading',
    actionError,
    loadUsers,
    loadMore,
    loadAssignableRoles,
    loadRegionScope,
    loadUserDetail,
    createUser,
    updateUser,
    deleteUser,
    restoreUser,
    toggleUserStatus,
    clearActionStatus,
    resetDetail,
  };
}
