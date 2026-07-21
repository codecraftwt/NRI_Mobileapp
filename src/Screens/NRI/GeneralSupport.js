import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
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
    default: return { bg: '#DBEAFE', text: '#1D4ED8' };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function GeneralSupport({ navigation }) {
  const { tickets, meta, loading, failed, retry, fetchPage } = useSupportTickets();
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="General Support" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.accent]} tintColor={colors.accent} />}
      >
        <View style={styles.noteBanner}>
          <Text style={styles.noteText}>
            Questions not about a specific service request. For a request you've already made, use the{' '}
            <Text style={styles.noteBold}>Support Chat</Text> card on that request's page instead.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardHeaderTitle}>All Tickets</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{meta.total}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.newTicketBtn} onPress={() => navigation.navigate('NewSupportTicket')}>
              <Icon name="add-circle-outline" size={16} color="#FFFFFF" />
              <Text style={styles.newTicketBtnText}>New Support Ticket</Text>
            </TouchableOpacity>
          </View>

          {loading && !tickets.length && (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Loading tickets...</Text>
            </View>
          )}

          {failed && (
            <TouchableOpacity style={styles.retryBox} onPress={retry}>
              <Text style={styles.retryText}>Couldn't load tickets. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          {!loading && !failed && tickets.length === 0 && (
            <View style={styles.emptyState}>
              <Icon name="support-agent" size={40} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No support tickets yet</Text>
              <Text style={styles.emptyText}>Raise a new ticket for any general question.</Text>
            </View>
          )}

          {tickets.map((ticket, index) => {
            const pill = getStatusPill(ticket.statusLabel);
            return (
              <TouchableOpacity
                key={ticket.id}
                style={[styles.ticketRow, index < tickets.length - 1 && styles.rowBorder]}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('SupportTicketChat', { ticketId: ticket.id })}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.ticketNumber}>{ticket.ticketNumber}</Text>
                  <Text style={styles.ticketSubject} numberOfLines={1}>{ticket.subject}</Text>
                  <Text style={styles.ticketDate}>{formatDate(ticket.createdAt)}</Text>
                </View>
                <View style={styles.rowRight}>
                  <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                    <Text style={[styles.statusPillText, { color: pill.text }]}>{ticket.statusLabel}</Text>
                  </View>
                  <Icon name="visibility" size={20} color={colors.primary} />
                </View>
              </TouchableOpacity>
            );
          })}

          {tickets.length > 0 && (
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Showing {rangeStart} to {rangeEnd} of {meta.total} entries</Text>
              {meta.lastPage > 1 && (
                <View style={styles.pagerRow}>
                  <TouchableOpacity
                    style={[styles.pagerBtn, meta.currentPage <= 1 && styles.pagerBtnDisabled]}
                    disabled={meta.currentPage <= 1}
                    onPress={() => fetchPage(meta.currentPage - 1)}
                  >
                    <Icon name="chevron-left" size={18} color="#64748B" />
                  </TouchableOpacity>
                  <View style={styles.pagerCurrent}>
                    <Text style={styles.pagerCurrentText}>{meta.currentPage}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.pagerBtn, meta.currentPage >= meta.lastPage && styles.pagerBtnDisabled]}
                    disabled={meta.currentPage >= meta.lastPage}
                    onPress={() => fetchPage(meta.currentPage + 1)}
                  >
                    <Icon name="chevron-right" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 16 },

  noteBanner: { paddingHorizontal: 4 },
  noteText: { ...typography.small, color: '#64748B', lineHeight: 20 },
  noteBold: { fontFamily: typography.labelMedium.fontFamily, color: '#334155' },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardHeaderTitle: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  countBadge: { backgroundColor: '#EFF6FF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, minWidth: 22, alignItems: 'center' },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  newTicketBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  newTicketBtnText: { color: '#FFFFFF', fontSize: 13, fontFamily: typography.labelMedium.fontFamily },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 24 },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 24 },
  retryText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#64748B' },

  ticketRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowMain: { flex: 1, gap: 3 },
  ticketNumber: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  ticketSubject: { fontSize: 13, color: '#475569' },
  ticketDate: { fontSize: 12, color: '#94A3B8' },
  rowRight: { alignItems: 'flex-end', gap: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  footerRow: { marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  footerText: { fontSize: 12, color: '#94A3B8' },
  pagerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pagerBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  pagerBtnDisabled: { opacity: 0.4 },
  pagerCurrent: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#1D4ED8', justifyContent: 'center', alignItems: 'center' },
  pagerCurrentText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});

export default GeneralSupport;
