import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { useCart } from '../../Hooks/useCart';
import { useServiceGroups } from '../../Hooks/useServiceGroups';
import LocationPickerModal from '../../Components/LocationPickerModal';

// Short one-line price for the list row, for the given mode ('oneTime' |
// 'recurring') — reads customer_price or recurring_price explicitly rather
// than preferring whichever happens to be present.
const priceLabel = (pricing, mode) => {
  if (!pricing) return '';
  if (pricing.isQuoted) return 'On quote';
  if (mode === 'recurring') {
    if (pricing.recurringDisplayPrice) return pricing.recurringDisplayPrice;
    return pricing.recurringPrice != null ? `$${Number(pricing.recurringPrice).toFixed(2)}/mo` : '';
  }
  return pricing.customerPrice != null ? `$${Number(pricing.customerPrice).toFixed(2)}` : '';
};

function ServiceList({ route, navigation }) {
  const { category } = route.params;
  const { count: cartCount } = useCart();

  // Saved location drives vendor-specific pricing/availability. Optional to
  // browse — without it the list shows catalog "starting from" prices.
  const savedLocation = useSelector(s => s.serviceLocation);
  const hasLocation = !!(savedLocation?.cityId && savedLocation?.stateName && savedLocation?.cityName);
  const [locModalOpen, setLocModalOpen] = useState(false);
  // Service tapped before a location was set — opened automatically after the
  // user picks a location (so they don't bounce back here).
  const [pendingService, setPendingService] = useState(null);
  // Which of a service's two prices to browse/show — carried into
  // ServiceInfo when a card is tapped.
  const [mode, setMode] = useState('oneTime');

  const { oneTime, recurring, loading } = useServiceGroups(
    category.name,
    savedLocation?.stateName || '',
    savedLocation?.cityId || null,
  );

  // Availability filtering only kicks in once a location is set: before that
  // the user browses the FULL catalog ("starting from" prices). After a city is
  // chosen we hide services with no vendor price there, for the selected mode
  // ("Not available in your area", i.e. customer_price/recurring_price null).
  // Price presence is used rather than the vendor_priced flags — those are
  // null for services with no recurring option, which a flag check mis-read
  // as available.
  const isAvailable = (s) => {
    const p = s.pricing;
    if (!p || p.isQuoted) return true;
    const v = mode === 'recurring' ? p.recurringPrice : p.customerPrice;
    return v != null;
  };

  // Merge both buckets, de-duped by id, then keep only services offered in
  // the selected mode.
  const seen = new Set();
  const services = [...oneTime, ...recurring]
    .filter(s => (seen.has(s.id) ? false : seen.add(s.id)))
    .filter(s => (mode === 'recurring' ? s.allowsRecurring : s.allowsSingleUse))
    .filter(s => !hasLocation || isAvailable(s));

  const openService = (service) => {
    // Ask for a location first — the detail screen needs it to price/add the
    // service. Resume into it once a location is saved (see onSaved below).
    if (!hasLocation) {
      setPendingService(service);
      setLocModalOpen(true);
      return;
    }
    navigation.navigate('GuestServiceInfo', { service, category, mode });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{category.name}</Text>
        <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={() => navigation.navigate('Cart')}>
          <Icon name="shopping-cart" size={20} color="#FFFFFF" />
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Location banner — tap to set / change the city. */}
      <TouchableOpacity style={styles.locBanner} activeOpacity={0.7} onPress={() => { setPendingService(null); setLocModalOpen(true); }}>
        <Icon name="place" size={18} color="#D94625" />
        <View style={{ flex: 1 }}>
          <Text style={styles.locBannerLabel}>Showing services for</Text>
          <Text style={styles.locBannerValue} numberOfLines={1}>
            {hasLocation ? `${savedLocation.cityName}, ${savedLocation.stateName}` : 'Set your location'}
          </Text>
        </View>
        <Text style={styles.locBannerAction}>{hasLocation ? 'Change' : 'Set'}</Text>
      </TouchableOpacity>

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
        ) : services.length === 0 ? (
          <Text style={styles.emptyText}>No {mode === 'recurring' ? 'recurring' : 'one-time'} services available in this category.</Text>
        ) : (
          services.map(s => (
            <TouchableOpacity key={s.id} style={styles.card} activeOpacity={0.7} onPress={() => openService(s)}>
              <View style={styles.cardLeft}>
                <Text style={styles.cardTitle}>{s.name}</Text>
                <Text style={styles.cardSub} numberOfLines={2}>
                  {s.description || s.pricing?.turnaroundLabel || 'Standard turnaround'}
                </Text>
                {!!priceLabel(s.pricing, mode) && <Text style={styles.cardPrice}>{priceLabel(s.pricing, mode)}</Text>}
              </View>
              <Icon name="chevron-right" size={22} color="#94A3B8" />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <LocationPickerModal
        visible={locModalOpen}
        onClose={() => setLocModalOpen(false)}
        onSaved={() => {
          // Location saved — stay on this list (it re-filters to services
          // available in the chosen city). Don't auto-open the tapped service.
          setLocModalOpen(false);
          setPendingService(null);
        }}
        title={pendingService ? 'Set Location to Continue' : 'Select Location'}
        subtitle={pendingService
          ? 'Enter your PIN code to view and book this service in your city.'
          : 'Enter your PIN code — services update to match your city.'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: STATUS_BAR_HEIGHT,
    paddingBottom: 15,
    paddingHorizontal: 16,
    backgroundColor: '#20304C',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: typography.h4.fontFamily,
    color: '#FFFFFF',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: '#D94625',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },

  locBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, marginHorizontal: 20, marginTop: 16,
  },
  locBannerLabel: { fontSize: 11, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily },
  locBannerValue: { fontSize: 14, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily, marginTop: 1 },
  locBannerAction: { fontSize: 13, color: '#D94625', fontFamily: typography.h4.fontFamily },

  modeToggleRow: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4,
    marginHorizontal: 20, marginTop: 16, borderWidth: 1, borderColor: '#F1F5F9',
  },
  modeToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 11, alignItems: 'center' },
  modeToggleBtnActive: { backgroundColor: '#20304C' },
  modeToggleText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  modeToggleTextActive: { color: '#FFFFFF', fontFamily: typography.h4.fontFamily },

  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40, gap: 12 },
  emptyText: { textAlign: 'center', color: '#94A3B8', marginTop: 40, fontSize: 14 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  cardLeft: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#64748B' },
  cardPrice: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#D94625', marginTop: 8 },
});

export default ServiceList;
