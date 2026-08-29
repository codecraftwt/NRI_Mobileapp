import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StatusBar, Modal, Animated, Image, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { clearServiceLocation } from '../../Redux/slices/serviceLocationSlice';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { useCart } from '../../Hooks/useCart';
import { useServiceCategories } from '../../Hooks/useServiceCategories';
import { useServiceGroups } from '../../Hooks/useServiceGroups';
import { getServiceGroups } from '../../Api/catalogApi';
import LocationPickerModal from '../../Components/LocationPickerModal';

const categoryDetails = {
  // Original Mappings
  'Parent Care': { icon: 'favorite-border', color: '#D94625', desc: 'Scheduled visits, wellness reports & esc...' },
  'Property Management': { icon: 'domain', color: '#1E3A8A', desc: 'Inspections, tenant management & mai...' },
  'Government Documentation': { icon: 'account-balance', color: '#92400E', desc: '7/12, PAN, Aadhaar, Passport, OCI & mo...' },
  'Legal Services': { icon: 'gavel', color: '#047857', desc: 'Will drafting, NRI tax, FEMA & investm...' },
  'Travel & Transport': { icon: 'airport-shuttle', color: '#4338CA', desc: 'Airport pickup, car rental & India visit p...' },
  'Home Repair': { icon: 'build', color: '#B45309', desc: 'Plumbing, electrical, deep cleaning & pa...' },
  'Medical Assistance': { icon: 'medical-services', color: '#EF4444', desc: 'Medical emergency, doctor appointments...' },
  'Financial Services': { icon: 'trending-up', color: '#3B82F6', desc: 'MF, FD, NPS, real estate & demat setup' },
  'Insurance Services': { icon: 'shield', color: '#10B981', desc: 'Health, life, property insurance assistance' },
  'Farm Management': { icon: 'grass', color: '#10B981', desc: 'Farm inspections, crop reports & mandi...' },
  'Education': { icon: 'school', color: '#8B5CF6', desc: 'School admissions, tuitions & college g...' },
  'Gifts & Events': { icon: 'card-giftcard', color: '#EC4899', desc: 'Birthdays, festivals, pujas & celebrations' },
  'Emergency (24x7)': { icon: 'error-outline', color: '#EF4444', desc: 'Medical, property & legal emergency re...' },
  'Vehicle Care': { icon: 'car-repair', color: '#64748B', desc: 'RC renewal, PUC, insurance & servicing' },

  // New API Category Mappings
  'Cleaning': { icon: 'cleaning-services', color: '#3B82F6', desc: 'Deep cleaning, maid services, pest control...' },
  'Gift Delivery': { icon: 'card-giftcard', color: '#EC4899', desc: 'Send cakes, flowers & custom gifts...' },
  'Travel Assistance': { icon: 'flight', color: '#8B5CF6', desc: 'Flight bookings, visa assistance & more...' },
  'Transportation': { icon: 'directions-car', color: '#F59E0B', desc: 'Airport pickups, local car rentals...' },
  'Vehicle Services': { icon: 'car-repair', color: '#64748B', desc: 'Servicing, RC renewal & insurance...' },
  'Pet Care': { icon: 'pets', color: '#10B981', desc: 'Pet boarding, vet visits & grooming...' },
  'Emergency Services': { icon: 'error-outline', color: '#EF4444', desc: '24x7 medical & legal emergencies...' },
  'Custom Task': { icon: 'assignment', color: '#3B82F6', desc: 'Need something else? Let us know...' },
  'Education & Admission Assistance': { icon: 'school', color: '#8B5CF6', desc: 'School/college admissions & guidance...' },
  'Religious & Astrology Services': { icon: 'stars', color: '#F59E0B', desc: 'Puja arrangements, astrology & rituals...' },
  'Return to India Planning': { icon: 'flight-land', color: '#10B981', desc: 'Relocation, housing & school planning...' },
  'Annual India Visit Planning': { icon: 'card-travel', color: '#EC4899', desc: 'Itinerary planning, stay & transport...' },
};

const detailsFor = (name) =>
  categoryDetails[name] || { icon: 'category', color: '#64748B', desc: 'Explore this service category...' };

// Sentinel + display option for the "All Categories" filter (fetches every
// service across categories rather than one category's list).
const ALL_CAT = '__all__';
const allOption = { id: '__all__', name: '__all__', displayName: 'All Categories', icon: 'grid-view', color: '#20304C' };

// `mode` is 'oneTime' | 'recurring' — picks which of the service's two prices
// (allows_single_use vs allows_recurring) to read, rather than silently
// preferring whichever happens to be present.
const priceValue = (p, mode) => {
  if (!p) return null;
  return mode === 'recurring' ? p.recurringPrice : p.customerPrice;
};

// Bookable in the chosen city, for the selected mode? A service is available
// only if its vendor-availability flag for that mode isn't explicitly false
// (false = no vendor covers it here → would 422 at checkout) — or it's an
// on-quote service. Matches ServiceDetail.js's isBookable and web's picker.
// Safe to key off the flag directly here (rather than price presence)
// because the mode-support filter below already drops services that don't
// offer this mode at all — so a null flag reaching this check only ever
// means "no location set yet," not "mode unsupported." Only applied once a
// location is set (see below).
const isServiceAvailable = (s, mode) => {
  const p = s.pricing;
  if (!p || p.isQuoted) return true;
  return mode === 'recurring' ? p.recurringVendorPriced !== false : p.vendorPriced !== false;
};
const priceText = (p, mode) => {
  if (!p) return '—';
  if (p.isQuoted) return 'On quote';
  if (mode === 'recurring') {
    if (p.recurringDisplayPrice) return p.recurringDisplayPrice;
    return p.recurringPrice != null ? `$${Number(p.recurringPrice).toFixed(2)}/mo` : '—';
  }
  const v = priceValue(p, mode);
  return v != null ? `$${Number(v).toFixed(2)}` : '—';
};
const durationText = (p) => {
  if (!p) return '';
  if (p.turnaroundLabel) return p.turnaroundLabel;
  if (p.turnaroundHours != null) return `${p.turnaroundHours} hrs`;
  return '';
};

function Services({ navigation, route }) {
  const { categories, loading: loadingCats } = useServiceCategories();
  const [search, setSearch] = useState('');
  const [activeCatName, setActiveCatName] = useState(ALL_CAT); // default: All Categories
  // Which of a service's two prices to browse/show — 'oneTime' (allows_single_use)
  // or 'recurring' (allows_recurring). Carried into ServiceInfo when a card is tapped.
  const [mode, setMode] = useState('oneTime');
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false); // location picker
  // Service the user tapped before a location was set — opened automatically
  // once they pick a location, so they don't bounce back to this screen.
  const [pendingService, setPendingService] = useState(null);

  // Opened from the service detail's "Set your location to add" — auto-open the
  // PIN-code picker here, then clear the flag so it doesn't re-fire.
  useEffect(() => {
    if (route?.params?.openLocation) {
      setModalOpen(true);
      navigation.setParams({ openLocation: undefined });
    }
  }, [route?.params?.openLocation, navigation]);

  const { count: cartCount, refresh: refreshCart } = useCart();
  const refreshCartRef = useRef(refreshCart);
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(s => s.user?.isAuthenticated);

  // Fresh-guest reset: this same screen backs both the onboarding "All Services"
  // (GuestServices) and the signed-in Services tab. When an UNauthenticated
  // guest first lands here, wipe any leftover service location so they start
  // with no city ("Set your location"). Runs once on mount only (not on focus),
  // so a guest who then picks a city can still visit the Cart and come back
  // without losing it. Signed-in members are never touched — their city stays
  // sticky across sessions.
  useEffect(() => {
    if (!isAuthenticated) dispatch(clearServiceLocation());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshCartRef.current = refreshCart;
  }, [refreshCart]);

  useFocusEffect(
    React.useCallback(() => {
      refreshCartRef.current?.();
    }, [])
  );

  // Promo banner: gently animate the background between two light peach shades.
  const bannerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(bannerAnim, { toValue: 1, duration: 2600, useNativeDriver: false }),
      Animated.timing(bannerAnim, { toValue: 0, duration: 2600, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [bannerAnim]);
  const bannerBg = bannerAnim.interpolate({ inputRange: [0, 1], outputRange: ['#FFF1E8', '#FBDCC7'] });

  const savedLocation = useSelector(s => s.serviceLocation);
  const geoStates = useSelector(s => s.geo.states);
  const hasLocation = !!(savedLocation?.cityId && savedLocation?.stateName && savedLocation?.cityName);
  // Resolve the numeric state id from the saved state name — the /services API
  // needs state_id (alongside city_id) to return state-specific pricing;
  // without it some services come back with no price.
  const stateId = savedLocation?.stateName ? geoStates.find(s => s.name === savedLocation.stateName)?.id || null : null;

  const displayCategories = categories.map(c => ({ ...c, ...detailsFor(c.name), displayName: detailsFor(c.name).displayName || c.name }));
  // "All Categories" first, then every category.
  const filterOptions = [allOption, ...displayCategories];

  const isAll = activeCatName === ALL_CAT;
  const activeCategory = displayCategories.find(c => c.name === activeCatName) || null;

  // Per-category services (one category's list). Inactive when "All" is picked
  // (no matching categoryId → hook stays idle).
  const { oneTime, recurring, loading: loadingServices, retry: retryCategory } = useServiceGroups(
    isAll ? '' : activeCatName,
    savedLocation?.stateName || '',
    savedLocation?.cityId || null,
  );

  // All-services list — bound to /services with no category_id (returns every
  // service, grouped), fetched when "All Categories" is active.
  const [allServices, setAllServices] = useState([]);
  const [allLoading, setAllLoading] = useState(false);
  // Reusable loader so both the auto-fetch effect and pull-to-refresh use one
  // code path; returns the promise so refresh can await it.
  const loadAllServices = useCallback(() => {
    setAllLoading(true);
    return getServiceGroups({ stateId: stateId || null, cityId: savedLocation?.cityId || null })
      .then(({ oneTime: ot, recurring: rc }) => {
        const seen = new Set();
        setAllServices([...ot, ...rc].filter(x => (seen.has(x.id) ? false : seen.add(x.id))));
      })
      .catch(() => setAllServices([]))
      .finally(() => setAllLoading(false));
  }, [stateId, savedLocation?.cityId]);
  useEffect(() => {
    if (!isAll) return;
    loadAllServices();
  }, [isAll, loadAllServices]);

  // Pull-to-refresh: re-fetch the server cart count (so a just-added service
  // reflects in the badge without leaving the screen) and reload the visible
  // service list.
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refreshCartRef.current?.(),
        isAll ? loadAllServices() : Promise.resolve(retryCategory?.()),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [isAll, loadAllServices, retryCategory]);

  const catSeen = new Set();
  const catServices = [...oneTime, ...recurring].filter(s => (catSeen.has(s.id) ? false : catSeen.add(s.id)));
  const q = search.toLowerCase().trim();
  const services = (isAll ? allServices : catServices)
    .filter(s => (mode === 'recurring' ? s.allowsRecurring : s.allowsSingleUse))
    .filter(s => s.name.toLowerCase().includes(q))
    .filter(s => !hasLocation || isServiceAvailable(s, mode));
  const listLoading = loadingCats || (isAll ? allLoading : loadingServices);

  // The category a card belongs to — its own category in "All" mode, otherwise
  // the active one. Drives the card's icon/color/label and the detail screen.
  const catForService = (s) => {
    if (!isAll) return activeCategory;
    const nm = s.category?.name;
    return { id: s.category?.id, name: nm, ...detailsFor(nm), displayName: nm || 'Service' };
  };

  const openService = (service) => {
    const target = { service, category: catForService(service), mode };
    // Ask for a location first — without it the detail screen can't price or add
    // the service, and would just send the user back here. Resume into the
    // service once a location is saved (see onSaved below).
    if (!hasLocation) {
      setPendingService(target);
      setModalOpen(true);
      return;
    }
    navigation.navigate('GuestServiceInfo', target);
  };

  const pickCategory = (name) => { setActiveCatName(name); setFilterOpen(false); };

  // Reset the filter back to "All Categories" (show every service) and clear search.
  const resetFilter = () => { setActiveCatName(ALL_CAT); setSearch(''); setFilterOpen(false); };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>All Services</Text>
          <TouchableOpacity style={styles.locChip} activeOpacity={0.7} onPress={() => { setPendingService(null); setModalOpen(true); }}>
            <Icon name="place" size={14} color="#FCD9C8" />
            <Text style={styles.locChipText} numberOfLines={1}>
              {hasLocation ? `${savedLocation.cityName}, ${savedLocation.stateName}` : 'Set your location'}
            </Text>
            <Icon name="keyboard-arrow-down" size={16} color="#FCD9C8" />
          </TouchableOpacity>
        </View>
        {!isAuthenticated && (
          <TouchableOpacity style={styles.signInBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Login')}>
            <Icon name="login" size={16} color="#FFFFFF" />
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.cartBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Cart')}>
          <Icon name="shopping-cart" size={22} color="#FFFFFF" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          // Hide the top spinner while the list loader below is already showing,
          // so a refresh never renders two loaders at once.
          <RefreshControl refreshing={refreshing && !listLoading} onRefresh={onRefresh} tintColor="#D94625" colors={['#D94625']} />
        }
      >
        {/* Promo banner */}
        <Animated.View style={[styles.banner, { backgroundColor: bannerBg }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Trusted help,{'\n'}near your family</Text>
            <Text style={styles.bannerSub}>Verified local vendors · Photo proof · RM support</Text>
          </View>
          <View style={styles.bannerIcon}>
            <Icon name="verified-user" size={30} color="#D94625" />
          </View>
        </Animated.View>

        {/* Search + filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Icon name="search" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.85} onPress={() => setFilterOpen(true)}>
            <Icon name="tune" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* One Time / Recurring toggle */}
        <View style={styles.modeToggleRow}>
          <TouchableOpacity
            style={[styles.modeToggleBtn, mode === 'oneTime' && styles.modeToggleBtnActive]}
            activeOpacity={0.85}
            onPress={() => setMode('oneTime')}
          >
            <Text style={[styles.modeToggleText, mode === 'oneTime' && styles.modeToggleTextActive]}>One Time</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeToggleBtn, mode === 'recurring' && styles.modeToggleBtnActive]}
            activeOpacity={0.85}
            onPress={() => setMode('recurring')}
          >
            <Text style={[styles.modeToggleText, mode === 'recurring' && styles.modeToggleTextActive]}>Recurring</Text>
          </TouchableOpacity>
        </View>

        {/* Category filter chips (All Categories first) */}
        {!loadingCats && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsRow}
          >
            {filterOptions.map(c => {
              const active = c.name === activeCatName;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.8}
                  onPress={() => setActiveCatName(c.name)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>{c.displayName}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Service cards grid */}
        {listLoading ? (
          <View style={styles.loadingBox}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : services.length === 0 ? (
          <View style={styles.loadingBox}>
            <Icon name="search-off" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>
              No {mode === 'recurring' ? 'recurring' : 'one-time'} services found in {isAll ? 'any category' : (activeCategory?.displayName || 'this category')}.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {services.map(s => {
              const dur = durationText(s.pricing);
              const cardCat = catForService(s);
              return (
                <TouchableOpacity key={s.id} style={styles.card} activeOpacity={0.85} onPress={() => openService(s)}>
                  {s.imageUrl ? (
                    <Image source={{ uri: s.imageUrl }} style={styles.cardImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.cardImage, styles.cardImageFallback, { backgroundColor: (cardCat?.color || '#64748B') + '15' }]}>
                      <Icon name={cardCat?.icon || 'category'} size={40} color={cardCat?.color || '#64748B'} />
                    </View>
                  )}
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.cardCat} numberOfLines={1}>{cardCat?.displayName}</Text>
                    <View style={styles.cardMetaRow}>
                      {hasLocation ? (
                        <Text style={styles.cardPrice} numberOfLines={1}>{priceText(s.pricing, mode)}</Text>
                      ) : (
                        <Text style={styles.cardPriceHint} numberOfLines={1}>Set location for price</Text>
                      )}
                      {!!dur && (
                        <View style={styles.cardDurationChip}>
                          <Icon name="schedule" size={11} color="#94A3B8" />
                          <Text style={styles.cardDuration}>{dur}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Filter sheet — main categories */}
      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <TouchableOpacity style={styles.filterOverlay} activeOpacity={1} onPress={() => setFilterOpen(false)}>
          <TouchableOpacity style={styles.filterSheet} activeOpacity={1} onPress={() => {}}>
            <View style={styles.filterHandle} />
            <View style={styles.filterHeaderRow}>
              <Text style={styles.filterTitle}>Filter by category</Text>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {filterOptions.map(c => {
                const active = c.name === activeCatName;
                return (
                  <TouchableOpacity key={c.id} style={styles.filterRow} activeOpacity={0.7} onPress={() => pickCategory(c.name)}>
                    <View style={[styles.filterIcon, { backgroundColor: c.color + '15' }]}>
                      <Icon name={c.icon} size={20} color={c.color} />
                    </View>
                    <Text style={[styles.filterRowText, active && { color: '#D94625', fontFamily: typography.h4.fontFamily }]}>{c.displayName}</Text>
                    {active && <Icon name="check-circle" size={20} color="#D94625" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <LocationPickerModal
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={() => {
          // Location saved — just close and stay on this list (it re-filters to
          // the services available in the chosen city). Don't auto-open the
          // tapped service; the user picks it again from the refreshed list.
          setModalOpen(false);
          setPendingService(null);
        }}
        title={pendingService ? 'Set Location to Continue' : 'Select Location'}
        subtitle={pendingService
          ? 'Enter your PIN code to see this service’s price and availability in your city.'
          : 'Enter your PIN code to find your city.'}
      />
    </View>
  );
}

const CARD_GAP = 14;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: STATUS_BAR_HEIGHT,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#20304C',
  },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  locChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, alignSelf: 'flex-start', maxWidth: '90%' },
  locChipText: { fontSize: 12, color: '#FCD9C8', fontFamily: typography.labelMedium.fontFamily },
  signInBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5, height: 40, paddingHorizontal: 14,
    borderRadius: 20, backgroundColor: '#D94625', marginRight: 10,
  },
  signInText: { color: '#FFFFFF', fontSize: 13, fontFamily: typography.h4.fontFamily },
  cartBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  cartBadge: {
    position: 'absolute', top: 4, right: 4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: '#D94625', justifyContent: 'center', alignItems: 'center',
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  banner: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, padding: 18, marginBottom: 18,
    borderWidth: 1, borderColor: '#F6D3BE',
  },
  bannerTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#7A2E12', lineHeight: 26 },
  bannerSub: { fontSize: 12, color: '#A65A3A', marginTop: 6, fontFamily: typography.labelMedium.fontFamily },
  bannerIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(217,70,37,0.12)',
    justifyContent: 'center', alignItems: 'center', marginLeft: 12,
  },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: '#A64416', gap: 12,
    shadowColor: '#A64416', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 3,
  },
  searchInput: { flex: 1, ...typography.body, height: '100%', color: '#1E293B' },
  filterBtn: {
    width: 52, height: 52, borderRadius: 16, backgroundColor: '#20304C',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10, elevation: 4,
  },

  modeToggleRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4,
    marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9',
  },
  modeToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  modeToggleBtnActive: { backgroundColor: '#20304C' },
  modeToggleText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  modeToggleTextActive: { color: '#FFFFFF', fontFamily: typography.h4.fontFamily },

  chipsRow: { gap: 10, paddingRight: 8, paddingBottom: 18 },
  chip: {
    paddingHorizontal: 18, height: 38, borderRadius: 19, justifyContent: 'center',
    backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#F1F5F9',
  },
  chipActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  chipText: { fontSize: 13, color: '#64748B', fontFamily: typography.labelMedium.fontFamily },
  chipTextActive: { color: '#FFFFFF' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: {
    width: '48%', marginBottom: CARD_GAP, backgroundColor: '#FFFFFF', borderRadius: 20,
    borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  cardImage: { width: '100%', height: 110, backgroundColor: '#F1F5F9' },
  cardImageFallback: { justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 12, gap: 3 },
  cardName: { fontSize: 14, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  cardCat: { fontSize: 11, color: '#94A3B8' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardPrice: { flexShrink: 1, fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#D94625' },
  cardPriceHint: { flex: 1, fontSize: 11, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily },
  cardDurationChip: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
  cardDuration: { fontSize: 10, color: '#94A3B8' },

  loadingBox: { paddingVertical: 50, alignItems: 'center', gap: 10 },
  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },

  // Filter sheet
  filterOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  filterSheet: {
    backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28, maxHeight: '75%',
  },
  filterHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: '#CBD5E1', alignSelf: 'center', marginBottom: 14 },
  filterHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  filterTitle: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  filterReset: { fontSize: 14, color: '#D94625', fontFamily: typography.h4.fontFamily },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  filterIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  filterRowText: { flex: 1, fontSize: 15, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily },
});

export default Services;
