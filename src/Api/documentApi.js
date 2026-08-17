import apiClient, { API_BASE_URL, normalizeApiError, postMultipart } from './client';

function mapDocument(raw) {
  return {
    id: raw.id,
    documentType: raw.document_type,
    documentName: raw.document_name,
    expiryDate: raw.expiry_date ? raw.expiry_date.slice(0, 10) : null,
    isExpired: !!raw.is_expired,
    expiringSoon: !!raw.expiring_soon,
    sharedWithRm: !!raw.shared_with_rm,
    notes: raw.notes || '',
    createdAt: raw.created_at,
  };
}

export async function getDocuments() {
  try {
    const response = await apiClient.get('/customer/documents');
    const list = response.data?.data || response.data || [];
    return list.map(mapDocument);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

// Uses postMultipart (react-native-blob-util) rather than axios/FormData —
// axios's multipart body stalls against this backend until the request times
// out, surfacing as a "Network error" (same issue fixed for other uploads).
export async function uploadDocument({ documentType, documentName, file, expiryDate, sharedWithRm, notes }) {
  try {
    const fields = { document_type: documentType, document_name: documentName };
    if (expiryDate) fields.expiry_date = expiryDate;
    if (sharedWithRm) fields.shared_with_rm = '1';
    if (notes) fields.notes = notes;
    const response = await postMultipart('/customer/documents', fields, [
      { field: 'file', uri: file.uri, name: file.name, type: file.type },
    ]);
    return mapDocument(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function toggleShareDocument(id) {
  try {
    const response = await apiClient.post(`/customer/documents/${id}/toggle-share`);
    return mapDocument(response.data?.data || response.data);
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function deleteDocument(id) {
  try {
    await apiClient.delete(`/customer/documents/${id}`);
    return id;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export function getDocumentDownloadUrl(id) {
  return `${API_BASE_URL}/customer/documents/${id}/download`;
}
