import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchVendorProfile,
  fetchVendorRates,
  fetchVendorDocumentTypes,
  updateVendorProfile,
  updateVendorAvailability,
  uploadVendorDocument,
  deleteVendorDocument,
} from '../../Redux/slices/vendorProfileSlice';

// Vendor profile (contact, bank, services, availability, documents) with the
// mutations for each section. Auto-fetches the profile on mount.
export function useVendorProfile() {
  const dispatch = useDispatch();
  const profile = useSelector(s => s.vendorProfile.profile);
  const status = useSelector(s => s.vendorProfile.status);
  const error = useSelector(s => s.vendorProfile.error);
  const actionStatus = useSelector(s => s.vendorProfile.actionStatus);
  const actionError = useSelector(s => s.vendorProfile.actionError);
  const documentTypes = useSelector(s => s.vendorProfile.documentTypes);
  const documentTypesStatus = useSelector(s => s.vendorProfile.documentTypesStatus);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchVendorProfile());
  }, [status, dispatch]);

  useEffect(() => {
    if (documentTypesStatus === 'idle') dispatch(fetchVendorDocumentTypes());
  }, [documentTypesStatus, dispatch]);

  // PUT requires the full contact+bank+category set — merge the caller's
  // changed fields over the current profile so nothing gets wiped.
  const buildBase = () => {
    const p = profile || {};
    return {
      business_name: p.businessName,
      contact_phone: p.contactPhone,
      contact_email: p.contactEmail,
      address: p.address,
      gst_number: p.gstNumber,
      bank_name: p.bank?.bankName,
      bank_account_name: p.bank?.accountName,
      bank_account_number: p.bank?.accountNumber,
      bank_ifsc: p.bank?.ifsc,
      upi_id: p.bank?.upiId,
      category_ids: (p.services || []).map(s => s.id),
    };
  };

  return {
    profile,
    loading: status === 'loading' || status === 'idle',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchVendorProfile()),

    actionLoading: actionStatus === 'loading',
    actionError,

    // Valid document types for the upload picker (GET .../document-types).
    documentTypes,
    documentTypesLoading: documentTypesStatus === 'loading',

    // `changes` is a snake_case partial (contact/bank/category_ids) merged over
    // the current profile before PUT.
    updateProfile: (changes) => dispatch(updateVendorProfile({ ...buildBase(), ...changes })),
    updateAvailability: (params) => dispatch(updateVendorAvailability(params)),
    uploadDocument: (params) => dispatch(uploadVendorDocument(params)),
    deleteDocument: (documentId) => dispatch(deleteVendorDocument(documentId)),
  };
}

// Read-only rates + rate-change requests (GET /vendor/profile/rates).
export function useVendorRates() {
  const dispatch = useDispatch();
  const rates = useSelector(s => s.vendorProfile.rates);
  const status = useSelector(s => s.vendorProfile.ratesStatus);
  const error = useSelector(s => s.vendorProfile.ratesError);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchVendorRates());
  }, [status, dispatch]);

  return {
    rates,
    loading: status === 'loading' || status === 'idle',
    failed: status === 'failed',
    error,
    retry: () => dispatch(fetchVendorRates()),
  };
}
