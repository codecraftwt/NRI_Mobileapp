import apiClient, { normalizeApiError } from './client';

// GET /api/v1/legal — public, no auth required. Returns Terms & Conditions
// and Privacy Policy as sanitized HTML (h1/h2/p/ul/li/a/strong only), each
// already including its own title and "Last updated" line. Same source the
// web /terms-and-conditions and /privacy-policy pages render from.
export async function getLegalDocuments() {
  try {
    const response = await apiClient.get('/legal');
    const list = response.data?.data || response.data || [];
    return list.map(doc => ({
      document: doc.document,
      title: doc.title,
      contentHtml: doc.content_html,
    }));
  } catch (error) {
    throw normalizeApiError(error);
  }
}
