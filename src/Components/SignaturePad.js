import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// Matches the signature box's own background (#F8FAFC, same as the app's
// standard input fill) so the WebView's canvas blends into its parent box
// instead of showing as a mismatched white rectangle — relying on true
// WebView transparency is flaky on Android, so this fakes it with a solid
// matching color instead.
const BG = '#F8FAFC';

// No native canvas/SVG lib in this app, so the cursive signature is rendered
// inside a WebView's <canvas> and reported back as a base64 PNG data URL —
// this is a visual signature only (no legal-font requirement per the
// checkout API), matching what the web checkout does.
const SIGNATURE_HTML = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<style>
  html,body{margin:0;padding:0;width:100%;height:100%;background:${BG};overflow:hidden;}
  canvas{display:block;width:100%;height:100%;}
</style></head>
<body>
<canvas id="c" width="900" height="310"></canvas>
<script>
function draw(name) {
  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!name) { window.ReactNativeWebView.postMessage(''); return; }
  ctx.fillStyle = '#1E293B';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  var fontSize = 100;
  ctx.font = fontSize + 'px cursive';
  while (ctx.measureText(name).width > canvas.width - 60 && fontSize > 30) {
    fontSize -= 2;
    ctx.font = fontSize + 'px cursive';
  }
  ctx.fillText(name, canvas.width / 2, canvas.height / 2);
  window.ReactNativeWebView.postMessage(canvas.toDataURL('image/png'));
}
window.draw = draw;
true;
</script>
</body></html>`;

// Renders `name` live in a cursive font as the user types and reports the
// rendered PNG back via onChange(dataUrl) — dataUrl is '' while there's
// nothing to sign yet. Unstyled (fills its parent) — the caller supplies the
// box/border/label around it.
export default function SignaturePad({ name, onChange }) {
  const webviewRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      webviewRef.current?.injectJavaScript(`draw(${JSON.stringify(name || '')}); true;`);
    }, 200);
    return () => clearTimeout(timer);
  }, [name, ready]);

  const trimmed = (name || '').trim();

  return (
    <View style={styles.wrap}>
      {!trimmed && <Text style={styles.placeholder}>Your signature</Text>}
      <WebView
        ref={webviewRef}
        originWhitelist={['*']}
        source={{ html: SIGNATURE_HTML }}
        onLoadEnd={() => setReady(true)}
        onMessage={(e) => onChange(e.nativeEvent.data || '')}
        scrollEnabled={false}
        style={styles.webview}
        containerStyle={styles.webview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, height: '100%' },
  placeholder: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, textAlign: 'center', textAlignVertical: 'center', fontSize: 13, color: '#94A3B8', zIndex: 1 },
  webview: { flex: 1, backgroundColor: BG },
});
