import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, FlatList, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
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
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.selectText, styles.placeholderText, { marginLeft: 8 }]}>Loading…</Text>
          </>
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.placeholderText]} numberOfLines={1}>{value || placeholder}</Text>
            <Icon name="keyboard-arrow-down" size={20} color={colors.textSecondary} />
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
                  {item === value && <Icon name="check" size={18} color={colors.primary} />}
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
      Alert.alert('Saved', 'Your NRI details have been updated successfully.');
    } catch (error) {
      Alert.alert('Could Not Save', error?.message || 'Please try again.');
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
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
          <TextInput style={styles.input} value={nriCity} onChangeText={setNriCity} placeholderTextColor={colors.textPlaceholder} />

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
          <TextInput style={styles.input} value={nriTimezone} onChangeText={setNriTimezone} placeholder="e.g. Europe/London" placeholderTextColor={colors.textPlaceholder} />

          <TouchableOpacity style={[styles.saveBtn, savingNri && styles.saveBtnDisabled]} onPress={handleSaveNri} disabled={savingNri}>
            {savingNri ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={styles.saveBtnText}>Save NRI Details</Text>}
          </TouchableOpacity>

          <View style={styles.nriReadOnlyList}>
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
          <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Family')}>
            <Icon name="people" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Manage Family ({familyMembers.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnAmber]} onPress={() => navigation.navigate('Dashboard', { screen: 'Properties' })}>
            <Icon name="home" size={18} color={colors.warning} />
            <Text style={[styles.actionBtnText, { color: colors.warning }]}>Manage Properties ({properties.length})</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.cardTitle}>Family Members ({familyMembers.length})</Text>
            <TouchableOpacity style={styles.addLinkBtn} onPress={() => navigation.navigate('Family', { screen: 'AddFamilyMember' })}>
              <Icon name="add" size={16} color={colors.primary} />
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
              <Icon name="add" size={16} color={colors.primary} />
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
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, gap: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  inputLabel: { ...typography.labelMedium, color: colors.textSecondary, marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, height: 50, ...typography.body, color: colors.textPrimary },
  fieldWrap: { gap: 0 },
  selectBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, height: 50 },
  selectBoxDisabled: { backgroundColor: colors.surfaceSecondary },
  selectText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  placeholderText: { color: colors.textPlaceholder },
  retryText: { ...typography.labelMedium, color: colors.error, marginTop: 8, marginBottom: 4 },
  saveBtn: { backgroundColor: colors.primary, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', marginTop: 24 },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { color: colors.onPrimary, ...typography.labelLarge },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '60%', paddingBottom: 32, paddingTop: 12 },
  modalHandle: { width: 48, height: 5, borderRadius: 3, backgroundColor: colors.border, alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h4, color: colors.textPrimary, paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.surfaceSecondary },
  modalOptionText: { ...typography.body, color: colors.textPrimary },
  infoList: { alignSelf: 'stretch' },
  nriReadOnlyList: { alignSelf: 'stretch', marginTop: 20 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.surfaceSecondary },
  infoLabel: { ...typography.body, color: colors.textSecondary },
  infoValue: { ...typography.labelLarge, color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  cardTitle: { ...typography.h4, color: colors.textPrimary },
  walletValue: { ...typography.h2, color: colors.success, marginTop: 12 },
  membershipPlan: { ...typography.h3, color: colors.textPrimary, marginTop: 12 },
  membershipExpiry: { ...typography.body, color: colors.textSecondary, marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginTop: 16, justifyContent: 'center' },
  actionBtnAmber: { borderColor: colors.warning },
  actionBtnText: { ...typography.labelLarge },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  addLinkText: { ...typography.labelMedium, color: colors.primary },
  emptyText: { ...typography.body, color: colors.textPlaceholder, marginTop: 12 },
  listRow: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: colors.surfaceSecondary, marginTop: 8, gap: 6 },
  listRowName: { ...typography.labelLarge, color: colors.textPrimary },
  listRowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listRowMeta: { ...typography.labelMedium, color: colors.textSecondary },
  relationPill: { backgroundColor: colors.surfaceSecondary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  relationPillText: { ...typography.labelMedium, color: colors.primary },
});
