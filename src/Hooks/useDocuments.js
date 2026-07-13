import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDocuments } from '../Redux/slices/documentsSlice';

export function useDocuments() {
  const dispatch = useDispatch();
  const documents = useSelector(state => state.documents.documents);
  const status = useSelector(state => state.documents.status);
  const error = useSelector(state => state.documents.error);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchDocuments());
    }
  }, [status, dispatch]);

  return {
    documents,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchDocuments()),
  };
}
