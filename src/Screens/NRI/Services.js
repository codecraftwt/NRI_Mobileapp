import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, StatusBar, Modal } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { selectCartCount } from '../../Redux/slices/cartSlice';
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

const priceValue = (p) => (p ? (p.customerPrice ?? p.recurringPrice ?? null) : null);
const priceText = (p) => {
  if (!p) return '—';
  if (p.isQuoted) return 'On quote';
  const v = priceValue(p);
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false); // location picker

  // Opened from the service detail's "Set your location to add" — auto-open the
  // PIN-code picker here, then clear the flag so it doesn't re-fire.
  useEffect(() => {
    if (route?.params?.openLocation) {
      setModalOpen(true);
      navigation.setParams({ openLocation: undefined });
    }
  }, [route?.params?.openLocation, navigation]);

  const cartCount = useSelector(selectCartCount);
  const isAuthenticated = useSelector(s => s.user?.isAuthenticated);

  const savedLocation = useSelector(s => s.serviceLocation);
  const hasLocation = !!(savedLocation?.cityId && savedLocation?.stateName && savedLocation?.cityName);

  const displayCategories = categories.map(c => ({ ...c, ...detailsFor(c.name), displayName: detailsFor(c.name).displayName || c.name }));
  // "All Categories" first, then every category.
  const filterOptions = [allOption, ...displayCategories];

  const isAll = activeCatName === ALL_CAT;
  const activeCategory = displayCategories.find(c => c.name === activeCatName) || null;

  // Per-category services (one category's list). Inactive when "All" is picked
  // (no matching categoryId → hook stays idle).
  const { oneTime, recurring, loading: loadingServices } = useServiceGroups(
    isAll ? '' : activeCatName,
    savedLocation?.stateName || '',
    savedLocation?.cityId || null,
  );

  // All-services list — bound to /services with no category_id (returns every
  // service, grouped), fetched when "All Categories" is active.
  const [allServices, setAllServices] = useState([]);
  const [allLoading, setAllLoading] = useState(false);
  useEffect(() => {
    if (!isAll) return;
    let cancelled = false;
    setAllLoading(true);
    getServiceGroups({ cityId: savedLocation?.cityId || null })
      .then(({ oneTime: ot, recurring: rc }) => {
        if (cancelled) return;
        const s = new Set();
        setAllServices([...ot, ...rc].filter(x => (s.has(x.id) ? false : s.add(x.id))));
      })
      .catch(() => { if (!cancelled) setAllServices([]); })
      .finally(() => { if (!cancelled) setAllLoading(false); });
    return () => { cancelled = true; };
  }, [isAll, savedLocation?.cityId]);

  const catSeen = new Set();
  const catServices = [...oneTime, ...recurring].filter(s => (catSeen.has(s.id) ? false : catSeen.add(s.id)));
  const q = search.toLowerCase().trim();
  const services = (isAll ? allServices : catServices).filter(s => s.name.toLowerCase().includes(q));
  const listLoading = loadingCats || (isAll ? allLoading : loadingServices);

  // The category a card belongs to — its own category in "All" mode, otherwise
  // the active one. Drives the card's icon/color/label and the detail screen.
  const catForService = (s) => {
    if (!isAll) return activeCategory;
    const nm = s.category?.name;
    return { id: s.category?.id, name: nm, ...detailsFor(nm), displayName: nm || 'Service' };
  };

  const openService = (service) => navigation.navigate('GuestServiceInfo', { service, category: catForService(service) });

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
          <TouchableOpacity style={styles.locChip} activeOpacity={0.7} onPress={() => setModalOpen(true)}>
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Promo banner */}
        <View style={styles.banner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Trusted help,{'\n'}near your family</Text>
            <Text style={styles.bannerSub}>Verified local vendors · Photo proof · RM support</Text>
          </View>
          <View style={styles.bannerIcon}>
            <Icon name="verified-user" size={30} color="#FFFFFF" />
          </View>
        </View>

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
            <Text style={styles.emptyText}>No services found in {isAll ? 'any category' : (activeCategory?.displayName || 'this category')}.</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {services.map(s => {
              const dur = durationText(s.pricing);
              const cardCat = catForService(s);
              return (
                <TouchableOpacity key={s.id} style={styles.card} activeOpacity={0.85} onPress={() => openService(s)}>
                  <View style={[styles.cardImage, { backgroundColor: (cardCat?.color || '#64748B') + '15' }]}>
                    <Icon name={cardCat?.icon || 'category'} size={40} color={cardCat?.color || '#64748B'} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={styles.cardName} numberOfLines={1}>{s.name}</Text>
                    <Text style={styles.cardCat} numberOfLines={1}>{cardCat?.displayName}</Text>
                    <View style={styles.cardMetaRow}>
                      <Text style={styles.cardPrice}>{priceText(s.pricing)}</Text>
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
        title="Select Location"
        subtitle="Enter your PIN code to find your city."
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
    backgroundColor: '#A64416', borderRadius: 20, padding: 18, marginBottom: 18,
  },
  bannerTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', lineHeight: 26 },
  bannerSub: { fontSize: 12, color: '#FCD9C8', marginTop: 6, fontFamily: typography.labelMedium.fontFamily },
  bannerIcon: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.15)',
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
  cardImage: { height: 110, justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 12, gap: 3 },
  cardName: { fontSize: 14, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  cardCat: { fontSize: 11, color: '#94A3B8' },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardPrice: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#D94625' },
  cardDurationChip: { flexDirection: 'row', alignItems: 'center', gap: 2 },
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
