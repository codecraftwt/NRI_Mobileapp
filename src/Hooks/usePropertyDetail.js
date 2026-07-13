import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPropertyDetail,
  uploadPropertyAttachment,
  removePropertyAttachment,
} from '../Redux/slices/propertiesSlice';

// On-demand lookup (like usePlanDetail/useFamilyMemberDetail) — used to
// refresh a single property's detail (e.g. the edit screen), plus the
// attachment upload/remove actions that operate on that same property.
export function usePropertyDetail() {
  const dispatch = useDispatch();
  const detail = useSelector(state => state.properties.detail);
  const status = useSelector(state => state.properties.detailStatus);
  const error = useSelector(state => state.properties.detailError);
  const attachmentStatus = useSelector(state => state.properties.attachmentStatus);
  const attachmentError = useSelector(state => state.properties.attachmentError);

  return {
    detail,
    loading: status === 'loading',
    failed: status === 'failed',
    error,
    fetchDetail: (id) => dispatch(fetchPropertyDetail(id)),
    uploadingAttachment: attachmentStatus === 'loading',
    attachmentError,
    uploadAttachment: (propertyId, type, label, file) => dispatch(uploadPropertyAttachment({ propertyId, type, label, file })),
    removeAttachment: (propertyId, attachmentId) => dispatch(removePropertyAttachment({ propertyId, attachmentId })),
  };
}
