import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getLegalDocuments } from '../Api/legalApi';

function wrapHtml(contentHtml) {
  return `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>
    body{margin:0;padding:16px 18px 28px;font-family:-apple-system,Roboto,sans-serif;color:#334155;font-size:14px;line-height:1.6;}
    h1{font-size:19px;margin:0 0 4px;color:#0F172A;}
    h2{font-size:15px;margin:18px 0 8px;color:#0F172A;}
    p{margin:0 0 12px;}
    ul{margin:0 0 12px;padding-left:20px;}
    li{margin-bottom:4px;}
    a{color:#2563EB;}
    strong{font-weight:700;color:#1E293B;}
  </style></head><body>${contentHtml || ''}</body></html>`;
}

function isPrivacyDoc(doc) {
  const key = `${doc?.document || ''} ${doc?.title || ''}`.toLowerCase();
  return key.includes('privacy');
}

// Fetches GET /legal (public) once per mount and shows either document in a
// tabbed sheet — opened from the "Terms & Conditions" / "Privacy Policy"
// links next to the payment-page agreement checkbox.
export default function TermsPrivacyModal({ visible, initialTab = 'terms', onClose, onAgree }) {
  const [tab, setTab] = useState(initialTab);
  const [docs, setDocs] = useState(null); // { terms, privacy }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) setTab(initialTab);
  }, [visible, initialTab]);

  useEffect(() => {
    if (!visible || docs || loading) return;
    setLoading(true);
    setError(null);
    getLegalDocuments()
      .then((list) => {
        const privacy = list.find(isPrivacyDoc) || list[1] || null;
        const terms = list.find(d => d !== privacy) || list[0] || null;
        setDocs({ terms, privacy });
      })
      .catch((err) => setError(err?.message || 'Could not load this document.'))
      .finally(() => setLoading(false));
  }, [visible, docs, loading]);

  const active = tab === 'terms' ? docs?.terms : docs?.privacy;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {active?.title || (tab === 'terms' ? 'Terms & Conditions' : 'Privacy Policy')}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.tabsRow}>
            <TouchableOpacity style={[styles.tab, tab === 'terms' && styles.tabActive]} onPress={() => setTab('terms')}>
              <Text style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}>Terms & Conditions</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tab, tab === 'privacy' && styles.tabActive]} onPress={() => setTab('privacy')}>
              <Text style={[styles.tabText, tab === 'privacy' && styles.tabTextActive]}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            {loading ? (
              <View style={styles.centerBox}>
                <ActivityIndicator size="small" color="#20304C" />
              </View>
            ) : error ? (
              <View style={styles.centerBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              <WebView
                key={tab}
                originWhitelist={['*']}
                source={{ html: wrapHtml(active?.contentHtml) }}
                style={styles.webview}
              />
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.agreeBtn} onPress={() => { onAgree?.(); onClose(); }}>
              <Icon name="check-circle" size={16} color="#fff" />
              <Text style={styles.agreeBtnText}>I Agree</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#fff', borderRadius: 18, maxHeight: '82%', overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: 'Montserrat-Bold', color: '#0F172A', marginRight: 12 },
  tabsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  tab: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: 'center', backgroundColor: '#F1F5F9' },
  tabActive: { backgroundColor: '#DCE7FF' },
  tabText: { fontSize: 12.5, fontFamily: 'Montserrat-SemiBold', color: '#64748B' },
  tabTextActive: { color: '#1D4ED8' },
  body: { minHeight: 320, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  webview: { flex: 1, backgroundColor: '#fff' },
  centerBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontSize: 13, color: '#EF4444', textAlign: 'center' },
  footer: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  closeBtn: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: '#334155' },
  agreeBtn: { flex: 1, height: 44, borderRadius: 10, backgroundColor: '#2563EB', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  agreeBtnText: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: '#fff' },
});
