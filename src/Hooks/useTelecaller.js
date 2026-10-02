import { useState, useEffect, useCallback } from 'react';
import { getTelecallerInfo, requestTelecallerCallback } from '../Api/telecallerApi';

export function useTelecaller() {
  const [data, setData] = useState({
    telecaller: null,
    pendingCallback: null,
    options: { topics: [], preferredTimes: [] },
  });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTelecaller = useCallback(async () => {
    try {
      setLoading(true);
      setFailed(false);
      setError(null);
      const res = await getTelecallerInfo();
      setData(res);
    } catch (err) {
      setFailed(true);
      setError(err?.message || 'Failed to load telecaller details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelecaller();
  }, [fetchTelecaller]);

  const submitCallback = useCallback(async (payload) => {
    try {
      setSubmitting(true);
      const res = await requestTelecallerCallback(payload);
      // Immediately refresh telecaller info to retrieve updated pending_callback
      await fetchTelecaller();
      return { success: true, data: res };
    } catch (err) {
      return {
        success: false,
        message: err?.message || 'Could not request callback. Please try again.',
        errors: err?.errors || null,
        status: err?.status,
      };
    } finally {
      setSubmitting(false);
    }
  }, [fetchTelecaller]);

  return {
    telecaller: data.telecaller,
    pendingCallback: data.pendingCallback,
    options: data.options,
    loading,
    failed,
    error,
    submitting,
    retry: fetchTelecaller,
    submitCallback,
  };
}
