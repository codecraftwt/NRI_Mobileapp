import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useCustomPlans } from '../../Hooks/useCustomPlans';
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

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Hub screen for the "Custom Plan" feature (Dashboard → Explore → Custom
// Plan) — its own section now, no longer a Support Chat category. Lists the
// customer's bespoke, no-fixed-price requests via GET /customer/custom-plans
// and is the jumping-off point for filing a new one via CustomPlanNew.
function CustomPlanRequests({ navigation }) {
  const { tickets: customPlanTickets, loading, failed, retry } = useCustomPlans();
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

  const isEmpty = !loading && customPlanTickets.length === 0;
  const startNewRequest = () => navigation.navigate('CustomPlanNew');

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Custom Plan Requests" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D94625']} tintColor="#D94625" />}
      >

        {loading && !customPlanTickets.length && (
          <View style={styles.stateCard}>
            <ActivityIndicator size="small" color="#D94625" />
            <Text style={styles.loadingText}>Loading your requests...</Text>
          </View>
        )}

        {failed && (
          <TouchableOpacity style={styles.stateCard} onPress={retry}>
            <Icon name="error-outline" size={22} color="#EF4444" />
            <Text style={styles.retryText}>Couldn't load your requests. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {!loading && !failed && isEmpty && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconCircle}>
              <Icon name="auto-awesome" size={32} color="#D94625" />
            </View>
            <Text style={styles.emptyTitle}>Start your first custom plan</Text>
            <Text style={styles.emptyText}>
              Not on our catalog? Describe what you need and where — our team reviews it and quotes a price.
            </Text>
            <TouchableOpacity style={styles.emptyCta} activeOpacity={0.9} onPress={startNewRequest}>
              <Icon name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.emptyCtaText}>Request a Custom Quote</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !failed && !isEmpty && (
          <>
            <View style={styles.listHeaderRow}>
              <Text style={styles.listHeaderTitle}>All Requests</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{customPlanTickets.length}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.newBtn} activeOpacity={0.9} onPress={startNewRequest}>
              <Icon name="add-circle" size={18} color="#FFFFFF" />
              <Text style={styles.newBtnText}>New Custom Plan Request</Text>
            </TouchableOpacity>

            {customPlanTickets.map((ticket) => {
              const pill = getStatusPill(ticket.statusLabel);
              return (
                <TouchableOpacity
                  key={ticket.id}
                  style={styles.ticketCard}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('SupportTicketChat', { ticketId: ticket.id, kind: 'custom_plan' })}
                >
                  <View style={styles.ticketIconBox}>
                    <Icon name="description" size={20} color="#64748B" />
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
                    </View>
                  </View>
                  <View style={styles.viewBtn}>
                    <Icon name="visibility" size={16} color="#3B82F6" />
                  </View>
                </TouchableOpacity>
              );
            })}

            <Text style={styles.footerText}>Showing 1 to {customPlanTickets.length} of {customPlanTickets.length} entries</Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60, gap: 16 },

  noteBanner: { paddingHorizontal: 4 },
  noteText: { ...typography.small, color: '#64748B', lineHeight: 20 },

  stateCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingVertical: 32, paddingHorizontal: 18,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryText: { fontSize: 13, color: '#EF4444', fontWeight: '600' },

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3,
  },
  emptyIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF1E8', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginBottom: 6 },
  emptyCta: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#D94625', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 13,
    shadowColor: '#D94625', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  emptyCtaText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  listHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
  listHeaderTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  countBadge: { backgroundColor: '#DBEAFE', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 2, minWidth: 24, alignItems: 'center' },
  countBadgeText: { fontSize: 12, fontWeight: '700', color: '#1D4ED8' },
  newBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#D94625', borderRadius: 18, paddingVertical: 16,
    shadowColor: '#D94625', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 4,
  },
  newBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },

  ticketCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  ticketIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  rowMain: { flex: 1, gap: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  ticketNumber: { flex: 1, fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', fontWeight: '700' },
  ticketSubject: { fontSize: 13, color: '#64748B' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ticketDate: { fontSize: 12, color: '#94A3B8' },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  viewBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },

  footerText: { fontSize: 12, color: '#94A3B8', textAlign: 'center' },
});

export default CustomPlanRequests;
