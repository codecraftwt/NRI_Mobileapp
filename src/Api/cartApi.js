import apiClient, { normalizeApiError } from './client';

export async function addCartItem(serviceId) {
  try {
    const response = await apiClient.post('/customer/cart/items', { service_id: serviceId });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

export async function getCart() {
  try {
    const response = await apiClient.get('/customer/cart');
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}
