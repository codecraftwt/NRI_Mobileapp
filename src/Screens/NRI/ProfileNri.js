import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { saveUserProfile } from '../../Redux/slices/userSlice';
import { useCountries } from '../../Hooks/useCountries';
import { useStates } from '../../Hooks/useStates';
import { useDocuments } from '../../Hooks/useDocuments';
import { useWalletAccount } from '../../Hooks/useWalletAccount';
import { useReferrals } from '../../Hooks/useReferrals';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useProperties } from '../../Hooks/useProperties';

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

const LANGUAGE_OPTIONS = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'gu', label: 'Gujarati' },
  { code: 'pa', label: 'Punjabi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'bn', label: 'Bengali' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'ur', label: 'Urdu' },
];
const LANGUAGE_LABEL_BY_CODE = Object.fromEntries(LANGUAGE_OPTIONS.map(l => [l.code, l.label]));
const LANGUAGE_CODE_BY_LABEL = Object.fromEntries(LANGUAGE_OPTIONS.map(l => [l.label, l.code]));

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

function SelectField({ label, value, placeholder, options, onSelect, loading }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBox, loading && styles.selectBoxDisabled]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        disabled={loading}
      >
        {loading ? (
          <>
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text style={[styles.selectText, styles.placeholderText, { marginLeft: 8 }]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>{value || placeholder}</Text>
            <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
          </>
        )}
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => { onSelect(item); setOpen(false); }}>
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color="#1E3A8A" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function ProfileNri({ navigation }) {
  const user = useSelector(state => state.user.user);
  const dispatch = useDispatch();

  const { countryNames, loading: loadingCountries, failed: countriesFailed, retry: retryCountries } = useCountries();
  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();

  const { members: familyMembers, retry: retryFamily } = useFamilyMembers();
  const { properties, retry: retryProperties } = useProperties();
  const { documents, retry: retryDocuments } = useDocuments();
  const { balance: walletBalance, retry: retryWallet } = useWalletAccount();
  const { referralCode, retry: retryReferrals } = useReferrals();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([retryFamily(), retryProperties(), retryDocuments(), retryWallet(), retryReferrals()]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      retryFamily();
      retryProperties();
      retryDocuments();
      retryWallet();
      retryReferrals();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const [nriCountry, setNriCountry] = useState(user?.countryOfResidence || '');
  const [nriCity, setNriCity] = useState(user?.city || '');
  const [nriHomeState, setNriHomeState] = useState(user?.homeState || '');
  const [nriLanguage, setNriLanguage] = useState(LANGUAGE_LABEL_BY_CODE[user?.language] || 'English');
  const [nriTimezone, setNriTimezone] = useState(user?.timezone || TIMEZONE_BY_COUNTRY[user?.countryOfResidence] || '');
  const [savingNri, setSavingNri] = useState(false);
  const { showAlert, alertProps } = useAppAlert();

  const handleSaveNri = async () => {
    const stateId = nriHomeState ? states.find(s => s.name === nriHomeState)?.id : undefined;
    setSavingNri(true);
    try {
      await dispatch(saveUserProfile({
        nriCountry,
        nriCity,
        preferredLanguage: LANGUAGE_CODE_BY_LABEL[nriLanguage] || undefined,
        timezone: nriTimezone,
        stateId,
      })).unwrap();
      showAlert('Saved', 'Your NRI details have been updated successfully.');
    } catch (error) {
      showAlert('Could Not Save', error?.message || 'Please try again.');
    } finally {
      setSavingNri(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="NRI & Membership" showBack={true} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1E3A8A']} tintColor="#1E3A8A" />}
      >
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>NRI Details</Text>

          <SelectField
            label="NRI Country"
            value={nriCountry}
            placeholder="Select Country"
            options={countryNames}
            loading={loadingCountries}
            onSelect={(v) => {
              setNriCountry(v);
              const guessed = TIMEZONE_BY_COUNTRY[v];
              if (guessed && (!nriTimezone || nriTimezone === TIMEZONE_BY_COUNTRY[nriCountry])) {
                setNriTimezone(guessed);
              }
            }}
          />
          {countriesFailed && (
            <TouchableOpacity onPress={retryCountries}>
              <Text style={styles.retryText}>Couldn't load countries. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.inputLabel}>NRI City</Text>
          <TextInput style={styles.input} value={nriCity} onChangeText={setNriCity} placeholderTextColor="#94A3B8" />

          <SelectField
            label="Home State in India"
            value={nriHomeState}
            placeholder="Select State"
            options={stateNames}
            loading={loadingStates}
            onSelect={setNriHomeState}
          />
          {statesFailed && (
            <TouchableOpacity onPress={retryStates}>
              <Text style={styles.retryText}>Couldn't load states. Tap to retry.</Text>
            </TouchableOpacity>
          )}

          <SelectField
            label="Language"
            value={nriLanguage}
            placeholder="Select Language"
            options={LANGUAGE_OPTIONS.map(l => l.label)}
            onSelect={setNriLanguage}
          />

          <Text style={styles.inputLabel}>Timezone</Text>
          <TextInput style={styles.input} value={nriTimezone} onChangeText={setNriTimezone} placeholder="e.g. Europe/London" placeholderTextColor="#94A3B8" />

          <TouchableOpacity style={[styles.saveBtn, savingNri && styles.saveBtnDisabled]} onPress={handleSaveNri} disabled={savingNri}>
            {savingNri ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save NRI Details</Text>}
          </TouchableOpacity>

          <View style={styles.nriReadOnlyList}>
            <InfoRow label="Referral Code" value={referralCode} />
            <InfoRow label="Referred By" value={user?.referredByCode} />
            <InfoRow label="Assigned RM" value={user?.rm?.name} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Wallet Balance</Text>
          <Text style={styles.walletValue}>${Number(walletBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Active Membership</Text>
          <Text style={styles.membershipPlan}>{user?.membership || 'None'}</Text>
          {!!user?.membershipExpiry && <Text style={styles.membershipExpiry}>Expires: {user.membershipExpiry}</Text>}
        </View>

        <View style={styles.card}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.cardTitle}>Family Members ({familyMembers.length})</Text>
            <TouchableOpacity style={styles.addLinkBtn} onPress={() => navigation.navigate('AddFamilyMember')}>
              <Icon name="add" size={16} color="#1E3A8A" />
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
            <TouchableOpacity style={styles.addLinkBtn} onPress={() => navigation.navigate('Dashboard', { screen: 'AddProperty' })}>
              <Icon name="add" size={16} color="#1E3A8A" />
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
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F1F5F9'
  },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 20 },
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24, gap: 4,
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
    borderWidth: 1, borderColor: '#E0E7FF'
  },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52, fontSize: 16, color: '#0F172A' },
  fieldWrap: { gap: 0 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 16, paddingHorizontal: 16, height: 52 },
  selectBoxDisabled: { backgroundColor: '#E2E8F0' },
  selectText: { fontSize: 16, color: '#0F172A', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  retryText: { fontSize: 13, color: '#DC2626', marginTop: 8, marginBottom: 4 },
  saveBtn: { backgroundColor: '#A64416', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 32, paddingTop: 12 },
  modalHandle: { width: 48, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 16, color: '#1E293B' },
  infoList: { alignSelf: 'stretch' },
  nriReadOnlyList: { alignSelf: 'stretch', marginTop: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  infoLabel: { fontSize: 14, color: '#64748B' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24,
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
    borderWidth: 1, borderColor: '#E0E7FF'
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  walletValue: { fontSize: 24, fontWeight: '800', color: '#10B981', marginTop: 12 },
  membershipPlan: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  membershipExpiry: { fontSize: 14, color: '#64748B', marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1E3A8A', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginTop: 16, justifyContent: 'center' },
  actionBtnAmber: { borderColor: '#F59E0B' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#1E3A8A' },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#1E3A8A', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  addLinkText: { fontSize: 13, fontWeight: '600', color: '#1E3A8A' },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12 },
  listRow: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 8, gap: 6 },
  listRowName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  listRowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listRowMeta: { fontSize: 13, color: '#64748B' },
  relationPill: { backgroundColor: '#EFF6FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  relationPillText: { fontSize: 12, fontWeight: '600', color: '#1E3A8A' },
});
