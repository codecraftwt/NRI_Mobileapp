import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useRmUpsell } from '../../Hooks/RM/useRmUpsell';

const norm = (s) => String(s || '').toLowerCase();
const label = (s) => norm(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function priorityColor(p) {
  switch (norm(p)) {
    case 'high': case 'critical': return '#16A34A';
    case 'medium': return '#CA8A04';
    case 'low': return '#64748B';
    default: return '#6366F1';
  }
}

const inr = (v) => (v == null ? null : `₹${Number(v).toLocaleString('en-IN')}`);

// A ready-to-use talking point the RM can read to the customer.
function pitchScript(o) {
  const to = o.suggested || 'a higher plan';
  const from = o.current ? ` from ${o.current}` : '';
  const because = o.reason ? ` Based on ${o.reason.toLowerCase()},` : '';
  const worth = o.value != null ? ` It's an estimated ${inr(o.value)} in added cover/value.` : '';
  return `Hi ${o.name},${because} I'd recommend upgrading${from} to ${to}.${worth} Shall I set it up for you?`;
}

function Upsell({ navigation }) {
  const { opportunities, totalValue, loading, refresh } = useRmUpsell();
  const [pitch, setPitch] = useState(null);

  // Prefer the server total; otherwise sum the opportunity values we have.
  const computedTotal = totalValue != null
    ? totalValue
    : opportunities.reduce((sum, o) => sum + (o.value || 0), 0);
  const hasValue = opportunities.some(o => o.value != null) || totalValue != null;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upsell</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && opportunities.length === 0 ? (
          <View style={styles.emptyState}><ActivityIndicator size="large" color="#20304C" /></View>
        ) : (
          <>
            {opportunities.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="trending-up" size={44} color="#CBD5E1" />
                <Text style={styles.emptyText}>No upsell opportunities flagged.</Text>
              </View>
            ) : (
              <>
                {hasValue && (
                  <View style={styles.valueBanner}>
                    <View style={styles.valueBannerGlow} pointerEvents="none" />
                    <View style={styles.valueBannerIcon}><Icon name="trending-up" size={22} color="#FDE68A" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.valueBannerLabel}>Potential Upsell Value</Text>
                      <Text style={styles.valueBannerAmount}>{inr(computedTotal)}</Text>
                    </View>
                    <View style={styles.valueBannerPill}>
                      <Text style={styles.valueBannerPillText}>{opportunities.length} {opportunities.length === 1 ? 'lead' : 'leads'}</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.sectionTitle}>Opportunities</Text>
                <View style={{ gap: 14 }}>
                  {opportunities.map(o => {
                    const pc = priorityColor(o.priority);
                    return (
                      <View key={o.id} style={styles.card}>
                        <View style={styles.cardTop}>
                          <View style={styles.avatar}><Text style={styles.avatarText}>{(o.name || '?').charAt(0).toUpperCase()}</Text></View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.name}>{o.name}</Text>
                            {!!o.reason && <Text style={styles.reason} numberOfLines={2}>{o.reason}</Text>}
                          </View>
                          {!!o.priority && (
                            <View style={[styles.scorePill, { backgroundColor: pc + '15' }]}>
                              <Text style={[styles.scoreText, { color: pc }]}>{label(o.priority)}</Text>
                            </View>
                          )}
                        </View>

                        {(!!o.current || !!o.suggested || o.value != null) && (
                          <View style={styles.upgradeRow}>
                            {!!o.current && <View style={styles.planTag}><Text style={styles.planTagText}>{o.current}</Text></View>}
                            {!!o.current && !!o.suggested && <Icon name="arrow-forward" size={16} color="#94A3B8" />}
                            {!!o.suggested && <View style={[styles.planTag, styles.planTagHighlight]}><Text style={[styles.planTagText, { color: '#D94625' }]}>{o.suggested}</Text></View>}
                            {o.value != null && <Text style={styles.value}>{inr(o.value)}</Text>}
                          </View>
                        )}

                        <TouchableOpacity
                          style={styles.pitchBtn}
                          activeOpacity={0.7}
                          onPress={() => setPitch(o)}
                        >
                          <Icon name="campaign" size={16} color="#20304C" />
                          <Text style={styles.pitchText}>Pitch Upgrade</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Pitch modal */}
      <Modal visible={!!pitch} transparent animationType="slide" onRequestClose={() => setPitch(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Icon name="campaign" size={22} color="#D94625" />
              <Text style={styles.modalTitle}>Upgrade Pitch</Text>
              <TouchableOpacity onPress={() => setPitch(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {!!pitch && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.pitchCustomerRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{(pitch.name || '?').charAt(0).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{pitch.name}</Text>
                    {!!pitch.priority && <Text style={styles.reason}>{label(pitch.priority)} priority</Text>}
                  </View>
                </View>

                {(!!pitch.current || !!pitch.suggested) && (
                  <View style={styles.upgradeRow}>
                    {!!pitch.current && <View style={styles.planTag}><Text style={styles.planTagText}>{pitch.current}</Text></View>}
                    {!!pitch.current && !!pitch.suggested && <Icon name="arrow-forward" size={16} color="#94A3B8" />}
                    {!!pitch.suggested && <View style={[styles.planTag, styles.planTagHighlight]}><Text style={[styles.planTagText, { color: '#D94625' }]}>{pitch.suggested}</Text></View>}
                    {pitch.value != null && <Text style={styles.value}>{inr(pitch.value)}</Text>}
                  </View>
                )}

                {!!pitch.reason && (
                  <View style={styles.pitchBlock}>
                    <Text style={styles.pitchBlockLabel}>Why this fits</Text>
                    <Text style={styles.pitchBlockText}>{pitch.reason}</Text>
                  </View>
                )}

                <View style={[styles.pitchBlock, styles.pitchScriptBlock]}>
                  <Text style={styles.pitchBlockLabel}>Suggested Pitch</Text>
                  <Text style={styles.pitchScriptText}>{pitch.pitch || pitchScript(pitch)}</Text>
                </View>

                {pitch.customerId != null && (
                  <TouchableOpacity
                    style={styles.profileBtn}
                    activeOpacity={0.85}
                    onPress={() => { const p = pitch; setPitch(null); navigation.navigate('CustomerDetail', { customerId: p.customerId, name: p.name }); }}
                  >
                    <Icon name="person" size={16} color="#20304C" />
                    <Text style={styles.profileBtnText}>Open Customer Profile</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { marginLeft: 6 },
  headerTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 20 },

  // Potential-value banner
  valueBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden',
    backgroundColor: '#20304C', borderRadius: 20, padding: 18, marginTop: 4,
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6,
  },
  valueBannerGlow: { position: 'absolute', top: -50, right: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(253,230,138,0.10)' },
  valueBannerIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' },
  valueBannerLabel: { fontSize: 12, color: '#94A3B8' },
  valueBannerAmount: { fontSize: 23, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', marginTop: 2 },
  valueBannerPill: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  valueBannerPillText: { fontSize: 11, fontWeight: '700', color: '#FDE68A' },

  sectionTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A', marginTop: 4, marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 13, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontFamily: typography.h2.fontFamily },
  name: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  reason: { fontSize: 12, color: '#64748B', marginTop: 2 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  scoreText: { fontSize: 11, fontWeight: '700' },

  upgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap', backgroundColor: '#F8FAFC', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#F1F5F9' },
  planTag: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  planTagHighlight: { backgroundColor: '#FFF3EE', borderColor: '#FDE4D8' },
  planTagText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  value: { marginLeft: 'auto', fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#16A34A' },

  pitchBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2F7', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, marginTop: 10 },
  pitchText: { fontSize: 13, fontWeight: '700', color: '#20304C', letterSpacing: 0.2 },

  emptyState: { paddingVertical: 70, alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 15, color: '#94A3B8' },

  // Pitch modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { flex: 1, fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  pitchCustomerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  pitchBlock: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#F1F5F9' },
  pitchScriptBlock: { backgroundColor: '#FFF3EE', borderColor: '#FDE4D8' },
  pitchBlockLabel: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  pitchBlockText: { fontSize: 14, color: '#334155', lineHeight: 20 },
  pitchScriptText: { fontSize: 14, color: '#7C2D12', lineHeight: 21, fontFamily: typography.labelMedium.fontFamily },
  profileBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 13, marginTop: 18 },
  profileBtnText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#20304C' },
});

export default Upsell;
