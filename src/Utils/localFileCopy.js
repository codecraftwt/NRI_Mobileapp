import { keepLocalCopy } from '@react-native-documents/picker';

// @react-native-documents/picker v12 removed the old `copyTo` pick() option and
// the `fileCopyUri` result field. On Android, pick() now hands back a raw
// content:// SAF uri (e.g. content://com.android.providers.media.documents/...).
// RN's Android multipart uploader can't reliably stream those — the request
// body stalls until the socket is dropped, which surfaces as a ~15s
// ERR_NETWORK "Network Error" on the upload (createTicket, uploadDocument, ...).
//
// keepLocalCopy() copies each picked file into the app's cache and returns a
// real file:// path that uploads cleanly. Pass the raw pick() results; this
// returns the same objects with `uri` pointing at the local copy (falling back
// to the original uri if a particular copy fails, so a partial failure can't
// silently drop a file).
export async function resolveLocalCopies(files) {
  const list = (files || []).filter(Boolean);
  if (list.length === 0) return [];
  const copies = await keepLocalCopy({
    files: list.map(f => ({ uri: f.uri, fileName: f.name })),
    destination: 'cachesDirectory',
  });
  return list.map((f, i) => {
    const copy = copies[i];
    return { ...f, uri: copy && copy.status === 'success' ? copy.localUri : f.uri };
  });
}
