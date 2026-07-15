import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Linking, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useTicketDetail } from '../../Hooks/useTicketDetail';
import { useReports } from '../../Hooks/useReports';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

function getStatusColor(statusLabel) {
  switch (statusLabel) {
    case 'New': return { bg: colors.badgeBackground, text: colors.primary };
    case 'Assigned': return { bg: colors.warningBackground, text: colors.warning };
    case 'In Progress': return { bg: colors.successBackground, text: colors.success };
    case 'Completed': return { bg: colors.primaryLight + '30', text: colors.primaryDark };
    case 'Cancelled': return { bg: colors.errorBackground, text: colors.error };
    default: return { bg: colors.surfaceSecondary, text: colors.textSecondary };
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
  const { detail: ticket, loading, failed, retry, rate, rateLoading } = useTicketDetail(ticketId);

  // Visit reports are their own resource (GET /customer/reports), not
  // embedded in the ticket detail payload — the ticket detail endpoint never
  // returns a `report` object, only a `has_report` boolean on the list item.
  // Each report carries a `ticket_id`, so match it client-side. The reports
  // endpoint only supports a `page` param (no ticket_id filter), so a report
  // sitting past page 1 won't be found here — acceptable for now since
  // reports are far less frequent than tickets.
  const { reports, loading: reportsLoading, failed: reportsFailed, retry: retryReports } = useReports();
  const report = reports.find(r => r.ticketId === ticket?.id) || null;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([retry(), retryReports()]);
    setRefreshing(false);
  };

  const [selectedStars, setSelectedStars] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState('');

  const handleSubmitRating = async () => {
    if (!selectedStars) {
      Alert.alert('Select a Rating', 'Please tap a star to rate this service.');
      return;
    }
    try {
      await rate(selectedStars, feedbackNote.trim() || undefined).unwrap();
      Alert.alert('Thank You', 'Your rating has been submitted.');
    } catch (error) {
      Alert.alert('Could Not Submit Rating', error?.message || 'Please try again.');
    }
  };

  const handleViewAttachment = (url) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert('Could Not Open', 'This attachment could not be opened.');
    });
  };

  // `retry` is a fresh function reference every render (not memoized by the
  // hook) — keeping it out of the deps array avoids an infinite refetch loop
  // (retry() causes a re-render, which would recreate the callback, which
  // would re-trigger the effect). Only re-fire on an actual focus event or a
  // genuine ticketId change.
  useFocusEffect(
    useCallback(() => {
      if (ticketId) retry();
      retryReports();
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.section}>
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

        <View style={styles.section}>
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

        {(ticket.status === 'completed' || !!report || reportsFailed) && (
          <View style={styles.section}>
            <View style={styles.reportHeaderRow}>
              <View style={styles.reportTitleWrap}>
                <Icon name="description" size={18} color={colors.success} />
                <Text style={styles.sectionTitle}>Service Report</Text>
              </View>
              {!!report?.status && (
                <View style={styles.reportStatusBadge}>
                  <Text style={styles.reportStatusText}>{report.status}</Text>
                </View>
              )}
            </View>
            {reportsFailed ? (
              <TouchableOpacity style={styles.backLink} onPress={retryReports}>
                <Icon name="refresh" size={16} color={colors.error} />
                <Text style={[styles.backLinkText, { color: colors.error }]}>Couldn't load the report. Tap to retry.</Text>
              </TouchableOpacity>
            ) : report ? (
              <>
                {!!report.title && <Text style={styles.reportNote}>{report.title}</Text>}
                {!!(report.vendor || report.date) && (
                  <Text style={styles.subValue}>
                    {[report.vendor, formatDateTime(report.date)].filter(Boolean).join(' · ')}
                  </Text>
                )}
                {report.media.length > 0 && (
                  <View style={styles.attachmentRow}>
                    {report.media.map((m, idx) => (
                      <TouchableOpacity key={m.url ?? idx} style={styles.attachmentPill} onPress={() => handleViewAttachment(m.url)}>
                        <Icon name="attach-file" size={14} color={colors.primary} />
                        <Text style={styles.attachmentPillText}>{report.media.length > 1 ? `View Attachment ${idx + 1}` : 'View Attachment'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            ) : reportsLoading ? (
              <View style={styles.reportLoadingRow}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.subValue}>Checking for your service report...</Text>
              </View>
            ) : (
              <Text style={styles.subValue}>Your service report hasn't been shared yet.</Text>
            )}
          </View>
        )}

        {ticket.status === 'completed' && (
          <View style={styles.section}>
            <View style={styles.reportTitleWrap}>
              <Icon name="star" size={18} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Rate this Service</Text>
            </View>

            {ticket.rating ? (
              <>
                <Text style={styles.label}>Your rating</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Icon key={n} name={n <= ticket.rating.value ? 'star' : 'star-border'} size={28} color="#F59E0B" />
                  ))}
                </View>
                {!!ticket.rating.note && <Text style={styles.reportNote}>{ticket.rating.note}</Text>}
              </>
            ) : (
              <>
                <Text style={styles.label}>How did we do?</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} onPress={() => setSelectedStars(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <Icon name={n <= selectedStars ? 'star' : 'star-border'} size={32} color="#F59E0B" />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Any feedback? (optional)"
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                  value={feedbackNote}
                  onChangeText={setFeedbackNote}
                />
                <TouchableOpacity style={[styles.submitRatingBtn, rateLoading && styles.submitRatingBtnDisabled]} onPress={handleSubmitRating} disabled={rateLoading}>
                  {rateLoading ? <ActivityIndicator size="small" color={colors.surface} /> : <Text style={styles.submitRatingBtnText}>Submit Rating</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
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
  
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeNeutral: { backgroundColor: colors.surfaceSecondary },
  badgeText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, textTransform: 'uppercase' },
  badgeTextNeutral: { color: colors.textSecondary },
  
  submittedWrap: { alignItems: 'flex-end' },
  hint: { ...typography.tiny, color: colors.textSecondary },
  submittedDate: { ...typography.small, color: colors.textPrimary, fontFamily: typography.labelMedium.fontFamily, marginTop: 2 },
  
  ticketId: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: colors.textPrimary },
  
  infoGrid: { gap: 16, marginTop: 8 },
  infoBlock: { gap: 4 },
  label: { ...typography.small, color: colors.textSecondary, fontFamily: typography.labelMedium.fontFamily },
  value: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: colors.textPrimary },
  subValue: { ...typography.small, color: colors.textSecondary },
  
  slaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overdueText: { color: colors.error },
  overdueBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  overdueBadgeText: { ...typography.tiny, color: colors.error, fontFamily: typography.labelMedium.fontFamily },
  
  sectionTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: colors.textPrimary, marginBottom: 8 },
  
  chargesList: { gap: 0 },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.surfaceSecondary, borderStyle: 'dashed' },
  chargeLabel: { ...typography.small, color: colors.textSecondary, flex: 1, paddingRight: 8 },
  chargeValue: { fontSize: 14, color: colors.textPrimary, fontFamily: typography.labelMedium.fontFamily },
  discountValue: { color: colors.success },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4, borderTopWidth: 2, borderTopColor: colors.surfaceSecondary },
  totalLabel: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: colors.textPrimary },
  totalValue: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: colors.textPrimary },
  
  timelineRow: { flexDirection: 'row', gap: 16 },
  timelineDotCol: { alignItems: 'center', width: 16 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.border, marginTop: 4 },
  timelineDotActive: { backgroundColor: colors.accent }, 
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.surfaceSecondary, marginTop: 4, marginBottom: -4 },
  timelineContent: { flex: 1, paddingBottom: 24, gap: 4 },
  timelineBadge: { alignSelf: 'flex-start' },
  timelineDate: { ...typography.small, color: colors.textSecondary },
  timelineDesc: { ...typography.body, color: colors.textPrimary },
  
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    paddingHorizontal: 24,
  },
  backBtnText: { ...typography.labelLarge, color: colors.surface },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { ...typography.body, color: colors.textSecondary },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backLinkText: { ...typography.labelMedium, color: colors.primary },

  reportHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reportTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportStatusBadge: { backgroundColor: colors.successBackground, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  reportStatusText: { ...typography.tiny, color: colors.success, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },
  reportNote: { fontSize: 15, color: colors.textPrimary },
  reportLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attachmentPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.badgeBackground, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  attachmentPillText: { fontSize: 13, color: colors.primary, fontFamily: typography.labelMedium.fontFamily, textDecorationLine: 'underline' },

  starRow: { flexDirection: 'row', gap: 8 },
  feedbackInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    minHeight: 70,
  },
  submitRatingBtn: { backgroundColor: '#FF7C1A', borderRadius: 25, paddingVertical: 14, alignItems: 'center' },
  submitRatingBtnDisabled: { opacity: 0.7 },
  submitRatingBtnText: { color: colors.surface, fontSize: 15, fontFamily: typography.labelLarge.fontFamily },
});

export default TicketDetail;
