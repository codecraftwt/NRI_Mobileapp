import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useVendorSupport } from '../../Hooks/Vendor/useVendorSupport';

function getStatusPill(status) {
  switch (String(status || '').toLowerCase()) {
    case 'resolved': return { bg: '#D1FAE5', text: '#059669' };
    case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#FFEDD5', text: '#C2410C' }; // pending / in review
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Disputes({ navigation }) {
  const [page, setPage] = useState(1);
  const { disputes, meta, loading, failed, retry, fetchPage } = useVendorSupport(page);

  const goToPage = (p) => {
    setPage(p);
    fetchPage(p);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>My Disputes</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#D94625" />
            <Text style={styles.emptyText}>Loading disputes...</Text>
          </View>
        ) : failed ? (
          <TouchableOpacity style={styles.emptyState} onPress={retry} activeOpacity={0.7}>
            <Icon name="refresh" size={40} color="#DC2626" />
            <Text style={[styles.emptyText, { color: '#DC2626' }]}>Couldn't load disputes. Tap to retry.</Text>
          </TouchableOpacity>
        ) : disputes.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="inbox" size={48} color="#CBD5E1" />
            <Text style={styles.emptyText}>No disputes raised yet.</Text>
          </View>
        ) : (
          <>
            {disputes.map((d, index) => {
              const pill = getStatusPill(d.status);
              return (
                <View key={d.id ?? index} style={styles.disputeCard}>
                  <View style={styles.disputeTop}>
                    <View style={styles.jobWrap}>
                      <View style={styles.indexBadge}><Text style={styles.indexText}>{index + 1}</Text></View>
                      <Text style={styles.jobText}>{d.job}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                      <Text style={[styles.statusPillText, { color: pill.text }]}>{d.statusLabel}</Text>
                    </View>
                  </View>

                  <Text style={styles.issueText}>{d.issue}</Text>

                  <View style={styles.metaGrid}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Amount</Text>
                      <Text style={styles.metaValue}>{d.amount != null ? `₹${d.amount.toFixed(2)}` : '—'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Resolution</Text>
                      <Text style={styles.metaValue}>{d.resolution || '—'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Raised</Text>
                      <Text style={styles.metaValue}>{formatDate(d.raisedAt)}</Text>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={styles.paginationRow}>
              <Text style={styles.entriesText}>
                {meta.total} {meta.total === 1 ? 'entry' : 'entries'}
              </Text>
              {meta.lastPage > 1 && (
                <View style={styles.pager}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                    onPress={() => goToPage(page - 1)}
                    disabled={page <= 1}
                  >
                    <Icon name="chevron-left" size={20} color={page <= 1 ? '#CBD5E1' : '#2563EB'} />
                  </TouchableOpacity>
                  <Text style={styles.pageIndicator}>{meta.currentPage} / {meta.lastPage}</Text>
                  <TouchableOpacity
                    style={[styles.pageBtn, page >= meta.lastPage && styles.pageBtnDisabled]}
                    onPress={() => goToPage(page + 1)}
                    disabled={page >= meta.lastPage}
                  >
                    <Icon name="chevron-right" size={20} color={page >= meta.lastPage ? '#CBD5E1' : '#2563EB'} />
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

  headerContainer: {
    backgroundColor: '#20304C',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10, elevation: 4,
  },
  headerBackBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', flex: 1, textAlign: 'center' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40, gap: 14 },

  disputeCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  disputeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jobWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  indexBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  indexText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  jobText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#1E293B', flex: 1 },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily },

  issueText: { fontSize: 14, color: '#334155', marginTop: 10, lineHeight: 20 },

  metaGrid: { flexDirection: 'row', marginTop: 12, gap: 12 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 3 },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 4 },
  entriesText: { fontSize: 12, color: '#94A3B8' },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center' },
  pageBtnDisabled: { borderColor: '#E2E8F0' },
  pageIndicator: { fontSize: 13, color: '#64748B' },

  emptyState: { alignItems: 'center', gap: 12, paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#94A3B8' },
});

export default Disputes;
