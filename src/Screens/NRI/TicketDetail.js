import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useTicketDetail } from '../../Hooks/useTicketDetail';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

function getStatusColor(statusLabel) {
  switch (statusLabel) {
    case 'New': return { bg: '#E5F1FF', text: '#3298D4' };
    case 'Assigned': return { bg: '#FFF3E0', text: '#FF9800' };
    case 'In Progress': return { bg: '#E8F5E9', text: '#4CAF50' };
    case 'Completed': return { bg: 'rgba(50,152,212,0.15)', text: '#21709F' };
    case 'Cancelled': return { bg: '#FEE2E2', text: '#EF4444' };
    default: return { bg: '#F0F1F1', text: '#94A3B8' };
  }
}

function getUrgencyLabel(urgency) {
  if (!urgency) return '';
  return urgency.charAt(0).toUpperCase() + urgency.slice(1);
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

function TicketDetail({ route, navigation }) {
  const { ticketId } = route.params || {};
  const { detail: ticket, loading, failed, retry } = useTicketDetail(ticketId);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  // `retry` is a fresh function reference every render (not memoized by the
  // hook) — keeping it out of the deps array avoids an infinite refetch loop
  // (retry() causes a re-render, which would recreate the callback, which
  // would re-trigger the effect). Only re-fire on an actual focus event or a
  // genuine ticketId change.
  useFocusEffect(
    useCallback(() => {
      if (ticketId) retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketId])
  );

  if (loading && !ticket) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Request" showBack />
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.emptyText}>Loading request...</Text>
        </View>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Request" showBack />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Couldn't load this request.</Text>
          <TouchableOpacity style={styles.backLink} onPress={retry}>
            <Text style={styles.backLinkText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Request" showBack />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Request not found.</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={16} color={colors.primary} />
            <Text style={styles.backLinkText}>Back to My Requests</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusStyle = getStatusColor(ticket.statusLabel);
  const overdue = isOverdue(ticket.slaDeadline);
  const locationLine = ticket.location
    ? [ticket.location.taluka, ticket.location.city, ticket.location.state].filter(Boolean).join(', ')
    : '';
  const timeline = ticket.timeline.length
    ? ticket.timeline
    : [{ to: ticket.status, at: ticket.createdAt, note: 'Ticket created' }];
  const addonsTotal = ticket.addons.reduce((sum, a) => sum + Number(a.customerPrice || 0), 0);
  const baseAmount = Math.max(0, Number(ticket.pricing?.customerPrice || 0) - addonsTotal);

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={ticket.ticketNumber} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.badgeText, { color: statusStyle.text }]}>{ticket.statusLabel}</Text>
              </View>
              {!!ticket.urgency && (
                <View style={[styles.badge, styles.badgeNeutral]}>
                  <Text style={[styles.badgeText, styles.badgeTextNeutral]}>{getUrgencyLabel(ticket.urgency)}</Text>
                </View>
              )}
            </View>
            <View style={styles.submittedWrap}>
              <Text style={styles.hint}>Submitted</Text>
              <Text style={styles.submittedDate}>{formatDateTime(ticket.createdAt)}</Text>
            </View>
          </View>

          <Text style={styles.ticketId}>{ticket.ticketNumber}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Service</Text>
              <Text style={styles.value}>{ticket.serviceName}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Vendor</Text>
              <Text style={styles.value}>{ticket.vendorName || 'Pending Assignment'}</Text>
            </View>
            {!!ticket.location?.address && (
              <View style={styles.infoBlock}>
                <Text style={styles.label}>Location</Text>
                <Text style={styles.value}>{ticket.location.address}</Text>
                {!!locationLine && <Text style={styles.subValue}>{locationLine}</Text>}
              </View>
            )}
            {ticket.totalAmount != null && (
              <View style={styles.infoBlock}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.value}>₹{ticket.totalAmount.toLocaleString('en-IN')} · {ticket.isPaid ? 'Paid' : 'Unpaid'}</Text>
              </View>
            )}
            {!!ticket.customerNotes && (
              <View style={styles.infoBlock}>
                <Text style={styles.label}>Notes</Text>
                <Text style={styles.value}>{ticket.customerNotes}</Text>
              </View>
            )}
          </View>

          {!!ticket.slaDeadline && (
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Expected By (SLA)</Text>
              <View style={styles.slaRow}>
                <Text style={[styles.value, overdue && styles.overdueText]}>{formatDateTime(ticket.slaDeadline)}</Text>
                {overdue && (
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueBadgeText}>Overdue</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {!!ticket.pricing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Charges Breakdown</Text>
            <View style={styles.chargesList}>
              <View style={styles.chargeRow}>
                <Text style={styles.chargeLabel}>Base: {ticket.serviceName}</Text>
                <Text style={styles.chargeValue}>₹{baseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              {ticket.addons.map((addon, idx) => (
                <View key={addon.serviceId ?? idx} style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>+ {addon.name}</Text>
                  <Text style={styles.chargeValue}>₹{Number(addon.customerPrice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>
              ))}
              {ticket.pricing.expressSurcharge > 0 && (
                <View style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>+ Express Surcharge</Text>
                  <Text style={styles.chargeValue}>₹{ticket.pricing.expressSurcharge.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>
              )}
              {ticket.pricing.discountAmount > 0 && (
                <View style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>− Discount{ticket.pricing.couponCode ? ` (${ticket.pricing.couponCode})` : ''}</Text>
                  <Text style={[styles.chargeValue, styles.discountValue]}>−₹{ticket.pricing.discountAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{Number(ticket.pricing.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.lastSection}>
          <Text style={styles.sectionTitle}>Request Timeline</Text>
          {timeline.map((event, idx) => {
            const eventStatusStyle = getStatusColor(event.to === 'new' ? 'New' : event.to === 'assigned' ? 'Assigned' : event.to === 'in_progress' ? 'In Progress' : event.to === 'completed' ? 'Completed' : event.to === 'cancelled' ? 'Cancelled' : event.to);
            const isLast = idx === timeline.length - 1;
            return (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.timelineDotCol}>
                  <View style={[styles.timelineDot, isLast && styles.timelineDotActive]} />
                  {!isLast && <View style={styles.timelineLine} />}
                </View>
                <View style={styles.timelineContent}>
                  <View style={[styles.badge, styles.timelineBadge, { backgroundColor: eventStatusStyle.bg }]}>
                    <Text style={[styles.badgeText, { color: eventStatusStyle.text }]}>{event.to || 'Update'}</Text>
                  </View>
                  <Text style={styles.timelineDate}>{formatDateTime(event.at)}</Text>
                  {!!event.note && <Text style={styles.timelineDesc}>{event.note}</Text>}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 60, paddingHorizontal: 16, paddingTop: 16 },
  
  section: { 
    backgroundColor: colors.surface,
    padding: 20, 
    borderRadius: 16,
    gap: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  lastSection: {
    backgroundColor: colors.surface,
    padding: 20, 
    borderRadius: 16,
    gap: 16,
    marginBottom: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeNeutral: { backgroundColor: '#F0F1F1' },
  badgeText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, textTransform: 'uppercase' },
  badgeTextNeutral: { color: '#94A3B8' },
  
  submittedWrap: { alignItems: 'flex-end' },
  hint: { ...typography.tiny, color: '#94A3B8' },
  submittedDate: { ...typography.small, color: '#333', fontFamily: typography.labelMedium.fontFamily, marginTop: 2 },
  
  ticketId: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#333' },
  
  infoGrid: { gap: 16, marginTop: 8 },
  infoBlock: { gap: 4 },
  label: { ...typography.small, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily },
  value: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#333' },
  subValue: { ...typography.small, color: '#94A3B8' },
  
  slaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overdueText: { color: '#EF4444' },
  overdueBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  overdueBadgeText: { ...typography.tiny, color: '#EF4444', fontFamily: typography.labelMedium.fontFamily },
  
  sectionTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#333', marginBottom: 8 },
  
  chargesList: { gap: 0 },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F1F1', borderStyle: 'dashed' },
  chargeLabel: { ...typography.small, color: '#94A3B8', flex: 1, paddingRight: 8 },
  chargeValue: { fontSize: 14, color: '#333', fontFamily: typography.labelMedium.fontFamily },
  discountValue: { color: '#10B981' },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4, borderTopWidth: 2, borderTopColor: '#F3F4F6' },
  totalLabel: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#333' },
  totalValue: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#333' },
  
  timelineRow: { flexDirection: 'row', gap: 16 },
  timelineDotCol: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#D1D5DB', marginTop: 4 },
  timelineDotActive: { backgroundColor: '#E97A24' }, // Accent color for active dot
  timelineLine: { flex: 1, width: 2, backgroundColor: '#F0F1F1', marginTop: 4, marginBottom: -4 },
  timelineContent: { flex: 1, paddingBottom: 24, gap: 4 },
  timelineBadge: { alignSelf: 'flex-start' },
  timelineDate: { ...typography.small, color: '#94A3B8' },
  timelineDesc: { ...typography.body, color: '#333' },
  
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3298D4', // Primary color
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  backBtnText: { ...typography.labelLarge, color: '#FFFFFF' },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { ...typography.body, color: '#94A3B8' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backLinkText: { ...typography.labelMedium, color: '#3298D4' },
});

export default TicketDetail;
