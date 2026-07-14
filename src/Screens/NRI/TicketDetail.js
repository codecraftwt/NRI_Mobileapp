import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useTicketDetail } from '../../Hooks/useTicketDetail';

function getStatusColor(statusLabel) {
  switch (statusLabel) {
    case 'New': return { bg: '#E5F1FF', text: '#007AFF' };
    case 'Assigned': return { bg: '#FFF3E0', text: '#FF9800' };
    case 'In Progress': return { bg: '#E8F5E9', text: '#4CAF50' };
    case 'Completed': return { bg: '#F3E5F5', text: '#9C27B0' };
    case 'Cancelled': return { bg: '#FEE2E2', text: '#EF4444' };
    default: return { bg: '#F3F4F6', text: '#6B7280' };
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

  if (loading && !ticket) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Request" showBack />
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.emptyText}>Loading request…</Text>
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
            <Icon name="arrow-back" size={16} color="#007AFF" />
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              <Text style={styles.value}>{ticket.vendorName || 'Pending'}</Text>
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
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Charges</Text>
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

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Request Timeline</Text>
          {timeline.map((event, idx) => {
            const eventStatusStyle = getStatusColor(event.to === 'new' ? 'New' : event.to === 'assigned' ? 'Assigned' : event.to === 'in_progress' ? 'In Progress' : event.to === 'completed' ? 'Completed' : event.to === 'cancelled' ? 'Cancelled' : event.to);
            return (
              <View key={idx} style={styles.timelineRow}>
                <View style={styles.timelineDotCol}>
                  <View style={[styles.timelineDot, idx === timeline.length - 1 && styles.timelineDotActive]} />
                  {idx < timeline.length - 1 && <View style={styles.timelineLine} />}
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

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={16} color="#374151" />
            <Text style={styles.backBtnText}>Back to My Requests</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  card: { backgroundColor: 'white', borderRadius: 12, padding: 16, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeNeutral: { backgroundColor: '#F3F4F6' },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  badgeTextNeutral: { color: '#6B7280' },
  submittedWrap: { alignItems: 'flex-end' },
  hint: { fontSize: 11.5, color: '#9CA3AF' },
  submittedDate: { fontSize: 12.5, color: '#374151', fontWeight: '600', marginTop: 2 },
  ticketId: { fontSize: 20, fontWeight: '800', color: '#111827' },
  infoGrid: { gap: 12 },
  infoBlock: { gap: 4 },
  label: { fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  value: { fontSize: 14, color: '#111827', fontWeight: '700' },
  subValue: { fontSize: 12.5, color: '#6B7280' },
  slaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overdueText: { color: '#EF4444' },
  overdueBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  overdueBadgeText: { fontSize: 10.5, color: '#EF4444', fontWeight: '700' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  chargesList: { gap: 0 },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E5E7EB', borderStyle: 'dashed' },
  chargeLabel: { fontSize: 13, color: '#6B7280', flex: 1, paddingRight: 8 },
  chargeValue: { fontSize: 13, color: '#374151', fontWeight: '600' },
  discountValue: { color: '#10B981' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginTop: 2, borderTopWidth: 1, borderTopColor: '#111827' },
  totalLabel: { fontSize: 15, fontWeight: '800', color: '#111827' },
  totalValue: { fontSize: 17, fontWeight: '800', color: '#111827' },
  timelineRow: { flexDirection: 'row', gap: 12 },
  timelineDotCol: { alignItems: 'center', width: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB', marginTop: 4 },
  timelineDotActive: { backgroundColor: '#007AFF' },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#E5E7EB', marginTop: 2, marginBottom: -2 },
  timelineContent: { flex: 1, paddingBottom: 16, gap: 4 },
  timelineBadge: { alignSelf: 'flex-start' },
  timelineDate: { fontSize: 12, color: '#6B7280' },
  timelineDesc: { fontSize: 13, color: '#374151' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
  },
  backBtnText: { fontSize: 13, color: '#374151', fontWeight: '600' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: '#6B7280' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backLinkText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
});

export default TicketDetail;
