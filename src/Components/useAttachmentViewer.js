import React, { useState, useCallback } from 'react';
import { Modal, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import { useToast } from '../context/ToastContext';
import { openRemoteFile } from '../Utils/fileDownload';

// Opening a raw storage URL in the browser drops the app's auth token (blank
// page) and never previews in-app. This hook fetches attachments WITH the
// Bearer token: images preview in a full-screen modal (Image carries the
// token via source headers), other files download and open in the OS viewer.
const isImageUrl = (u) => /\.(png|jpe?g|webp|gif|heic|bmp)(\?|$)/i.test(String(u || ''));

export function useAttachmentViewer() {
  const token = useSelector(s => s.user.token);
  const { showToast } = useToast();
  const [previewUri, setPreviewUri] = useState(null);

  // Accepts a url string or an attachment object ({ url, name }).
  const openAttachment = useCallback(async (urlOrItem, nameArg) => {
    const url = typeof urlOrItem === 'string' ? urlOrItem : urlOrItem?.url;
    const name = nameArg || (typeof urlOrItem === 'object' ? urlOrItem?.name : null) || 'attachment';
    if (!url) return;
    if (isImageUrl(url)) {
      setPreviewUri(url);
      return;
    }
    try {
      showToast('Opening attachment…', 'success');
      await openRemoteFile({ url, filename: name, token });
    } catch (e) {
      showToast(e?.message || 'Could not open the attachment', 'error');
    }
  }, [token, showToast]);

  const preview = (
    <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setPreviewUri(null)}>
        <TouchableOpacity style={styles.close} onPress={() => setPreviewUri(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="close" size={26} color="#FFFFFF" />
        </TouchableOpacity>
        {!!previewUri && (
          <Image
            source={{ uri: previewUri, headers: token ? { Authorization: `Bearer ${token}` } : undefined }}
            style={styles.image}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>
    </Modal>
  );

  return { openAttachment, preview };
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
  close: { position: 'absolute', top: 48, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  image: { width: '92%', height: '80%' },
});
