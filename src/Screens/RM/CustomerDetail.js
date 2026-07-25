import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const PROFILE_INFO = [
  { label: 'NRI Country', value: 'United States' },
  { label: 'NRI City', value: 'Acalanes Ridge' },
  { label: 'Language', value: 'EN' },
  { label: 'Timezone', value: 'Asia/Kolkata' },
  { label: 'Referral Code', value: '7LPWKZK8', accent: true },
  { label: 'Referred By', value: '—' },
  { label: 'Assigned RM', value: 'Relationship Manager' },
];

const FAMILY_MEMBERS = [
  { id: '1', name: 'abc', relation: 'Parent', phone: '—', location: '—' },
];

const PROPERTIES = [];
const DOCUMENTS = [];

function CustomerDetail({ navigation, route }) {
  const name = route?.params?.name || 'Test';
  const email = route?.params?.email || 'veratol241@jobraux.com';
  const phone = route?.params?.phone || '9898989898';
  const initials = name.trim().slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Customer Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.contactLine}>{email}</Text>
          <Text style={styles.contactLine}>{phone}</Text>

          <View style={styles.divider} />

          {PROFILE_INFO.map((item, idx) => (
            <View key={item.label} style={[styles.kvRow, idx < PROFILE_INFO.length - 1 && styles.kvBorder]}>
              <Text style={styles.kvLabel}>{item.label}</Text>
              <Text style={[styles.kvValue, item.accent && styles.kvAccent]} numberOfLines={1}>{item.value}</Text>
            </View>
          ))}
        </View>

        {/* Wallet Balance */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wallet Balance</Text>
          <Text style={styles.walletAmount}>₹0.00</Text>
        </View>

        {/* Active Membership */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Membership</Text>
          <View style={styles.membershipRow}>
            <View style={styles.membershipIconBg}>
              <Icon name="card-membership" size={22} color="#059669" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.membershipName}>Membership</Text>
              <Text style={styles.membershipMeta}>Expires: 24 Jul 2027</Text>
            </View>
          </View>
        </View>

        {/* Family Members */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.cardTitle}>Family Members</Text>
            <View style={styles.countBadge}><Text style={styles.countText}>{FAMILY_MEMBERS.length}</Text></View>
          </View>

          {FAMILY_MEMBERS.length === 0 ? (
            <EmptyState icon="group-off" text="No family members added." />
          ) : (
            FAMILY_MEMBERS.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{m.name.charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <View style={styles.memberTopRow}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <View style={styles.relationPill}><Text style={styles.relationText}>{m.relation}</Text></View>
                  </View>
                  <View style={styles.memberMetaRow}>
                    <View style={styles.metaItem}>
                      <Icon name="phone" size={13} color="#94A3B8" />
                      <Text style={styles.memberMeta}>{m.phone}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Icon name="location-on" size={13} color="#94A3B8" />
                      <Text style={styles.memberMeta}>{m.location}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.memberActions}>
                  <TouchableOpacity style={[styles.iconBtn, { borderColor: '#BFDBFE' }]} activeOpacity={0.7}>
                    <Icon name="edit" size={16} color="#2563EB" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconBtn, { borderColor: '#FCA5A5' }]} activeOpacity={0.7}>
                    <Icon name="delete-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

      </ScrollView>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#FFFFFF' },
  commLogBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 18, paddingHorizontal: 12, paddingVertical: 7 },
  commLogText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },

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
  kvAccent: { color: '#D94625' },

  cardTitle: { fontSize: 15, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A' },
  walletAmount: { fontSize: 30, fontFamily: typography.h2.fontFamily, color: '#059669', textAlign: 'center', marginTop: 14 },

  membershipRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  membershipIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#D1FAE5', justifyContent: 'center', alignItems: 'center' },
  membershipName: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  membershipMeta: { fontSize: 13, color: '#64748B', marginTop: 2 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center' },
  countText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#6366F1' },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#475569' },
  memberTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberName: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  relationPill: { backgroundColor: '#EEF2FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  relationText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#6366F1' },
  memberMetaRow: { flexDirection: 'row', gap: 16, marginTop: 4 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  memberMeta: { fontSize: 12, color: '#94A3B8' },
  memberActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  emptyText: { fontSize: 13, color: '#94A3B8' },
});

export default CustomerDetail;
