import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const DESCRIPTION = 'Not on the list? Describe what you need and our team will review it and quote a price. '
  + 'A small request fee may apply to open your request — the price for the actual work is agreed separately.';

// Promo card offering the "not on the list? get a custom quote" path —
// mirrors the web catalog's "Need Something Custom?" banner. The card face
// carries the short pitch + fee note; the info button behind it opens the
// fuller explainer without crowding the card. Its own component so the
// copy/CTA can be tweaked without touching the Services screen that hosts it.
export default function CustomQuoteCard({ onPress }) {
  const [infoVisible, setInfoVisible] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.dot1} />
      <View style={styles.dot2} />
      <View style={styles.dot3} />

      <TouchableOpacity
        style={styles.infoBtn}
        activeOpacity={0.7}
        onPress={() => setInfoVisible(true)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="info-outline" size={18} color="#C7D2EA" />
      </TouchableOpacity>

      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <Icon name="auto-awesome" size={22} color="#FDBA74" />
        </View>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>Need something{'\n'}custom?</Text>
          <Text style={styles.subtitle}>Tell us — we'll quote it</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <TouchableOpacity style={styles.cta} activeOpacity={0.85} onPress={onPress}>
          <Text style={styles.ctaText}>Request a quote</Text>
          <Icon name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <Modal visible={infoVisible} transparent animationType="fade" onRequestClose={() => setInfoVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setInfoVisible(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.modalIconWrap}>
              <Icon name="auto-awesome" size={26} color="#D94625" />
            </View>
            <Text style={styles.modalTitle}>Need Something Custom?</Text>
            <Text style={styles.modalDesc}>{DESCRIPTION}</Text>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              activeOpacity={0.9}
              onPress={() => setInfoVisible(false)}
            >
              <Text style={styles.modalCloseText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#16234E', borderRadius: 20, padding: 14, marginBottom: 16, overflow: 'hidden' },

  dot1: { position: 'absolute', top: 14, right: 60, width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FDBA74' },
  dot2: { position: 'absolute', top: 28, right: 84, width: 4, height: 4, borderRadius: 2, backgroundColor: 'rgba(253,186,116,0.6)' },
  dot3: { position: 'absolute', top: 44, right: 50, width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(253,186,116,0.5)' },

  infoBtn: {
    position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'center', alignItems: 'center',
  },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 36, marginBottom: 12 },
  iconWrap: {
    width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  titleWrap: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, fontFamily: 'Montserrat-Bold', color: '#FFFFFF' },
  subtitle: { fontSize: 11, fontFamily: 'Montserrat-Bold', color: '#FDBA74' },

  desc: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 19, marginBottom: 18 },

  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' },
  feePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 999, paddingHorizontal: 12, height: 34,
  },
  feePillText: { color: '#E2E8F0', fontSize: 12, fontFamily: 'Montserrat-Bold' },
  cta: {
    flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0, alignSelf: 'flex-start',
    backgroundColor: '#D94625', borderRadius: 999, paddingHorizontal: 16, height: 38,
    shadowColor: '#D94625', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4,
  },
  ctaText: { color: '#FFFFFF', fontFamily: 'Montserrat-Bold', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalSheet: { width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', gap: 8 },
  modalIconWrap: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF1E8',
    justifyContent: 'center', alignItems: 'center', marginBottom: 4,
  },
  modalTitle: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#0F172A' },
  modalDesc: { fontSize: 13.5, color: '#64748B', lineHeight: 20, textAlign: 'center' },
  modalCloseBtn: {
    backgroundColor: '#D94625', borderRadius: 16, paddingHorizontal: 32, paddingVertical: 12, marginTop: 10,
  },
  modalCloseText: { color: '#FFFFFF', fontFamily: 'Montserrat-Bold', fontSize: 14 },
});
