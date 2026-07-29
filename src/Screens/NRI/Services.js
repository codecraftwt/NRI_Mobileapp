import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Modal, FlatList, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { setServiceLocation } from '../../Redux/slices/serviceLocationSlice';
import { useServiceCategories } from '../../Hooks/useServiceCategories';
import { useStates } from '../../Hooks/useStates';
import { useCities } from '../../Hooks/useCities';

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
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={close}>
          {/* Stop the overlay's onPress from closing when tapping inside the sheet. */}
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>{label}</Text>
            <View style={styles.modalSearchBox}>
              <Icon name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.modalSearchInput}
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
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalOption} onPress={() => { onSelect(item); close(); }}>
                  <Text style={styles.modalOptionText}>{item}</Text>
                  {item === value && <Icon name="check" size={18} color={colors.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.modalEmpty}>No matches found.</Text>}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function Services({ navigation }) {
  const dispatch = useDispatch();
  const { categories, loading } = useServiceCategories();
  const [search, setSearch] = useState('');

  // Saved (persisted) service location — set once, reused for every category.
  const savedLocation = useSelector(s => s.serviceLocation);
  const hasLocation = !!(savedLocation?.cityId && savedLocation?.stateName && savedLocation?.cityName);

  // Location modal state. `pendingCategory` holds the category to open once a
  // location is chosen (null when the modal is just editing the saved location).
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingCategory, setPendingCategory] = useState(null);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const { stateNames, loading: loadingStates } = useStates();
  const { cities, cityNames, loading: loadingCities } = useCities(selectedState);
  const cityId = selectedCity ? cities.find(c => c.name === selectedCity)?.id : null;
  const canSubmit = !!(selectedState && selectedCity && cityId);

  const goToServices = (cat, loc) => navigation.navigate('ServiceDetail', {
    category: cat,
    stateName: loc.stateName,
    cityName: loc.cityName,
    cityId: loc.cityId,
  });

  // Open the modal — prefilled with the saved location so it can be tweaked.
  const openLocationModal = (cat) => {
    setSelectedState(savedLocation?.stateName || '');
    setSelectedCity(savedLocation?.cityName || '');
    setPendingCategory(cat || null);
    setModalOpen(true);
  };

  const closeLocationModal = () => { setModalOpen(false); setPendingCategory(null); };

  // Category tap: go straight through with the saved location; only ask when
  // none is saved yet.
  const handleCategoryPress = (cat) => {
    if (hasLocation) {
      goToServices(cat, savedLocation);
    } else {
      openLocationModal(cat);
    }
  };

  const handleSubmitLocation = () => {
    if (!canSubmit) return;
    const loc = { stateName: selectedState, cityName: selectedCity, cityId };
    dispatch(setServiceLocation(loc)); // persist for next time
    const cat = pendingCategory;
    closeLocationModal();
    if (cat) goToServices(cat, loc); // came from a category tap → continue
  };

  const displayCategories = categories.map(c => {
    const details = categoryDetails[c.name] || { icon: 'category', color: '#64748B', desc: 'Explore this service category...' };
    return { ...c, ...details, displayName: details.displayName || c.name };
  });

  const filteredCategories = displayCategories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Services</Text>
      </View>
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <View style={styles.list}>
            {filteredCategories.map((cat, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => handleCategoryPress(cat)}
              >
                <View style={[styles.iconBox, { backgroundColor: cat.color + '15' }]}>
                  <Icon name={cat.icon} size={24} color={cat.color} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.title}>{cat.displayName}</Text>
                  <Text style={styles.desc} numberOfLines={1}>{cat.desc}</Text>
                </View>
                <Icon name="chevron-right" size={20} color="#94A3B8" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Location modal — from a category tap (first time) or the banner */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeLocationModal}
      >
        <View style={styles.locOverlay}>
          <View style={styles.locSheet}>
            <View style={styles.locHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.locTitle}>Select Location</Text>
                <Text style={styles.locSubtitle} numberOfLines={1}>
                  {pendingCategory
                    ? `Where do you need ${pendingCategory.displayName}?`
                    : 'Choose the state & city for your services.'}
                </Text>
              </View>
              <TouchableOpacity onPress={closeLocationModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <LocationSelect
              label="State"
              value={selectedState}
              placeholder="Select state"
              options={stateNames}
              loading={loadingStates}
              onSelect={(name) => { setSelectedState(name); setSelectedCity(''); }}
            />
            <LocationSelect
              label="City"
              value={selectedCity}
              placeholder={selectedState ? 'Select city' : 'Select state first'}
              options={cityNames}
              disabled={!selectedState}
              loading={!!selectedState && loadingCities}
              onSelect={setSelectedCity}
            />

            <TouchableOpacity
              style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              onPress={handleSubmitLocation}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              <Text style={styles.submitBtnText}>{pendingCategory ? 'Submit' : 'Save Location'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#20304C',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 4,
    shadowColor: '#A64416',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#A64416',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    ...typography.body,
    height: '100%',
    color: '#1E293B',
  },

  locBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginTop: 12,
  },
  locBannerLabel: { fontSize: 11, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily },
  locBannerValue: { fontSize: 14, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily, marginTop: 1 },
  locBannerAction: { fontSize: 13, color: '#D94625', fontFamily: typography.h4.fontFamily },

  list: { gap: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  desc: {
    fontSize: 13,
    color: '#64748B',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  // Location modal
  locOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  locSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  locHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  locTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  locSubtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },

  selectLabel: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B', marginBottom: 6 },
  selectBox: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 12, height: 50,
  },
  selectBoxDisabled: { opacity: 0.5 },
  selectText: { flex: 1, fontSize: 14, color: '#0F172A' },
  selectPlaceholder: { color: '#94A3B8' },

  submitBtn: {
    backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  submitBtnDisabled: { backgroundColor: '#CBD5E1' },
  submitBtnText: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },

  // Option bottom-sheet (state/city lists)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, maxHeight: '70%' },
  modalTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 12 },
  modalSearchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 12, height: 44, marginBottom: 8,
  },
  modalSearchInput: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
  modalOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOptionText: { fontSize: 15, color: '#0F172A' },
  modalEmpty: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 24 },
});

export default Services;
