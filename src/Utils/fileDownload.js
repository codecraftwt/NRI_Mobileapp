import { Platform, PermissionsAndroid } from 'react-native';
import RNBlobUtil from 'react-native-blob-util';

const EXTENSION_BY_MIME = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
};

function withExtension(filename, mime) {
  if (/\.[a-z0-9]{2,4}$/i.test(filename)) return filename;
  const ext = EXTENSION_BY_MIME[mime] || 'bin';
  return `${filename}.${ext}`;
}

// Below Android 10, MediaStore.Downloads doesn't exist yet — writing a file
// into the public Downloads folder falls back to plain file APIs, which
// need this permission on those older OS versions only.
async function requestLegacyStoragePermission() {
  if (Platform.OS !== 'android' || Platform.Version >= 29) return true;
  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

// Deliberately does NOT use RNBlobUtil's `fileCache`/`path` streaming mode:
// that mode marks a download "interrupted" whenever bytesDownloaded doesn't
// exactly equal the response's Content-Length, which trips up over ngrok's
// tunnel (it frequently re-proxies responses as chunked transfer-encoding,
// so Content-Length is absent/mismatched even though the body arrived fine).
// Fetching in-memory and writing the file ourselves sidesteps that check.
export async function downloadDocumentFile({ url, filename, token }) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'ngrok-skip-browser-warning': 'true',
  };

  // react-native-blob-util issues this GET over its own native HTTP client
  // (OkHttp/NSURLSession), not RN's JS XMLHttpRequest — so it never appears
  // in Chrome DevTools/Flipper's Network tab even though it really hits the
  // server. Logging it here makes that visible in the Metro/logcat output.
  console.log('[fileDownload] GET', url);
  const res = await RNBlobUtil.fetch('GET', url, headers);
  console.log('[fileDownload] response status', res.respInfo?.status, 'for', url);

  const status = res.respInfo?.status;
  if (status && status >= 400) {
    let message = `Download failed (HTTP ${status}).`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // response wasn't JSON — keep the generic HTTP status message
    }
    throw new Error(message);
  }

  const mime = res.respInfo?.headers?.['Content-Type'] || res.respInfo?.headers?.['content-type'] || 'application/octet-stream';
  const finalName = withExtension(filename, mime);

  if (Platform.OS === 'android') {
    const allowed = await requestLegacyStoragePermission();
    if (!allowed) {
      throw new Error('Storage permission is required to save this file to Downloads.');
    }

    // Write to the app's private cache first (always writable, no
    // permission needed), then hand that file to the MediaStore Downloads
    // collection so it actually shows up in the device's Files/Downloads app.
    const tempPath = `${RNBlobUtil.fs.dirs.CacheDir}/${finalName}`;
    await RNBlobUtil.fs.writeFile(tempPath, res.base64(), 'base64');
    const mediaUri = await RNBlobUtil.MediaCollection.copyToMediaStore(
      { name: finalName, parentFolder: '', mimeType: mime },
      'Download',
      tempPath
    );

    // Registers the already-saved file with the system Download Manager so
    // a "Download complete" notification appears in the status bar, tapping
    // it opens the file — same as any normal Android download.
    await RNBlobUtil.android.addCompleteDownload({
      title: finalName,
      description: 'Downloaded from NRI Circle',
      mime,
      path: tempPath,
      showNotification: true,
    }).catch(() => {});

    return mediaUri;
  }

  // iOS has no shared "Downloads" folder — save to the app's Documents
  // directory (visible in the Files app) and let the user pick where to
  // keep it via the native share/options sheet.
  const path = `${RNBlobUtil.fs.dirs.DocumentDir}/${finalName}`;
  await RNBlobUtil.fs.writeFile(path, res.base64(), 'base64');
  RNBlobUtil.ios.presentOptionsMenu(path);
  return path;
}
