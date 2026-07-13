import apiClient, { API_BASE_URL, normalizeApiError } from './client';

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

export async function uploadDocument({ documentType, documentName, file, expiryDate, sharedWithRm, notes }) {
  try {
    const formData = new FormData();
    formData.append('document_type', documentType);
    formData.append('document_name', documentName);
    formData.append('file', file);
    if (expiryDate) formData.append('expiry_date', expiryDate);
    if (sharedWithRm) formData.append('shared_with_rm', '1');
    if (notes) formData.append('notes', notes);
    const response = await apiClient.post('/customer/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
