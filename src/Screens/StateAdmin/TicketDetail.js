import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function getStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('complet') || s.includes('refund')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  if (s.includes('progress') || s.includes('assign')) return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  if (s === 'new') return { bg: '#F3E8FF', text: '#7E22CE', border: '#DDD6FE' };
  if (s.includes('escalat')) return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  if (s.includes('cancel')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}

function getPriorityStyle(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent' || p === 'high') return { bg: '#FEE2E2', text: '#EF4444' };
  if (p === 'medium') return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#F1F5F9', text: '#64748B' };
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function InfoRow({ icon, label, value, valueColor, onPress }) {
  if (!value) return null;
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.infoRow} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={styles.infoIconWrap}>
        <Icon name={icon} size={16} color="#64748B" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor && { color: valueColor }]} numberOfLines={2}>{value}</Text>
      </View>
      {onPress && <Icon name="chevron-right" size={18} color="#CBD5E1" />}
    </Wrapper>
  );
}

function TicketDetail({ route, navigation }) {
  const ticket = route?.params?.ticket || {};
  const statusStyle = getStatusStyle(ticket.status);
  const priorityStyle = getPriorityStyle(ticket.priority);
  const locationStr = [ticket.cityName, ticket.stateName].filter(Boolean).join(', ');

  const handleCall = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const handleEmail = (email) => {
    if (!email) return;
    Linking.openURL(`mailto:${email}`).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle} numberOfLines={1}>{ticket.ticketNumber}</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={styles.card}>
          <View style={styles.summaryTopRow}>
            <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {(ticket.statusLabel || titleCase(ticket.status)).toUpperCase()}
              </Text>
            </View>
            {!!ticket.priority && (
              <View style={[styles.priorityPill, { backgroundColor: priorityStyle.bg }]}>
                <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
                  {(ticket.priorityLabel || ticket.priority).toUpperCase()}
                </Text>
              </View>
            )}
            {ticket.isQuoted && (
              <View style={styles.quotedPill}>
                <Text style={styles.quotedPillText}>ON QUOTE</Text>
              </View>
            )}
          </View>

          <Text style={styles.serviceName}>{ticket.serviceName}</Text>
          {!!ticket.categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{ticket.categoryName.toUpperCase()}</Text>
            </View>
          )}

          <View style={styles.metaDivider} />

          <View style={styles.summaryMetaRow}>
            <View>
              <Text style={styles.metaLabel}>Amount</Text>
              <Text style={styles.amountValue}>{ticket.amountFormatted || '—'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.metaLabel}>Created</Text>
              <Text style={styles.metaValue}>{formatDateTime(ticket.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Customer */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="person" size={18} color="#2563EB" />
            <Text style={styles.sectionTitle}>Customer</Text>
          </View>
          <InfoRow icon="badge" label="Name" value={ticket.customerName} />
          <InfoRow icon="call" label="Phone" value={ticket.customerPhone} valueColor="#059669" onPress={() => handleCall(ticket.customerPhone)} />
          <InfoRow icon="mail-outline" label="Email" value={ticket.customerEmail} onPress={() => handleEmail(ticket.customerEmail)} />
        </View>

        {/* Location */}
        {!!locationStr && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="place" size={18} color="#D97706" />
              <Text style={styles.sectionTitle}>Location</Text>
            </View>
            <InfoRow icon="location-city" label="City" value={ticket.cityName} />
            <InfoRow icon="map" label="State" value={ticket.stateName} />
          </View>
        )}

        {/* Assignment */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="assignment-ind" size={18} color="#7E22CE" />
            <Text style={styles.sectionTitle}>Assignment</Text>
          </View>
          <InfoRow
            icon="storefront"
            label="Vendor"
            value={ticket.vendorName || 'Unassigned'}
            valueColor={ticket.vendorName ? '#059669' : '#94A3B8'}
          />
          {!!ticket.vendorAssignedAt && (
            <InfoRow icon="schedule" label="Vendor Assigned" value={formatDateTime(ticket.vendorAssignedAt)} />
          )}
          <InfoRow
            icon="support-agent"
            label="Relationship Manager"
            value={ticket.assignedRmName || 'Not assigned'}
            valueColor={ticket.assignedRmName ? '#1E293B' : '#94A3B8'}
          />
          <InfoRow
            icon="headset-mic"
            label="Telecaller"
            value={ticket.assignedTelecallerName || 'Not assigned'}
            valueColor={ticket.assignedTelecallerName ? '#1E293B' : '#94A3B8'}
          />
        </View>

        {/* Flags */}
        {(ticket.requiresPriceConfirmation || ticket.isLineTicket) && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="flag" size={18} color="#DC2626" />
              <Text style={styles.sectionTitle}>Flags</Text>
            </View>
            {ticket.requiresPriceConfirmation && (
              <View style={styles.flagRow}>
                <Icon name="price-change" size={16} color="#D97706" />
                <Text style={styles.flagText}>Awaiting price confirmation from customer</Text>
              </View>
            )}
            {ticket.isLineTicket && (
              <View style={styles.flagRow}>
                <Icon name="link" size={16} color="#2563EB" />
                <Text style={styles.flagText}>Part of a line/bundle ticket</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    backgroundColor: '#20304C',
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitleWrap: { flex: 1, height: 36, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', marginTop: 4 },

  body: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { padding: 20, paddingBottom: 60, gap: 14 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },

  summaryTopRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  priorityPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  priorityText: { fontSize: 10, fontWeight: '700' },
  quotedPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#EEF2FF' },
  quotedPillText: { fontSize: 10, fontWeight: '700', color: '#4338CA' },

  serviceName: { fontSize: 17, fontWeight: '700', color: '#1E293B', marginBottom: 6 },
  categoryBadge: {
    backgroundColor: '#EEF2FB', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start',
  },
  categoryBadgeText: { fontSize: 9, fontWeight: '700', color: '#20304C', letterSpacing: 0.5 },

  metaDivider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 14 },
  summaryMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  metaLabel: { fontSize: 11, color: '#94A3B8', marginBottom: 2 },
  metaValue: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  amountValue: { fontSize: 20, fontWeight: '700', color: '#16A34A' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 9,
    borderTopWidth: 1, borderTopColor: '#F8FAFC',
  },
  infoIconWrap: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center',
  },
  infoLabel: { fontSize: 11, color: '#94A3B8' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1E293B', marginTop: 1 },

  flagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  flagText: { fontSize: 13, color: '#475569', flex: 1 },
});

export default TicketDetail;
