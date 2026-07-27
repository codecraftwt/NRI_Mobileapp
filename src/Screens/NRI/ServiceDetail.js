import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useServiceGroups } from '../../Hooks/useServiceGroups';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';
import { setServiceLocation } from '../../Redux/slices/serviceLocationSlice';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme';

// Labelled select that opens a searchable bottom-sheet list of options.
function LocationSelect({ label, value, placeholder, options, disabled, loading, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const close = () => { setOpen(false); setQuery(''); };
  const filtered = query.trim()
    ? options.filter(o => o.toLowerCase().includes(query.trim().toLowerCase()))
    : options;

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={styles.selectLabel}>{label}</Text>
      <TouchableOpacity
        style={[styles.selectBox, (disabled || loading) && styles.selectBoxDisabled]}
        disabled={disabled || loading}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Text style={[styles.selectText, !value && styles.selectPlaceholder]} numberOfLines={1}>
              {value || placeholder}
            </Text>
            <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
          </>
        )}
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={close}>
          <TouchableOpacity style={styles.optionSheet} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <View style={styles.sheetSearchBox}>
              <Icon name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.sheetSearchInput}
                placeholder={`Search ${label.toLowerCase()}...`}
                placeholderTextColor="#94A3B8"
                value={query}
                onChangeText={setQuery}
                autoCorrect={false}
              />
              {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="close" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {filtered.length === 0 ? (
                <Text style={styles.sheetEmpty}>No matches found.</Text>
              ) : (
                filtered.map(item => (
                  <TouchableOpacity key={item} style={styles.sheetOption} onPress={() => { onSelect(item); close(); }}>
                    <Text style={styles.sheetOptionText}>{item}</Text>
                    {item === value && <Icon name="check" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// Pricing must display in USD (customer_price), not the ₹ display_price.
// On the Recurring tab, show the monthly recurring_price instead of the
// one-time customer_price.
const formatUsd = (pricing, recurring = false) => {
  if (!pricing) return '';
  if (pricing.isQuoted) return 'On quote';
  if (recurring) {
    // Prefer the server-formatted string ("$20.69/monthly") when present.
    if (pricing.recurringDisplayPrice) return pricing.recurringDisplayPrice;
    const amount = `$${Number(pricing.recurringPrice ?? 0).toFixed(2)}`;
    return pricing.billingInterval ? `${amount}/${pricing.billingInterval}` : amount;
  }
  const amount = `$${Number(pricing.customerPrice ?? 0).toFixed(2)}`;
  return pricing.unit ? `${amount}/${pricing.unit}` : amount;
};

function ServiceDetail({ route, navigation }) {
  const { category } = route.params;
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('oneTime'); // 'oneTime' or 'recurring'
  // Each tab keeps its own selection — a service that exists in BOTH the
  // one-time and recurring lists must not appear selected in the other tab.
  const [oneTimeIds, setOneTimeIds] = useState([]);
  const [recurringIds, setRecurringIds] = useState([]);

  // Active location — seeded from the route params (the location chosen on the
  // Services screen), but editable here via the "Change" banner below.
  const [loc, setLoc] = useState({
    stateName: route.params?.stateName || '',
    cityName: route.params?.cityName || '',
    cityId: route.params?.cityId || null,
  });
  const { stateName, cityName, cityId } = loc;

  // Location-change modal.
  const [locModalOpen, setLocModalOpen] = useState(false);
  const [selState, setSelState] = useState('');
  const [selCity, setSelCity] = useState('');
  const { stateNames, loading: loadingStates } = useStates();
  const { cities, cityNames, loading: loadingCities } = useCities(selState);
  const selCityId = selCity ? cities.find(c => c.name === selCity)?.id : null;
  const canSaveLoc = !!(selState && selCity && selCityId);

  const openLocModal = () => {
    setSelState(stateName);
    setSelCity(cityName);
    setLocModalOpen(true);
  };

  const handleSaveLocation = () => {
    if (!canSaveLoc) return;
    const next = { stateName: selState, cityName: selCity, cityId: selCityId };
    dispatch(setServiceLocation(next)); // persist as the new default
    setLoc(next);
    // Selections belong to the old city's services — clear them.
    setOneTimeIds([]);
    setRecurringIds([]);
    setLocModalOpen(false);
  };

  // One-time (allows_single_use) and recurring (allows_recurring) services,
  // priced for the chosen city so vendor availability flags are populated.
  const { oneTime, recurring, loading } = useServiceGroups(category.name, stateName, cityId);

  const selectedIds = activeTab === 'oneTime' ? oneTimeIds : recurringIds;

  // A service is bookable in this city when its vendor-availability flag isn't
  // explicitly false (false = no vendor covers it here → can't book, would 422
  // at checkout). Use the boolean flags, not display_price string-matching.
  const isBookable = (s) => activeTab === 'recurring'
    ? s.pricing?.recurringVendorPriced !== false
    : s.pricing?.vendorPriced !== false;

  // Only surface services actually available in the chosen city; hide the rest.
  const services = (activeTab === 'oneTime' ? oneTime : recurring).filter(isBookable);

  // Holds the pending selection while the switch-type confirmation is shown:
  // { id, otherLabel, count } — null when the dialog is closed.
  const [switchPrompt, setSwitchPrompt] = useState(null);

  const toggleService = (id) => {
    const setIds = activeTab === 'oneTime' ? setOneTimeIds : setRecurringIds;
    const isSelected = selectedIds.includes(id);
    const service = services.find(s => s.id === id);
    // Guard: never let a not-available-in-this-city service be selected.
    if (!isSelected && service && !isBookable(service)) return;
    const otherIds = activeTab === 'oneTime' ? recurringIds : oneTimeIds;

    // A single booking can't mix one-time and recurring services. If the other
    // tab already has picks, ask before switching type (clearing the other).
    if (!isSelected && otherIds.length > 0) {
      setSwitchPrompt({
        id,
        otherLabel: activeTab === 'oneTime' ? 'recurring' : 'one-time',
        count: otherIds.length,
      });
      return;
    }

    setIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const confirmSwitch = () => {
    if (!switchPrompt) return;
    const { id } = switchPrompt;
    const setIds = activeTab === 'oneTime' ? setOneTimeIds : setRecurringIds;
    const clearOther = activeTab === 'oneTime' ? setRecurringIds : setOneTimeIds;
    clearOther([]);
    setIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setSwitchPrompt(null);
  };

  const handleBook = () => {
    if (activeTab === 'recurring') {
      navigation.navigate('CreateTicket', {
        initialCategory: category.name,
        requestType: 'recurring',
        initialSubscriptionServiceIds: recurringIds,
        initialState: stateName,
        initialCity: cityName,
        initialCityId: cityId,
      });
      return;
    }
    // Every service picked in the One-Time list is a full service, priced as
    // the base service + extra_services — NOT as add-ons. Sending the extras
    // as add-ons made the quote ignore them, so only the first service's rate
    // showed under Estimated Charges.
    navigation.navigate('CreateTicket', {
      initialCategory: category.name,
      initialBaseServiceIds: oneTimeIds,
      initialAddons: [],
      initialState: stateName,
      initialCity: cityName,
      initialCityId: cityId,
    });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={category.name} showBack />

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <Text style={styles.heroDesc}>{category.desc}</Text>

        <TouchableOpacity
          style={[styles.bookBtn, selectedIds.length === 0 && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={selectedIds.length === 0}
        >
          <Text style={styles.bookBtnText}>
            {selectedIds.length > 0 ? `Book ${selectedIds.length} Service${selectedIds.length > 1 ? 's' : ''}` : 'Book This Service'}
          </Text>
        </TouchableOpacity>

        {/* Location banner — shows the city these services are for, with Change. */}
        <TouchableOpacity style={styles.locBanner} activeOpacity={0.7} onPress={openLocModal}>
          <Icon name="place" size={18} color="#D94625" />
          <View style={{ flex: 1 }}>
            <Text style={styles.locBannerLabel}>Showing services for</Text>
            <Text style={styles.locBannerValue} numberOfLines={1}>{cityName}, {stateName}</Text>
          </View>
          <Text style={styles.locBannerAction}>Change</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'oneTime' && styles.activeTab]}
            onPress={() => setActiveTab('oneTime')}
          >
            <Text style={[styles.tabText, activeTab === 'oneTime' && styles.activeTabText]}>One-Time Request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recurring' && styles.activeTab]}
            onPress={() => setActiveTab('recurring')}
          >
            <Text style={[styles.tabText, activeTab === 'recurring' && styles.activeTabText]}>Recurring</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
        ) : services.length === 0 ? (
          <Text style={styles.emptyText}>
            {activeTab === 'oneTime' ? 'No one-time services available.' : 'No recurring plans available.'}
          </Text>
        ) : (
          services.map(s => {
            const isSelected = selectedIds.includes(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                onPress={() => toggleService(s.id)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceCardLeft}>
                  <Text style={styles.serviceCardTitle}>{s.name}</Text>
                  <Text style={styles.serviceCardSub} numberOfLines={2}>
                    {s.description || s.pricing?.turnaroundLabel || 'Standard turnaround'}
                  </Text>
                </View>
                <View style={styles.serviceCardRight}>
                  <Text style={styles.serviceCardPrice}>{formatUsd(s.pricing, activeTab === 'recurring')}</Text>
                  <View style={[styles.addBtn, isSelected && styles.addedBtn]}>
                    <Text style={[styles.addBtnText, isSelected && styles.addedBtnText]}>
                      {isSelected ? '✓ Added' : '+ Add'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Styled Switch Request Type confirmation */}
      <Modal
        visible={!!switchPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setSwitchPrompt(null)}
      >
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.dialogIconWrap}>
              <Icon name="swap-horiz" size={32} color="#D94625" />
            </View>
            <Text style={styles.dialogTitle}>Switch Request Type?</Text>
            <Text style={styles.dialogMessage}>
              You have {switchPrompt?.count} {switchPrompt?.otherLabel} service{switchPrompt?.count > 1 ? 's' : ''} selected.
              A booking can only include one type at a time. Clear them and continue?
            </Text>
            <View style={styles.dialogBtnRow}>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogBtnGhost]}
                onPress={() => setSwitchPrompt(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.dialogBtnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, styles.dialogBtnPrimary]}
                onPress={confirmSwitch}
                activeOpacity={0.85}
              >
                <Text style={styles.dialogBtnPrimaryText}>Clear & Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change-location modal (same page) */}
      <Modal visible={locModalOpen} transparent animationType="slide" onRequestClose={() => setLocModalOpen(false)}>
        <View style={styles.locOverlay}>
          <View style={styles.locSheet}>
            <View style={styles.locSheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.locSheetTitle}>Change Location</Text>
                <Text style={styles.locSheetSub}>Services update to match your state & city.</Text>
              </View>
              <TouchableOpacity onPress={() => setLocModalOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <LocationSelect
              label="State"
              value={selState}
              placeholder="Select state"
              options={stateNames}
              loading={loadingStates}
              onSelect={(name) => { setSelState(name); setSelCity(''); }}
            />
            <LocationSelect
              label="City"
              value={selCity}
              placeholder={selState ? 'Select city' : 'Select state first'}
              options={cityNames}
              disabled={!selState}
              loading={!!selState && loadingCities}
              onSelect={setSelCity}
            />

            <TouchableOpacity
              style={[styles.saveLocBtn, !canSaveLoc && styles.saveLocBtnDisabled]}
              onPress={handleSaveLocation}
              disabled={!canSaveLoc}
              activeOpacity={0.85}
            >
              <Text style={styles.saveLocBtnText}>Update Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7', // Matches the cream background
  },
  heroSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    paddingRight: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: typography.h2.fontFamily,
    color: '#1E293B',
    flex: 1,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroContent: {
    marginTop: 4,
  },
  heroDesc: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  bookBtn: {
    backgroundColor: '#D94625',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookBtnDisabled: {
    backgroundColor: '#CBD5E1', // slate-300
  },
  bookBtnText: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#FFFFFF',
  },

  // Location banner
  locBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 14,
  },
  locBannerLabel: { fontSize: 11, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily },
  locBannerValue: { fontSize: 14, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily, marginTop: 1 },
  locBannerAction: { fontSize: 13, color: '#D94625', fontFamily: typography.h4.fontFamily },

  // Change-location modal + selects
  locOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  locSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },
  locSheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  locSheetTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  locSheetSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  selectLabel: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B', marginBottom: 6 },
  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 12, height: 50,
  },
  selectBoxDisabled: { opacity: 0.5 },
  selectText: { flex: 1, fontSize: 14, color: '#0F172A' },
  selectPlaceholder: { color: '#94A3B8' },
  saveLocBtn: { backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveLocBtnDisabled: { backgroundColor: '#CBD5E1' },
  saveLocBtnText: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },

  // Option bottom-sheet (state/city lists)
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  optionSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, maxHeight: '70%' },
  sheetTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 12 },
  sheetSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 12, height: 44, marginBottom: 8,
  },
  sheetSearchInput: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
  sheetOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  sheetOptionText: { fontSize: 15, color: '#0F172A' },
  sheetEmpty: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 24 },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F3EFE9', // Light beige
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: typography.labelLarge.fontFamily,
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#D94625',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 10,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
    fontSize: 14,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceCardSelected: {
    borderColor: '#D94625',
  },
  serviceCardLeft: {
    flex: 1,
    paddingRight: 16,
  },
  serviceCardTitle: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#1E293B',
    marginBottom: 4,
  },
  serviceCardSub: {
    fontSize: 13,
    color: '#94A3B8',
  },
  serviceCardRight: {
    alignItems: 'flex-end',
  },
  serviceCardPrice: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#D94625',
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9462540',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  addedBtn: {
    backgroundColor: '#F6FFED',
    borderColor: '#F6FFED',
  },
  addBtnText: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#D94625',
  },
  addedBtnText: {
    color: '#059669',
  },
  includedPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  includedPillText: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#059669',
  },

  // Switch Request Type dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  dialogIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FDECE7', // tint of the #D94625 accent
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogTitle: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 24,
  },
  dialogBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  dialogBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBtnGhost: {
    backgroundColor: '#F1F5F9',
  },
  dialogBtnGhostText: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#475569',
  },
  dialogBtnPrimary: {
    backgroundColor: '#D94625',
    shadowColor: '#D94625',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  dialogBtnPrimaryText: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#FFFFFF',
  },
});

export default ServiceDetail;
