import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useSupportTickets } from '../../Hooks/useSupportTickets';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

function getStatusPill(statusLabel) {
  switch ((statusLabel || '').toLowerCase()) {
    case 'resolved':
    case 'closed': return { bg: '#D1FAE5', text: '#059669' };
    case 'escalated': return { bg: '#FEE2E2', text: '#DC2626' };
    case 'pending': return { bg: '#FEF3C7', text: '#B45309' };
    default: return { bg: '#DBEAFE', text: '#1D4ED8' };
  }
}

// Leading avatar + chip styling per "Raise Ticket to" category.
function getCategoryMeta(category) {
  switch ((category || '').toLowerCase()) {
    case 'custom_plan': return { icon: 'tune', color: '#15803D', bg: '#DCFCE7' };
    case 'vendor': return { icon: 'store', color: '#B45309', bg: '#FEF3C7' };
    case 'telecaller': return { icon: 'headset-mic', color: '#7C3AED', bg: '#EDE9FE' };
    case 'rm': return { icon: 'person', color: '#0369A1', bg: '#E0F2FE' };
    default: return { icon: 'support-agent', color: '#1D4ED8', bg: '#DBEAFE' };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Windowed page list with ellipses, e.g. [1, '…', 4, 5, 6, '…', 12].
function buildPages(current, last) {
  if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
  const range = [];
  for (let i = Math.max(1, current - 1); i <= Math.min(last, current + 1); i++) range.push(i);
  if (range[0] > 1) {
    if (range[0] > 2) range.unshift('…');
    range.unshift(1);
  }
  if (range[range.length - 1] < last) {
    if (range[range.length - 1] < last - 1) range.push('…');
    range.push(last);
  }
  return range;
}

function GeneralSupport({ navigation }) {
  const { tickets, meta, loading, failed, retry, fetchPage } = useSupportTickets();
  const [refreshing, setRefreshing] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const rangeStart = tickets.length ? (meta.currentPage - 1) * meta.perPage + 1 : 0;
  const rangeEnd = tickets.length ? rangeStart + tickets.length - 1 : 0;
  const pages = buildPages(meta.currentPage, meta.lastPage);

  const goTo = (p) => {
    if (p < 1 || p > meta.lastPage || p === meta.currentPage || loading) return;
    fetchPage(p);
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="General Support" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />}
      >
        <View style={styles.infoRow}>
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => setInfoOpen(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="info-outline" size={18} color="#D94625" />
            <Text style={styles.infoBtnText}>What's General Support for?</Text>
          </TouchableOpacity>
        </View>

        {/* Primary action */}
        <TouchableOpacity style={styles.newTicketBtn} activeOpacity={0.9} onPress={() => navigation.navigate('NewSupportTicket')}>
          <Icon name="add-circle" size={18} color="#FFFFFF" />
          <Text style={styles.newTicketBtnText}>New Support Ticket</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.cardHeaderTitle}>All Tickets</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{meta.total}</Text>
          </View>
        </View>

        {loading && !tickets.length && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.loadingText}>Loading tickets...</Text>
          </View>
        )}

        {failed && (
          <TouchableOpacity style={styles.stateCard} onPress={retry}>
            <Icon name="error-outline" size={22} color="#EF4444" />
            <Text style={styles.retryText}>Couldn't load tickets. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {!loading && !failed && tickets.length === 0 && (
          <View style={styles.stateCard}>
            <View style={styles.emptyIconCircle}>
              <Icon name="support-agent" size={34} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No support tickets yet</Text>
            <Text style={styles.emptyText}>Raise a new ticket for any general question.</Text>
          </View>
        )}

        {tickets.map((ticket) => {
          const pill = getStatusPill(ticket.statusLabel);
          const cat = getCategoryMeta(ticket.category);
          return (
            <TouchableOpacity
              key={ticket.id}
              style={styles.ticketCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('SupportTicketChat', { ticketId: ticket.id })}
            >
              <View style={[styles.rowIcon, { backgroundColor: cat.bg }]}>
                <Icon name={cat.icon} size={20} color={cat.color} />
              </View>

              <View style={styles.rowMain}>
                <View style={styles.rowTop}>
                  <Text style={styles.ticketNumber} numberOfLines={1}>{ticket.ticketNumber}</Text>
                  <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.statusPillText, { color: pill.text }]}>{ticket.statusLabel}</Text>
                  </View>
                </View>
                <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                <View style={styles.metaRow}>
                  <Icon name="schedule" size={13} color="#94A3B8" />
                  <Text style={styles.ticketDate}>{formatDate(ticket.createdAt)}</Text>
                  {!!ticket.categoryLabel && (
                    <View style={[styles.catChip, { backgroundColor: cat.bg }]}>
                      <Text style={[styles.catChipText, { color: cat.color }]}>{ticket.categoryLabel}</Text>
                    </View>
                  )}
                </View>
              </View>

              <Icon name="chevron-right" size={22} color="#CBD5E1" />
            </TouchableOpacity>
          );
        })}

        {tickets.length > 0 && (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Showing {rangeStart}–{rangeEnd} of {meta.total} entries</Text>
            {meta.lastPage > 1 && (
              <View style={styles.pagerRow}>
                <TouchableOpacity
                  style={[styles.pagerArrow, meta.currentPage <= 1 && styles.pagerDisabled]}
                  disabled={meta.currentPage <= 1}
                  onPress={() => goTo(meta.currentPage - 1)}
                >
                  <Icon name="chevron-left" size={20} color={meta.currentPage <= 1 ? '#CBD5E1' : '#334155'} />
                </TouchableOpacity>

                {pages.map((p, i) => (
                  p === '…' ? (
                    <View key={`e${i}`} style={styles.pagerEllipsis}><Text style={styles.pagerEllipsisText}>…</Text></View>
                  ) : (
                    <TouchableOpacity
                      key={p}
                      style={[styles.pagerNum, p === meta.currentPage && styles.pagerNumActive]}
                      disabled={p === meta.currentPage}
                      onPress={() => goTo(p)}
                    >
                      <Text style={[styles.pagerNumText, p === meta.currentPage && styles.pagerNumTextActive]}>{p}</Text>
                    </TouchableOpacity>
                  )
                ))}

                <TouchableOpacity
                  style={[styles.pagerArrow, meta.currentPage >= meta.lastPage && styles.pagerDisabled]}
                  disabled={meta.currentPage >= meta.lastPage}
                  onPress={() => goTo(meta.currentPage + 1)}
                >
                  <Icon name="chevron-right" size={20} color={meta.currentPage >= meta.lastPage ? '#CBD5E1' : '#334155'} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={infoOpen} transparent animationType="fade" onRequestClose={() => setInfoOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setInfoOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.infoModalCard} onPress={() => {}}>
            <View style={styles.infoIconCircle}>
              <Icon name="info-outline" size={26} color="#D94625" />
            </View>
            <Text style={styles.infoModalTitle}>What's General Support for?</Text>
            <Text style={styles.infoModalText}>
              Questions not about a specific service request. For a request you've already made, use the{' '}
              <Text style={styles.infoModalTextBold}>Support Chat</Text> card on that request's page instead.
            </Text>
            <TouchableOpacity style={styles.infoModalCloseBtn} onPress={() => setInfoOpen(false)} activeOpacity={0.9}>
              <Text style={styles.infoModalCloseText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 16 },

  infoRow: { flexDirection: 'row', paddingHorizontal: 4 },
  infoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFF1E8', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
  },
  infoBtnText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#D94625' },

  newTicketBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#D94625', borderRadius: 16, paddingVertical: 14,
    shadowColor: '#D94625', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  newTicketBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, marginBottom: -4 },
  cardHeaderTitle: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  countBadge: { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 2, minWidth: 24, alignItems: 'center' },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },

  stateCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 32, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  emptyIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#64748B' },

  ticketCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  rowIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ticketNumber: { flex: 1, fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', fontWeight: '700' },
  ticketSubject: { fontSize: 13, color: '#475569' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 1, flexWrap: 'wrap' },
  ticketDate: { fontSize: 12, color: '#94A3B8' },
  catChip: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  catChipText: { fontSize: 10, fontWeight: '700' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  footer: {
    backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14, gap: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  footerText: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' },
  pagerArrow: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  pagerDisabled: { backgroundColor: '#F8FAFC', borderColor: '#F1F5F9' },
  pagerNum: { minWidth: 34, height: 34, paddingHorizontal: 6, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' },
  pagerNumActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  pagerNumText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  pagerNumTextActive: { color: '#FFFFFF' },
  pagerEllipsis: { width: 24, height: 34, justifyContent: 'center', alignItems: 'center' },
  pagerEllipsisText: { fontSize: 14, color: '#94A3B8', fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  infoModalCard: { width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, alignItems: 'center', gap: 8, elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 16 },
  infoIconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  infoModalTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  infoModalText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  infoModalTextBold: { fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  infoModalCloseBtn: { backgroundColor: '#D94625', borderRadius: 16, paddingHorizontal: 28, paddingVertical: 12, marginTop: 10 },
  infoModalCloseText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
});

export default GeneralSupport;
