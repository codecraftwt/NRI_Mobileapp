import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

// Upcoming renewals within the next 45 days. Replace with live data when wired.
const UPCOMING = [];
// Memberships that lapsed in the last 30 days — win-back candidates.
const EXPIRED = [];

// Day-bucket summary cards (match the web renewals dashboard).
const BUCKETS = [
  { key: 'within7', label: 'Within 7 Days', color: '#DC2626', border: '#FCA5A5', max: 7 },
  { key: 'd8_15', label: '8–15 Days', color: '#CA8A04', border: '#FCD34D', min: 8, max: 15 },
  { key: 'd16_45', label: '16–45 Days', color: '#0F172A', border: '#E2E8F0', min: 16, max: 45 },
];

function countBucket(b) {
  return UPCOMING.filter(r => {
    const d = r.daysLeft;
    if (b.min != null && d < b.min) return false;
    if (b.max != null && d > b.max) return false;
    return true;
  }).length;
}

// Colour the days-left pill by urgency.
function daysLeftStyle(d) {
  if (d <= 7) return { bg: '#FEE2E2', color: '#DC2626' };
  if (d <= 15) return { bg: '#FEF3C7', color: '#CA8A04' };
  return { bg: '#D1FAE5', color: '#059669' };
}

const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#DB2777', '#EA580C', '#0891B2', '#059669'];
function avatarColor(name = '') {
  let sum = 0;
  for (let i = 0; i < name.length; i++) sum += name.charCodeAt(i);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function EmptyCard({ icon, text }) {
  return (
    <View style={styles.emptyCard}>
      <Icon name={icon} size={30} color="#CBD5E1" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function Renewals({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Renewals</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Day-bucket summary */}
        <View style={styles.bucketRow}>
          {BUCKETS.map(b => (
            <View key={b.key} style={[styles.bucketCard, { borderColor: b.border }]}>
              <Text style={styles.bucketValue} numberOfLines={1}>
                <Text style={{ color: b.color }}>{countBucket(b)}</Text>
              </Text>
              <Text style={styles.bucketLabel}>{b.label}</Text>
            </View>
          ))}
        </View>

        {/* Upcoming Renewals */}
        <Text style={styles.sectionTitle}>Upcoming Renewals (next 45 days)</Text>
        {UPCOMING.length === 0 ? (
          <EmptyCard icon="event-available" text="No renewals due in the next 45 days." />
        ) : (
          <View style={styles.cardBlock}>
            {UPCOMING.map((r, i) => {
              const dl = daysLeftStyle(r.daysLeft);
              return (
                <View key={r.id ?? i} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={[styles.avatar, { backgroundColor: avatarColor(r.customer) }]}>
                      <Text style={styles.avatarText}>{(r.customer || 'C').charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name} numberOfLines={1}>{r.customer}</Text>
                      <Text style={styles.plan} numberOfLines={1}>{r.plan}</Text>
                    </View>
                    <View style={[styles.daysPill, { backgroundColor: dl.bg }]}>
                      <Text style={[styles.daysPillText, { color: dl.color }]}>{r.daysLeft}d left</Text>
                    </View>
                  </View>
                  <View style={styles.divider} />
                  <View style={styles.metaRow}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Expires</Text>
                      <Text style={styles.metaValue}>{r.expires || '—'}</Text>
                    </View>
                    <View style={[styles.metaItem, styles.metaItemRight]}>
                      <Text style={styles.metaLabel}>Last Paid</Text>
                      <Text style={styles.metaValue}>{r.lastPaid || '—'}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Recently Expired */}
        <Text style={[styles.sectionTitle, styles.sectionTitleDanger]}>Recently Expired (last 30 days)</Text>
        <Text style={styles.sectionSub}>Win-back candidates</Text>
        {EXPIRED.length === 0 ? (
          <EmptyCard icon="history" text="Nothing expired recently." />
        ) : (
          <View style={styles.cardBlock}>
            {EXPIRED.map((r, i) => (
              <View key={r.id ?? i} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={[styles.avatar, { backgroundColor: '#FEE2E2' }]}>
                    <Icon name="person-off" size={20} color="#DC2626" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{r.customer}</Text>
                    <Text style={styles.plan} numberOfLines={1}>{r.plan}</Text>
                  </View>
                  <View style={styles.expiredWrap}>
                    <Text style={styles.expiredLabel}>Expired</Text>
                    <Text style={styles.expiredDate}>{r.expiredOn || '—'}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { marginLeft: 6 },
  headerTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 60 },

  // Buckets
  bucketRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  bucketCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 6, alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  bucketValue: { fontSize: 24, fontFamily: typography.h2.fontFamily, fontWeight: '800' },
  bucketLabel: { fontSize: 11, color: '#64748B', textAlign: 'center', marginTop: 4 },

  // Sections
  sectionTitle: { fontSize: 16, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A', marginBottom: 12, marginTop: 6 },
  sectionTitleDanger: { color: '#DC2626', marginTop: 26, marginBottom: 2 },
  sectionSub: { fontSize: 12, color: '#94A3B8', marginBottom: 12 },

  cardBlock: { gap: 12 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontFamily: typography.h2.fontFamily },
  name: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  plan: { fontSize: 12, color: '#64748B', marginTop: 2 },
  daysPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  daysPillText: { fontSize: 11, fontWeight: '800' },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 12 },
  metaRow: { flexDirection: 'row' },
  metaItem: { flex: 1 },
  metaItemRight: { alignItems: 'flex-end' },
  metaLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 },
  metaValue: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 3 },

  expiredWrap: { alignItems: 'flex-end' },
  expiredLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 },
  expiredDate: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#DC2626', marginTop: 3 },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, paddingVertical: 32, alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center' },
});

export default Renewals;
