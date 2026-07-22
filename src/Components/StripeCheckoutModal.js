import React, { useRef, useEffect } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { extractStripeSessionIdFromRedirect } from '../Utils/paymentGateway';

// In-app Stripe hosted-checkout. Loads `checkoutUrl` (the checkout_url the
// backend returns for gateway: "stripe") in a WebView and watches every
// navigation for Stripe's redirect back to the backend success_url, which
// carries ?session_id=cs_... On the first such redirect it hands the id to
// onSuccess so the caller can POST /customer/payments/{payment}/verify with
// { session_id } — the call that actually activates the purchase. This
// mirrors the web app's Stripe-redirect flow (PaymentSheet is not used, since
// the backend never returns a client_secret for Stripe).
export default function StripeCheckoutModal({ visible, checkoutUrl, onSuccess, onCancel, title = 'Complete Payment' }) {
  // Guards against acting twice — onNavigationStateChange can fire several
  // times for a single redirect, and we only want to verify once.
  const handledRef = useRef(false);

  useEffect(() => {
    if (visible) handledRef.current = false;
  }, [visible, checkoutUrl]);

  const handleUrl = (url) => {
    if (handledRef.current || !url) return;
    const sessionId = extractStripeSessionIdFromRedirect(url);
    if (sessionId) {
      handledRef.current = true;
      onSuccess(sessionId);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onCancel} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
          <View style={styles.lockBadge}>
            <Icon name="lock" size={14} color="#10B981" />
            <Text style={styles.lockText}>Secure</Text>
          </View>
        </View>

        {visible && !!checkoutUrl && (
          <WebView
            source={{ uri: checkoutUrl }}
            // Fires on both full page loads and in-page redirects — the
            // success_url redirect is caught here.
            onNavigationStateChange={(navState) => handleUrl(navState.url)}
            // Belt-and-suspenders: also inspect requests before they load, so
            // we catch the success_url even if it never becomes a committed
            // navigation (e.g. an immediate server-side redirect).
            onShouldStartLoadWithRequest={(req) => {
              handleUrl(req.url);
              return true;
            }}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#20304C" />
                <Text style={styles.loadingText}>Loading secure checkout…</Text>
              </View>
            )}
            javaScriptEnabled
            domStorageEnabled
            // Stripe checkout uses third-party cookies for its session.
            thirdPartyCookiesEnabled
            sharedCookiesEnabled
            originWhitelist={['*']}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#FFFFFF',
  },
  closeBtn: { width: 32, height: 32, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B', textAlign: 'center', marginHorizontal: 8 },
  lockBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ECFDF5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  lockText: { fontSize: 11, fontFamily: 'Montserrat-SemiBold', color: '#10B981' },
  loadingBox: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#FFFFFF' },
  loadingText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#64748B' },
});
