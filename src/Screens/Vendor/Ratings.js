import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useVendorRatings } from '../../Hooks/useVendorRatings';

// Colour-code the composite score so strong/weak jobs read at a glance.
function scoreStyle(value) {
  const n = Number(value);
  if (n >= 4) return { bg: '#DCFCE7', text: '#059669', accent: '#22C55E' };
  if (n >= 3) return { bg: '#FEF3C7', text: '#B45309', accent: '#F59E0B' };
  if (n > 0) return { bg: '#FEE2E2', text: '#DC2626', accent: '#EF4444' };
  return { bg: '#F1F5F9', text: '#64748B', accent: '#CBD5E1' };
}

function fmtScore(v) {
  if (v == null || v === '') return '—';
  const n = Number(v);
  return isNaN(n) ? String(v) : n.toFixed(2);
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Stars({ value, size = 18 }) {
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <Icon key={n} name={n <= value ? 'star' : 'star-border'} size={size} color="#F5B301" />
      ))}
    </View>
  );
}

function Ratings({ navigation }) {
  const [page, setPage] = useState(1);
  const { summary, ratings, meta, loading, failed, retry, fetchPage } = useVendorRatings(page);

  const goToPage = (p) => {
    setPage(p);
    fetchPage(p);
  };

  const totalPages = meta.lastPage || 1;
  const start = (meta.currentPage - 1) * meta.perPage;

  const summaryCards = [
    { id: 'score', label: 'Overall Score', value: fmtScore(summary?.overallScore), icon: 'star', bg: '#FEECD9', color: '#F97316' },
    { id: 'rated', label: 'Rated Jobs', value: String(summary?.ratedJobs ?? meta.total ?? 0), icon: 'reviews', bg: '#EEF0FF', color: '#6366F1' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Ratings</Text>
          {/* <Text style={styles.headerSub}>Your performance & customer feedback</Text> */}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Summary Stat Grid */}
        <View style={styles.statGrid}>
          {summaryCards.map(item => (
            <View key={item.id} style={styles.statCard}>
              <View style={[styles.statIconBg, { backgroundColor: item.bg }]}>
                <Icon name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.statLabel}>{item.label}</Text>
              <Text style={styles.statValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Rated Jobs List */}
        <Text style={styles.sectionTitle}>Rated Jobs</Text>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator size="small" color="#D94625" />
            <Text style={styles.stateText}>Loading ratings...</Text>
          </View>
        ) : failed ? (
          <TouchableOpacity style={styles.stateBox} onPress={retry} activeOpacity={0.7}>
            <Icon name="refresh" size={26} color="#DC2626" />
            <Text style={[styles.stateText, { color: '#DC2626' }]}>Couldn't load ratings. Tap to retry.</Text>
          </TouchableOpacity>
        ) : ratings.length === 0 ? (
          <View style={styles.stateBox}>
            <Icon name="star-border" size={28} color="#CBD5E1" />
            <Text style={styles.stateText}>No rated jobs yet.</Text>
          </View>
        ) : (
          <>
            {ratings.map((r, index) => {
              const sc = scoreStyle(r.composite);
              return (
                <View key={r.id ?? index} style={[styles.ratingCard, { borderLeftColor: sc.accent }]}>
                  <View style={styles.ratingCardTop}>
                    <View style={styles.jobWrap}>
                      <View style={styles.indexBadge}><Text style={styles.indexText}>{start + index + 1}</Text></View>
                      <View>
                        <Text style={styles.jobText}>{r.ticket}</Text>
                        <Text style={styles.dateText}>{formatDate(r.date)}</Text>
                      </View>
                    </View>
                    <View style={[styles.scorePill, { backgroundColor: sc.bg }]}>
                      <Icon name="star" size={13} color={sc.text} />
                      <Text style={[styles.scorePillText, { color: sc.text }]}>{r.composite}</Text>
                    </View>
                  </View>

                  <Text style={styles.serviceText} numberOfLines={2}>{r.service}</Text>

                  <View style={styles.starsWrap}>
                    <Stars value={r.rating} />
                    <Text style={styles.ratingOutOf}>{r.rating}.0 / 5</Text>
                  </View>

                  {!!r.feedback && (
                    <View style={styles.feedbackBox}>
                      <Icon name="format-quote" size={16} color="#94A3B8" />
                      <Text style={styles.feedbackText}>{r.feedback}</Text>
                    </View>
                  )}
                </View>
              );
            })}

            {/* Pagination */}
            <View style={styles.paginationCard}>
              <Text style={styles.entriesText}>
                Showing {start + 1} to {start + ratings.length} of {meta.total} entries
              </Text>
              {totalPages > 1 && (
                <View style={styles.pager}>
                  <TouchableOpacity
                    style={[styles.pagerBtn, meta.currentPage <= 1 && styles.pagerBtnDisabled]}
                    onPress={() => goToPage(meta.currentPage - 1)}
                    disabled={meta.currentPage <= 1}
                  >
                    <Icon name="chevron-left" size={18} color={meta.currentPage <= 1 ? '#CBD5E1' : '#64748B'} />
                  </TouchableOpacity>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.pageNum, p === meta.currentPage && styles.pageNumActive]}
                      onPress={() => goToPage(p)}
                    >
                      <Text style={[styles.pageNumText, p === meta.currentPage && styles.pageNumTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[styles.pagerBtn, meta.currentPage >= totalPages && styles.pagerBtnDisabled]}
                    onPress={() => goToPage(meta.currentPage + 1)}
                    disabled={meta.currentPage >= totalPages}
                  >
                    <Icon name="chevron-right" size={18} color={meta.currentPage >= totalPages ? '#CBD5E1' : '#64748B'} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100, gap: 14 },

  sectionTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginTop: 4, marginBottom: -2 },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  statCard: {
    width: '47.5%', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  statIconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statLabel: { fontSize: 12, color: '#64748B' },
  statValue: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginTop: 3 },

  ratingCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9', borderLeftWidth: 4,
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 3,
  },
  ratingCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jobWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  indexBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  indexText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#6366F1' },
  jobText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#1E293B' },
  dateText: { fontSize: 11, color: '#94A3B8', marginTop: 1 },

  scorePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  scorePillText: { fontSize: 13, fontFamily: typography.h2.fontFamily },

  serviceText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginTop: 12, lineHeight: 20 },

  starsWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  starsRow: { flexDirection: 'row', gap: 2 },
  ratingOutOf: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },

  feedbackBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12,
    backgroundColor: '#F8FAFC', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  feedbackText: { fontSize: 13, color: '#475569', fontStyle: 'italic', flex: 1 },

  paginationCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  entriesText: { fontSize: 12, color: '#94A3B8' },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pagerBtn: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  pagerBtnDisabled: { backgroundColor: '#F8FAFC' },
  pageNum: { minWidth: 30, height: 30, borderRadius: 15, paddingHorizontal: 8, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  pageNumActive: { backgroundColor: '#2563EB' },
  pageNumText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  pageNumTextActive: { color: '#FFFFFF' },

  stateBox: { alignItems: 'center', gap: 10, paddingVertical: 40, backgroundColor: '#FFFFFF', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9' },
  stateText: { fontSize: 13, color: '#94A3B8' },
});

export default Ratings;
