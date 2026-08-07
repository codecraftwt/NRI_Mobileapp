import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useRmCustomerDetail } from '../../Hooks/RM/useRmCustomerDetail';

// How many items to show per section before the "Show all" toggle appears.
const PREVIEW = 3;

const norm = (s) => String(s || '').toLowerCase();
const statusText = (s) => norm(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function statusPill(status) {
  switch (norm(status)) {
    case 'resolved': case 'completed': return { bg: '#D1FAE5', text: '#059669' };
    case 'in_progress': return { bg: '#FFEDD5', text: '#C2410C' };
    case 'assigned': return { bg: '#DBEAFE', text: '#2563EB' };
    case 'new': return { bg: '#EEF2FF', text: '#6366F1' };
    default: return { bg: '#F3F4F6', text: '#4B5563' };
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function CustomerDetail({ navigation, route }) {
  const customerId = route?.params?.customerId;
  const { detail, loading, failed, error, refresh } = useRmCustomerDetail(customerId);

  // Collapsed by default; each long list expands on demand.
  const [showAllFamily, setShowAllFamily] = useState(false);
  const [showAllProps, setShowAllProps] = useState(false);
  const [showAllReq, setShowAllReq] = useState(false);

  const c = detail;
  const initials = (c?.name || route?.params?.name || '?').trim().slice(0, 2).toUpperCase();

  const profileRows = c ? [
    c.nriCountry && { label: 'NRI Country', value: c.nriCountry },
    c.nriCity && { label: 'NRI City', value: c.nriCity },
    c.language && { label: 'Language', value: String(c.language).toUpperCase() },
    c.timezone && { label: 'Timezone', value: c.timezone },
  ].filter(Boolean) : [];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Details</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !c ? (
        <View style={styles.centerFill}><ActivityIndicator size="large" color="#20304C" /></View>
      ) : failed && !c ? (
        <View style={styles.centerFill}>
          <Icon name="error-outline" size={44} color="#CBD5E1" />
          <Text style={styles.errorText}>{error?.status === 403 ? 'This customer is assigned to another RM.' : (error?.message || 'Could not load this customer.')}</Text>
          {error?.status !== 403 && (
            <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : c ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Profile Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <Text style={styles.name}>{c.name}</Text>
            {!!c.email && <Text style={styles.contactLine}>{c.email}</Text>}
            {!!c.phone && <Text style={styles.contactLine}>{c.phone}</Text>}

            {profileRows.length > 0 && <View style={styles.divider} />}
            {profileRows.map((item, idx) => (
              <View key={item.label} style={[styles.kvRow, idx < profileRows.length - 1 && styles.kvBorder]}>
                <Text style={styles.kvLabel}>{item.label}</Text>
                <Text style={styles.kvValue} numberOfLines={1}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Active Membership */}
          {!!c.membership && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Active Membership</Text>
              <View style={styles.membershipRow}>
                <View style={styles.membershipIconBg}>
                  <Icon name="card-membership" size={22} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.membershipName}>{c.membership.name || 'Membership'}</Text>
                  {!!c.membership.expiresAt && <Text style={styles.membershipMeta}>Expires: {fmtDate(c.membership.expiresAt)}</Text>}
                </View>
                {!!c.membership.status && (
                  <View style={[styles.pill, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.pillText, { color: '#059669' }]}>{statusText(c.membership.status)}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Family Members */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.cardTitle}>Family Members</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{c.familyMembers.length}</Text></View>
            </View>
            {c.familyMembers.length === 0 ? (
              <EmptyState icon="group-off" text="No family members added." />
            ) : (
              <>
                {(showAllFamily ? c.familyMembers : c.familyMembers.slice(0, PREVIEW)).map((m, i, arr) => (
                  <View key={m.id} style={[styles.memberRow, i < arr.length - 1 && styles.itemBorder]}>
                    <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{(m.name || '?').charAt(0).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.memberTopRow}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        {!!m.relationship && <View style={styles.relationPill}><Text style={styles.relationText}>{m.relationship}</Text></View>}
                      </View>
                      <View style={styles.memberMetaRow}>
                        <View style={styles.metaItem}>
                          <Icon name="phone" size={13} color="#94A3B8" />
                          <Text style={styles.memberMeta}>{m.phone || '—'}</Text>
                        </View>
                        {!!m.healthNotes && (
                          <View style={styles.metaItem}>
                            <Icon name="medical-services" size={13} color="#94A3B8" />
                            <Text style={styles.memberMeta} numberOfLines={1}>{m.healthNotes}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                ))}
                <ShowMore count={c.familyMembers.length} expanded={showAllFamily} onToggle={() => setShowAllFamily(v => !v)} />
              </>
            )}
          </View>

          {/* Properties */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.cardTitle}>Properties</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{c.properties.length}</Text></View>
            </View>
            {c.properties.length === 0 ? (
              <EmptyState icon="home-work" text="No properties added." />
            ) : (
              <>
                {(showAllProps ? c.properties : c.properties.slice(0, PREVIEW)).map((p, i, arr) => (
                  <View key={p.id} style={[styles.memberRow, i < arr.length - 1 && styles.itemBorder]}>
                    <View style={[styles.memberAvatar, { backgroundColor: '#EEF2FF' }]}><Icon name="home" size={18} color="#6366F1" /></View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.memberTopRow}>
                        <Text style={styles.memberName}>{p.nickname}</Text>
                        {!!p.type && <View style={styles.relationPill}><Text style={styles.relationText}>{p.type}</Text></View>}
                      </View>
                      {!!p.address && <Text style={styles.memberMeta} numberOfLines={2}>{p.address}</Text>}
                    </View>
                  </View>
                ))}
                <ShowMore count={c.properties.length} expanded={showAllProps} onToggle={() => setShowAllProps(v => !v)} />
              </>
            )}
          </View>

          {/* Recent Requests */}
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.cardTitle}>Recent Requests</Text>
              <View style={styles.countBadge}><Text style={styles.countText}>{c.recentRequests.length}</Text></View>
            </View>
            {c.recentRequests.length === 0 ? (
              <EmptyState icon="assignment" text="No requests yet." />
            ) : (
              <>
                {(showAllReq ? c.recentRequests : c.recentRequests.slice(0, PREVIEW)).map((r, i, arr) => {
                  const pill = statusPill(r.status);
                  return (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.reqRow, i < arr.length - 1 && styles.itemBorder]}
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('TicketDetail', { ticketId: r.id })}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reqTicket}>{r.ticket}</Text>
                        <Text style={styles.reqService} numberOfLines={1}>{r.service}</Text>
                        {!!r.createdAt && <Text style={styles.reqDate}>{fmtDate(r.createdAt)}</Text>}
                      </View>
                      <View style={[styles.pill, { backgroundColor: pill.bg }]}>
                        <Text style={[styles.pillText, { color: pill.text }]}>{statusText(r.status)}</Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#CBD5E1" />
                    </TouchableOpacity>
                  );
                })}
                <ShowMore count={c.recentRequests.length} expanded={showAllReq} onToggle={() => setShowAllReq(v => !v)} />
              </>
            )}
          </View>

        </ScrollView>
      ) : null}
    </View>
  );
}

function EmptyState({ icon, text }) {
  return (
    <View style={styles.emptyState}>
      <Icon name={icon} size={28} color="#CBD5E1" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// "Show all (N) / Show less" toggle — only rendered when a list exceeds PREVIEW.
function ShowMore({ count, expanded, onToggle }) {
  if (count <= PREVIEW) return null;
  return (
    <TouchableOpacity style={styles.showMoreBtn} onPress={onToggle} activeOpacity={0.7}>
      <Text style={styles.showMoreText}>{expanded ? 'Show less' : `Show all ${count}`}</Text>
      <Icon name={expanded ? 'expand-less' : 'expand-more'} size={20} color="#2563EB" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  backIcon: { marginLeft: 6 },
  headerTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#FFFFFF' },

  centerFill: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 24 },
  errorText: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  retryBtn: { backgroundColor: '#20304C', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 16, gap: 16 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },

  profileCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', alignSelf: 'center' },
  avatarText: { color: '#2563EB', fontSize: 24, fontFamily: typography.h2.fontFamily },
  name: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#0F172A', textAlign: 'center', marginTop: 12 },
  contactLine: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 2 },

  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 16 },

  kvRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, gap: 16 },
  kvBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  kvLabel: { fontSize: 13, color: '#64748B' },
  kvValue: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', flexShrink: 1, textAlign: 'right' },

  cardTitle: { fontSize: 15, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A' },

  membershipRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  membershipIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  membershipName: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  membershipMeta: { fontSize: 13, color: '#64748B', marginTop: 2 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#6366F1' },

  itemBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#475569' },
  memberTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  relationPill: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  relationText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#6366F1' },
  memberMetaRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  memberMeta: { fontSize: 12, color: '#94A3B8' },

  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  reqTicket: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#1E293B' },
  reqService: { fontSize: 12, color: '#64748B', marginTop: 2 },
  reqDate: { fontSize: 11, color: '#94A3B8', marginTop: 3 },

  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  pillText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  emptyText: { fontSize: 13, color: '#94A3B8' },

  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  showMoreText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB' },
});

export default CustomerDetail;
