import React from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme/typography';
import { useVendorProfile, useVendorRates } from '../../Hooks/useVendorProfile';

const formatRate = (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`);
const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function reqStatusColors(status) {
  switch ((status || '').toLowerCase()) {
    case 'approved':
    case 'accepted': return { bg: '#DCFCE7', text: '#16A34A' };
    case 'rejected':
    case 'declined': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#FEF3C7', text: '#D97706' }; // pending / in review
  }
}

function ServiceOffered({ navigation }) {
  const { profile, loading } = useVendorProfile();
  const { rates, loading: loadingRates } = useVendorRates();

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Services Offered" showBack />
        <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
      </View>
    );
  }

  const serviceRates = rates?.serviceRates || [];
  const changeRequests = rates?.rateChangeRequests || [];

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Services Offered" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Rates (read-only, admin set) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Your Rates</Text>
            <View style={styles.lockRow}>
              <Icon name="lock" size={12} color="#94A3B8" />
              <Text style={styles.lockText}>Admin set</Text>
            </View>
          </View>

          {loadingRates ? (
            <ActivityIndicator size="small" color="#D94625" style={{ marginVertical: 20 }} />
          ) : serviceRates.length === 0 ? (
            <Text style={styles.emptyText}>No rates set yet.</Text>
          ) : (
            serviceRates.map((r, i) => (
              <View key={r.id ?? i} style={[styles.rateRow, i < serviceRates.length - 1 && styles.rowBorder]}>
                <View style={{ flex: 1, paddingRight: 16 }}>
                  <Text style={styles.rateService} numberOfLines={2}>{r.service?.name || '—'}</Text>
                  {!![r.city?.name, r.state?.name].filter(Boolean).length && (
                    <Text style={styles.rateLoc}>{[r.city?.name, r.state?.name].filter(Boolean).join(', ')}</Text>
                  )}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.ratePrice}>{formatRate(r.rate)}</Text>
                  {r.recurringRate != null && <Text style={styles.rateRecurring}>{formatRate(r.recurringRate)}/mo</Text>}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Rate change requests (read-only status) */}
        {changeRequests.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rate Change Requests</Text>
            {changeRequests.map((req, i) => {
              const sc = reqStatusColors(req.status);
              return (
                <View key={req.id ?? i} style={[styles.reqRow, i < changeRequests.length - 1 && styles.rowBorder]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.reqMsg} numberOfLines={2}>{req.message || 'Rate change request'}</Text>
                    {!!req.adminNotes && <Text style={styles.reqNotes}>{req.adminNotes}</Text>}
                  </View>
                  <View style={[styles.reqStatusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.reqStatusText, { color: sc.text }]}>{titleCase(req.status)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footerNote}>Rate-change requests are handled on the web. Contact your admin.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16, gap: 16 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockText: { fontSize: 11, color: '#94A3B8' },

  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 20 },

  rateRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  rateService: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', lineHeight: 20 },
  rateLoc: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  ratePrice: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  rateRecurring: { fontSize: 12, color: '#64748B', marginTop: 3 },

  reqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  reqMsg: { fontSize: 13, color: '#334155', lineHeight: 18 },
  reqNotes: { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  reqStatusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  reqStatusText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },

  footerNote: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 17, paddingHorizontal: 8 },
});

export default ServiceOffered;
