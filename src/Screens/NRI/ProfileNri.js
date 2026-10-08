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
import { useStates } from '../../Hooks/useStates';
import { useDocuments } from '../../Hooks/useDocuments';
import { useWalletAccount } from '../../Hooks/useWalletAccount';
import { useReferrals } from '../../Hooks/useReferrals';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useProperties } from '../../Hooks/useProperties';
import { useBilling } from '../../Hooks/useBilling';
import { useMembership } from '../../Hooks/useMembership';
import { useServiceSubscription } from '../../Hooks/useServiceSubscription';
import { useMyAddonPackages } from '../../Hooks/useMyAddonPackages';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatUsd(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

  const { states, stateNames, loading: loadingStates, failed: statesFailed, retry: retryStates } = useStates();

  const { members: familyMembers, retry: retryFamily } = useFamilyMembers();
  const { properties, retry: retryProperties } = useProperties();
  const { documents, retry: retryDocuments } = useDocuments();

  const { overview, retry: retryBilling, stopAutoRenew, stopAutoRenewLoading, cancelAllSubscriptions, cancelAllLoading } = useBilling();
  const { membership, retry: retryMembership } = useMembership();
  const { cancelSubscription: cancelAddonSubscription } = useMyAddonPackages();
  const {
    subscriptions: serviceSubscriptions,
    fetchSubscriptions,
    cancelSubscription: cancelServiceSubAutoRenew,
  } = useServiceSubscription();

  const [cancelingAddonId, setCancelingAddonId] = useState(null);
  const [cancelingServiceSubId, setCancelingServiceSubId] = useState(null);

  // Collapse the family list to the first 3 by default; the rest is behind a
  // Show more / Show less toggle.
  const [showAllFamily, setShowAllFamily] = useState(false);
  const FAMILY_PREVIEW_COUNT = 3;
  const visibleFamily = showAllFamily ? familyMembers : familyMembers.slice(0, FAMILY_PREVIEW_COUNT);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      retryFamily(),
      retryProperties(),
      retryDocuments(),
      retryMembership(),
      fetchSubscriptions(),
      retryBilling(),
    ]);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      retryFamily();
      retryProperties();
      retryDocuments();
      retryMembership();
      fetchSubscriptions();
      retryBilling();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleStopMembershipAutoRenew = (mem) => {
    showAlert('Stop Auto-Renewal', `Stop auto-renewal for ${mem.planName || 'Membership'}? It stays active until it expires.`, [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Stop Renewal',
        style: 'destructive',
        onPress: () => {
          stopAutoRenew(mem.id)
            .unwrap()
            .then(() => {
              retryMembership();
              retryBilling();
            })
            .catch((error) => {
              showAlert('Failed', error?.message || 'Could not stop auto-renewal.');
            });
        },
      },
    ]);
  };

  const handleStopAddonAutoRenew = (sub) => {
    showAlert('Stop Auto-Renewal', `Stop auto-renewal for ${sub.packageName}?`, [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Stop Renewal',
        style: 'destructive',
        onPress: () => {
          setCancelingAddonId(sub.id);
          cancelAddonSubscription(sub.id)
            .unwrap()
            .then(() => {
              retryBilling();
            })
            .catch((error) => {
              showAlert('Failed', error?.message || 'Could not stop auto-renewal.');
            })
            .finally(() => setCancelingAddonId(null));
        },
      },
    ]);
  };

  const handleStopServiceSubAutoRenew = (sub) => {
    const label = (sub.services || []).map(s => s.name).join(', ') || 'this subscription';
    showAlert('Stop Auto-renewal', `Stop auto-renewal for ${label}? It stays active until the current period ends.`, [
      { text: 'Keep It', style: 'cancel' },
      {
        text: 'Stop Renewal',
        style: 'destructive',
        onPress: () => {
          setCancelingServiceSubId(sub.id);
          cancelServiceSubAutoRenew(sub.id)
            .unwrap()
            .then(() => {
              fetchSubscriptions();
            })
            .catch((error) => {
              showAlert('Failed', error?.message || 'Could not stop auto-renewal.');
            })
            .finally(() => setCancelingServiceSubId(null));
        },
      },
    ]);
  };

  const handleCancelAll = () => {
    showAlert(
      'Cancel All Subscriptions',
      'Stop auto-renewal on your membership and every recurring service subscription in one go? Everything stays active until its own paid period ends.',
      [
        { text: 'Keep Them', style: 'cancel' },
        {
          text: 'Cancel All',
          style: 'destructive',
          onPress: () => {
            cancelAllSubscriptions()
              .unwrap()
              .then((result) => {
                const failedMembership = result.membership && result.membership.status !== 'cancelled' ? result.membership : null;
                const failedSubs = (result.serviceSubscriptions || []).filter(s => s.status !== 'cancelled');

                if (failedMembership || failedSubs.length) {
                  showAlert('Partially Completed', [
                    failedMembership ? `Membership: ${failedMembership.status}` : null,
                    ...failedSubs.map(s => `${s.label}: ${s.status}`),
                  ].filter(Boolean).join('\n') || 'Some subscriptions could not be cancelled. Please try again or contact support.');
                } else {
                  showAlert('Done', result.message || 'Auto-renewal stopped.');
                }

                retryBilling();
                retryMembership();
                fetchSubscriptions();
              })
              .catch((error) => {
                showAlert('Failed', error?.message || 'Could not cancel subscriptions.');
              });
          },
        },
      ]
    );
  };

  const autoRenewingAddons = (overview?.addonSubscriptions || []).filter(s => s.autoRenew);
  const autoRenewingServiceSubs = (serviceSubscriptions || []).filter(s => s.autoRenew);
  const visibleServiceSubs = (serviceSubscriptions || []).filter(s => s.status === 'active');
  const hasAutoRenewals = !!membership?.autoRenew || autoRenewingAddons.length > 0 || autoRenewingServiceSubs.length > 0;
  const visibleMembership = membership && membership.status === 'active' ? membership : null;
  const membershipPriceDisplay = visibleMembership?.paidAmountDisplay
    || (visibleMembership?.price != null ? formatUsd(visibleMembership.price) : null);

  // Display-only — sourced from the account, not editable on this screen.
  const nriCountry = user?.countryOfResidence || '';
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

          {/* NRI Country is display-only — set at registration, not editable here. */}
          <Text style={styles.inputLabel}>NRI Country</Text>
          <View style={[styles.selectBox, styles.selectBoxDisabled]}>
            <Text style={[styles.selectText, !nriCountry && styles.placeholderText]} numberOfLines={1}>
              {nriCountry || '—'}
            </Text>
          </View>

          <Text style={styles.inputLabel}>NRI City</Text>
          <TextInput style={styles.input} value={nriCity} onChangeText={setNriCity} placeholderTextColor="#94A3B8" />

          {/* <SelectField
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
          )} */}

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
        </View>

        {hasAutoRenewals && (
          <View style={styles.cancelAllCard}>
            <View style={styles.cancelAllHeaderRow}>
              <Icon name="highlight-off" size={18} color="#EF4444" />
              <Text style={styles.cancelAllTitle}>Cancel All Subscriptions</Text>
            </View>
            <TouchableOpacity style={styles.cancelAllBtn} onPress={handleCancelAll} disabled={cancelAllLoading}>
              {cancelAllLoading ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.cancelAllBtnText}>Cancel All Subscriptions</Text>}
            </TouchableOpacity>
            <Text style={styles.cancelAllDesc}>
              Stops auto-renewal on your membership and every recurring service subscription in one go. Everything stays active until its own paid period ends.
            </Text>
          </View>
        )}

        {visibleMembership ? (
          <View style={styles.autoRenewCard}>
            <View style={styles.autoRenewHeaderRow}>
              <Icon name="autorenew" size={18} color="#10B981" />
              <Text style={styles.sectionTitle}>Membership Auto-renewal</Text>
            </View>
            <View style={styles.autoRenewRow}>
              <View style={styles.autoRenewInfo}>
                <Text style={styles.autoRenewName}>{visibleMembership.planName || user?.membership || 'Membership'}</Text>
                <Text style={styles.autoRenewMeta}>
                  {membershipPriceDisplay != null && (
                    <Text style={styles.autoRenewPriceInline}>
                      {membershipPriceDisplay}/yr{visibleMembership.endDate ? '  ·  ' : ''}
                    </Text>
                  )}
                  {!!visibleMembership.endDate && (
                    visibleMembership.autoRenew
                      ? `Auto-renews on ${formatDate(visibleMembership.endDate)}`
                      : `Active until ${formatDate(visibleMembership.endDate)} — stopped`
                  )}
                </Text>
              </View>
              {visibleMembership.autoRenew && (
                <TouchableOpacity style={styles.stopRenewBtn} onPress={() => handleStopMembershipAutoRenew(visibleMembership)} disabled={stopAutoRenewLoading}>
                  {stopAutoRenewLoading ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.stopRenewBtnText}>Stop Auto-renewal</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Active Membership</Text>
            <Text style={styles.membershipPlan}>{user?.membership || 'None'}</Text>
            {!!user?.membershipExpiry && <Text style={styles.membershipExpiry}>Expires: {user.membershipExpiry}</Text>}
          </View>
        )}

        {visibleServiceSubs.length > 0 && (
          <View style={styles.autoRenewCard}>
            <View style={styles.autoRenewHeaderRow}>
              <Icon name="autorenew" size={18} color="#10B981" />
              <Text style={styles.sectionTitle}>Service Subscriptions</Text>
            </View>
            {visibleServiceSubs.map(sub => (
              <View key={sub.id} style={styles.autoRenewRow}>
                <View style={styles.autoRenewInfo}>
                  <Text style={styles.autoRenewName}>{(sub.services || []).map(s => s.name).join(', ') || 'Service subscription'}</Text>
                  <Text style={styles.autoRenewMeta}>
                    {sub.amount != null && (
                      <Text style={styles.autoRenewPriceInline}>
                        {formatUsd(sub.amount)}{sub.billingInterval ? `/${sub.billingInterval}` : ''}
                        {sub.currentPeriodEndsAt ? '  ·  ' : ''}
                      </Text>
                    )}
                    {!!sub.currentPeriodEndsAt && (
                      sub.autoRenew ? `Auto-renews on ${formatDate(sub.currentPeriodEndsAt)}` : `Active until ${formatDate(sub.currentPeriodEndsAt)} — stopped`
                    )}
                  </Text>
                </View>
                {sub.autoRenew && (
                  <TouchableOpacity style={styles.stopRenewBtn} onPress={() => handleStopServiceSubAutoRenew(sub)} disabled={cancelingServiceSubId === sub.id}>
                    {cancelingServiceSubId === sub.id ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.stopRenewBtnText}>Stop Auto-renewal</Text>}
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {autoRenewingAddons.length > 0 && (
          <View style={styles.autoRenewCard}>
            <View style={styles.autoRenewHeaderRow}>
              <Icon name="autorenew" size={18} color="#10B981" />
              <Text style={styles.sectionTitle}>Add-on Subscriptions</Text>
            </View>
            {autoRenewingAddons.map(sub => (
              <View key={sub.id} style={styles.autoRenewRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.autoRenewName}>
                    {sub.packageName} <Text style={styles.autoRenewType}>(monthly add-on)</Text>
                  </Text>
                  <Text style={styles.autoRenewMeta}>
                    {sub.currentPeriodEndsAt ? `Auto-renews on ${formatDate(sub.currentPeriodEndsAt)}` : `Status: ${sub.status}`}
                  </Text>
                </View>
                <TouchableOpacity style={styles.stopRenewBtn} onPress={() => handleStopAddonAutoRenew(sub)} disabled={cancelingAddonId === sub.id}>
                  {cancelingAddonId === sub.id ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.stopRenewBtnText}>Stop Auto-renewal</Text>}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.listHeaderRow}>
            <Text style={styles.cardTitle}>Family Members ({familyMembers.length})</Text>
          </View>
          {familyMembers.length === 0 ? (
            <Text style={styles.emptyText}>No family members added yet.</Text>
          ) : (
            visibleFamily.map(m => (
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
          {familyMembers.length > FAMILY_PREVIEW_COUNT && (
            <TouchableOpacity style={styles.showMoreBtn} onPress={() => setShowAllFamily(v => !v)} activeOpacity={0.7}>
              <Text style={styles.showMoreText}>
                {showAllFamily ? 'Show less' : `Show ${familyMembers.length - FAMILY_PREVIEW_COUNT} more`}
              </Text>
              <Icon name={showAllFamily ? 'expand-less' : 'expand-more'} size={18} color="#1E3A8A" />
            </TouchableOpacity>
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
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 24,
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
    borderWidth: 1, borderColor: '#E0E7FF'
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  membershipPlan: { fontSize: 18, fontWeight: '700', color: '#0F172A', marginTop: 12 },
  membershipExpiry: { fontSize: 14, color: '#64748B', marginTop: 4 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#1E3A8A', backgroundColor: '#FFFFFF', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, marginTop: 16, justifyContent: 'center' },
  actionBtnAmber: { borderColor: '#F59E0B' },
  actionBtnText: { fontSize: 15, fontWeight: '600', color: '#1E3A8A' },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: '#1E3A8A', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  addLinkText: { fontSize: 13, fontWeight: '600', color: '#1E3A8A' },
  emptyText: { fontSize: 14, color: '#94A3B8', marginTop: 12 },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 12, paddingVertical: 8 },
  showMoreText: { fontSize: 14, fontWeight: '600', color: '#1E3A8A' },
  listRow: { paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 8, gap: 6 },
  listRowName: { fontSize: 15, fontWeight: '600', color: '#0F172A' },
  listRowMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listRowMeta: { fontSize: 13, color: '#64748B' },
  relationPill: { backgroundColor: '#EFF6FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  relationPillText: { fontSize: 12, fontWeight: '600', color: '#1E3A8A' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  cancelAllCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cancelAllHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancelAllTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  cancelAllBtn: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#EF4444', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginTop: 12 },
  cancelAllBtnText: { fontSize: 13, fontWeight: '600', color: '#EF4444' },
  cancelAllDesc: { fontSize: 13, color: '#64748B', marginTop: 10, lineHeight: 18 },
  autoRenewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  autoRenewHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  autoRenewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  autoRenewInfo: { flex: 1, gap: 2 },
  autoRenewName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  autoRenewType: { fontSize: 13, fontWeight: '500', color: '#64748B' },
  autoRenewMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  autoRenewPriceInline: { fontWeight: '700', color: '#20304C' },
  stopRenewBtn: { borderWidth: 1, borderColor: '#EF4444', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  stopRenewBtnText: { fontSize: 12, fontWeight: '600', color: '#EF4444' },
});
