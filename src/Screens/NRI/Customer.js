import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useDocuments } from '../../Hooks/useDocuments';
import { useWalletAccount } from '../../Hooks/useWalletAccount';
import { useReferrals } from '../../Hooks/useReferrals';

const PROPERTY_TYPE_LABELS = { flat: 'Flat', house: 'House', farm: 'Farm / Agricultural Land', commercial: 'Commercial', plot: 'Plot' };

const DOCUMENT_TYPE_LABELS = {
  passport: 'Passport',
  pan_card: 'PAN Card',
  aadhaar_card: 'Aadhaar Card',
  property_papers: 'Property Papers',
  will: 'Will',
  power_of_attorney: 'Power of Attorney',
  insurance_policy: 'Insurance Policy',
  other: 'Other',
};

const TIMEZONE_BY_COUNTRY = {
  'United States': 'America/New_York',
  'United Kingdom': 'Europe/London',
  UAE: 'Asia/Dubai',
  Canada: 'America/Toronto',
  Australia: 'Australia/Sydney',
  Singapore: 'Asia/Singapore',
  Qatar: 'Asia/Qatar',
  'Saudi Arabia': 'Asia/Riyadh',
  Germany: 'Europe/Berlin',
  Greece: 'Europe/Athens',
};

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

function Customer({ navigation }) {
  const user = useSelector(state => state.user.user);
  const familyMembers = useSelector(state => state.family.members);
  const properties = useSelector(state => state.properties.properties);
  const { documents } = useDocuments();
  const { balance: walletBalance } = useWalletAccount();
  const { referralCode } = useReferrals();

  const initials = (user?.name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const timezone = TIMEZONE_BY_COUNTRY[user?.countryOfResidence] || '—';

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Customer" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Customer'}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.infoList}>
            <InfoRow label="NRI Country" value={user?.countryOfResidence} />
            <InfoRow label="NRI City" value={user?.city} />
            <InfoRow label="Language" value={user?.language} />
            <InfoRow label="Timezone" value={timezone} />
            <InfoRow label="Referral Code" value={referralCode} />
            <InfoRow label="Referred By" value={user?.referredByCode} />
            <InfoRow label="Assigned RM" value={user?.rm?.name} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wallet Balance</Text>
          <Text style={styles.walletValue}>₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Membership</Text>
          <Text style={styles.membershipPlan}>{user?.membership || 'None'}</Text>
          {!!user?.membershipExpiry && <Text style={styles.membershipExpiry}>Expires: {user.membershipExpiry}</Text>}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Profile')}>
            <Icon name="edit" size={16} color="#007AFF" />
            <Text style={[styles.actionBtnText, { color: '#007AFF' }]}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnTeal]} onPress={() => navigation.navigate('Family')}>
            <Icon name="people" size={16} color="#0891B2" />
            <Text style={[styles.actionBtnText, { color: '#0891B2' }]}>Manage Family ({familyMembers.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAmber]} onPress={() => navigation.navigate('Properties')}>
            <Icon name="home" size={16} color="#D97706" />
            <Text style={[styles.actionBtnText, { color: '#D97706' }]}>Manage Properties ({properties.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.cardTitle}>Family Members ({familyMembers.length})</Text>
            <TouchableOpacity style={styles.addLinkBtn} onPress={() => navigation.navigate('AddFamilyMember')}>
              <Icon name="add" size={14} color="#007AFF" />
              <Text style={styles.addLinkText}>Add</Text>
            </TouchableOpacity>
          </View>
          {familyMembers.length === 0 ? (
            <Text style={styles.emptyText}>No family members added yet.</Text>
          ) : (
            familyMembers.map(m => (
              <View key={m.id} style={styles.listRow}>
                <Text style={styles.listRowName}>{m.name}</Text>
                <View style={styles.listRowMetaRow}>
                  <View style={styles.relationPill}>
                    <Text style={styles.relationPillText}>{m.relationship}</Text>
                  </View>
                  <Text style={styles.listRowMeta}>{m.phone}</Text>
                </View>
                <Text style={styles.listRowMeta}>{[m.cityName, m.stateName].filter(Boolean).join(', ')}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.cardTitle}>Properties ({properties.length})</Text>
            <TouchableOpacity style={styles.addLinkBtn} onPress={() => navigation.navigate('AddProperty')}>
              <Icon name="add" size={14} color="#007AFF" />
              <Text style={styles.addLinkText}>Add</Text>
            </TouchableOpacity>
          </View>
          {properties.length === 0 ? (
            <Text style={styles.emptyText}>No properties added yet.</Text>
          ) : (
            properties.map(p => (
              <View key={p.id} style={styles.listRow}>
                <Text style={styles.listRowName}>{p.nickname}</Text>
                <View style={styles.relationPill}>
                  <Text style={styles.relationPillText}>{PROPERTY_TYPE_LABELS[p.type] || p.type}</Text>
                </View>
                <Text style={styles.listRowMeta}>{p.address}</Text>
                {!!p.tenantName && <Text style={styles.listRowMeta}>Tenant: {p.tenantName}</Text>}
              </View>
            ))
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Documents ({documents.length})</Text>
          {documents.length === 0 ? (
            <Text style={styles.emptyText}>No documents uploaded yet.</Text>
          ) : (
            documents.map(doc => (
              <View key={doc.id} style={styles.listRow}>
                <Text style={styles.listRowName}>{doc.documentName}</Text>
                <View style={styles.listRowMetaRow}>
                  <View style={styles.relationPill}>
                    <Text style={styles.relationPillText}>{DOCUMENT_TYPE_LABELS[doc.documentType] || doc.documentType}</Text>
                  </View>
                  <Text style={styles.listRowMeta}>Expiry: {doc.expiryDate || '—'}</Text>
                </View>
                <Text style={styles.listRowMeta}>{doc.sharedWithRm ? 'Shared with RM' : 'Not shared with RM'}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  profileCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#E5F1FF', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#007AFF' },
  name: { fontSize: 17, fontWeight: 'bold', color: '#1E293B' },
  email: { fontSize: 12.5, color: '#6B7280', marginTop: 2 },
  infoList: { alignSelf: 'stretch', marginTop: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  infoLabel: { fontSize: 12.5, color: '#6B7280' },
  infoValue: { fontSize: 12.5, color: '#1E293B', fontWeight: '600' },
  card: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  walletValue: { fontSize: 24, fontWeight: 'bold', color: '#10B981', marginTop: 8 },
  membershipPlan: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginTop: 8 },
  membershipExpiry: { fontSize: 12.5, color: '#6B7280', marginTop: 2 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#F0F7FF', borderRadius: 8, paddingVertical: 11, paddingHorizontal: 12, marginTop: 10, justifyContent: 'center' },
  actionBtnTeal: { borderColor: '#A5F3FC', backgroundColor: '#ECFEFF' },
  actionBtnAmber: { borderColor: '#FDE68A', backgroundColor: '#FFFBEB' },
  actionBtnText: { fontSize: 13, fontWeight: '700' },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  addLinkText: { fontSize: 12, color: '#007AFF', fontWeight: '700' },
  emptyText: { fontSize: 12.5, color: '#9CA3AF', marginTop: 10 },
  listRow: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6', marginTop: 4, gap: 4 },
  listRowName: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  listRowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listRowMeta: { fontSize: 12, color: '#6B7280' },
  relationPill: { backgroundColor: '#E5F1FF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  relationPillText: { fontSize: 10.5, color: '#007AFF', fontWeight: '700' },
});

export default Customer;
