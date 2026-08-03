import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Image, ImageBackground } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { selectIsInCart } from '../../Redux/slices/cartSlice';
import { useServiceGroups } from '../../Hooks/useServiceGroups';
import { useCart } from '../../Hooks/useCart';
import { useToast } from '../../context/ToastContext';

// Static, presentation-only copy shared by every service detail (matches the
// approved design). The trust/process story is the same for all services —
// only name, price and duration are service-specific.
const WHATS_INCLUDED = [
  'Vendor matched by service, area and rating — background-checked',
  'GPS check-in with geo-tagged photos before and after',
  'Written report from your Relationship Manager on WhatsApp',
  'Re-do or refund if the time guarantee is missed',
];

const HOW_IT_RUNS = [
  { step: '01', title: 'Request', desc: 'App, website or a call to your manager.' },
  { step: '02', title: 'Assign', desc: 'Verified local vendor matched and briefed.' },
  { step: '03', title: 'Execute', desc: 'Job done with photo and video proof.' },
  { step: '04', title: 'Report', desc: 'Summary and receipt sent to your phone.' },
];

const priceValue = (pricing) => {
  if (!pricing) return null;
  if (pricing.customerPrice != null) return Number(pricing.customerPrice);
  if (pricing.recurringPrice != null) return Number(pricing.recurringPrice);
  return null;
};

const priceLabel = (pricing) => {
  if (!pricing) return '—';
  if (pricing.isQuoted) return 'On quote';
  const v = priceValue(pricing);
  return v != null ? `$${v.toFixed(2)}` : '—';
};

const durationLabel = (pricing) => {
  if (!pricing) return '—';
  if (pricing.turnaroundLabel) return pricing.turnaroundLabel;
  if (pricing.turnaroundHours != null) return `${pricing.turnaroundHours} hrs`;
  return '—';
};

function ServiceInfo({ route, navigation }) {
  const { service, category } = route.params;
  const { showToast } = useToast();
  // Cart binds the server APIs when signed in; local-only for guests (onboarding).
  const { count: cartCount, add: addServiceToCart } = useCart();

  const savedLocation = useSelector(s => s.serviceLocation);
  const hasLocation = !!(savedLocation?.cityId && savedLocation?.stateName && savedLocation?.cityName);

  // Re-fetch the category with the current location so the price/availability
  // shown reflects the chosen city (updates automatically after the location
  // modal saves). Falls back to the service passed in from the list.
  const { oneTime, recurring } = useServiceGroups(
    category.name,
    savedLocation?.stateName || '',
    savedLocation?.cityId || null,
  );
  const fresh = [...oneTime, ...recurring].find(s => s.id === service.id);
  const svc = fresh || service;

  const inCart = useSelector(selectIsInCart(svc.id));
  const pricing = svc.pricing;

  // Bookable in the chosen city only when there's a real vendor price (or it's
  // an on-quote service). `customer_price: null` + `vendor_priced: false` means
  // "Not available in your area" — adding it would put a $0 line in the cart and
  // 422 at checkout, so the CTA is blocked (matches the list screen, which hides
  // these entirely).
  const canBook = !!pricing && (pricing.isQuoted || priceValue(pricing) != null);

  const handleAdd = () => {
    if (hasLocation && !canBook) return;
    if (!hasLocation) {
      // Navigate to the All Services screen and open the PIN-code picker there.
      // Its route name differs per stack ('GuestServices' for guests,
      // 'ServicesMain' when signed in) — find whichever is in the back stack.
      const routes = navigation.getState().routes;
      const target = routes.find(r => r.name === 'GuestServices' || r.name === 'ServicesMain') || routes[0];
      navigation.navigate(target.name, { openLocation: true });
      return;
    }
    if (inCart) { navigation.navigate('Cart'); return; }
    // Adds locally (display) and, when signed in, syncs to the server cart —
    // the badge count then reflects the server response.
    addServiceToCart({
      serviceId: svc.id,
      name: svc.name,
      categoryName: category.name,
      price: priceValue(pricing) ?? 0,
      currency: pricing?.currency || 'USD',
      durationLabel: durationLabel(pricing),
      stateName: savedLocation.stateName,
      cityName: savedLocation.cityName,
      cityId: savedLocation.cityId,
      pincode: savedLocation.pincode,
    });

    const shortName = svc.name.length > 24 ? `${svc.name.slice(0, 24).trim()}…` : svc.name;
    showToast(`${shortName} added to cart`, 'success');
  };

  const ctaDisabled = hasLocation && !canBook;
  const ctaLabel = !hasLocation
    ? 'Set your location to add'
    : !canBook
      ? 'Not available in your area'
      : inCart ? 'Go to Cart' : 'Add to Cart';
  const ctaIcon = !hasLocation ? 'place' : !canBook ? 'block' : inCart ? 'shopping-cart' : 'add-shopping-cart';

  const renderTopRow = () => (
    <View style={styles.heroTopRow}>
      <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.goBack()}>
        <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.heroBackIcon} />
      </TouchableOpacity>
      {/* <Text style={styles.heroTitle}>Details</Text> */}
      <TouchableOpacity style={styles.heroIconBtn} onPress={() => navigation.navigate('Cart')}>
        <Icon name="shopping-cart" size={20} color="#FFFFFF" />
        {cartCount > 0 && (
          <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Hero — top bar + full background image */}
      {svc.imageUrl ? (
        <ImageBackground source={{ uri: svc.imageUrl }} style={styles.hero} imageStyle={{ resizeMode: 'cover' }}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
          {renderTopRow()}
        </ImageBackground>
      ) : (
        <View style={styles.hero}>
          {renderTopRow()}
          <View style={styles.heroImageWrap}>
            <Icon name={category?.icon || 'home-repair-service'} size={80} color="rgba(255,255,255,0.3)" />
          </View>
        </View>
      )}

      <ScrollView style={styles.sheet} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{category.name.toUpperCase()}</Text>
        <Text style={styles.title}>{svc.name}</Text>
        {!!svc.description && <Text style={styles.desc}>{svc.description}</Text>}

        {/* Price + Duration */}
        <View style={styles.metaRow}>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>PRICE</Text>
            <Text style={styles.metaValue}>{priceLabel(pricing)}</Text>
          </View>
          <View style={styles.metaBox}>
            <Text style={styles.metaLabel}>DURATION</Text>
            <Text style={styles.metaValue}>{durationLabel(pricing)}</Text>
          </View>
        </View>

        {/* What's included */}
        <Text style={styles.sectionLabel}>WHAT'S INCLUDED</Text>
        <View style={styles.includedList}>
          {WHATS_INCLUDED.map((item, i) => (
            <View key={i} style={styles.includedItem}>
              <View style={styles.checkDot}><Icon name="check" size={12} color="#D94625" /></View>
              <Text style={styles.includedText}>{item}</Text>
            </View>
          ))}
        </View>

        {/* How it runs */}
        <Text style={styles.sectionLabel}>HOW IT RUNS</Text>
        <View style={styles.stepsGrid}>
          {HOW_IT_RUNS.map((s) => (
            <View key={s.step} style={styles.stepCard}>
              <Text style={styles.stepNum}>{s.step}</Text>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepDesc}>{s.desc}</Text>
            </View>
          ))}
        </View>

        {/* Proof of work */}
        <View style={styles.proofBox}>
          <Text style={styles.proofLabel}>PROOF OF WORK</Text>
          <Text style={styles.proofText}>
            GPS check-in, geo-tagged photos and a written report from your Relationship Manager
            land on WhatsApp the same day.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky bottom bar */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bottomPrice}>{priceLabel(pricing)}</Text>
          <Text style={styles.bottomDuration}>{durationLabel(pricing)}</Text>
        </View>
        <TouchableOpacity style={[styles.cta, ctaDisabled && styles.ctaDisabled]} activeOpacity={0.85} onPress={handleAdd} disabled={ctaDisabled}>
          <Icon name={ctaIcon} size={18} color="#FFFFFF" />
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  hero: {
    height: STATUS_BAR_HEIGHT + 300,
    backgroundColor: '#20304C',
    paddingTop: STATUS_BAR_HEIGHT - 20,
    paddingHorizontal: 16,
  },
  heroImageWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroCircle: {
    width: 230, height: 230, borderRadius: 115,
    borderWidth: 5, borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: '#2B3E5E', overflow: 'hidden', resizeMode: 'cover',
  },
  heroCircleFallback: { justifyContent: 'center', alignItems: 'center' },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { flex: 1, textAlign: 'center', color: '#FFFFFF', fontSize: 16, fontFamily: typography.h4.fontFamily },
  heroIconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  // Nudge the iOS chevron so it sits optically centered (matches Header).
  heroBackIcon: { marginLeft: 6 },
  cartBadge: {
    position: 'absolute', top: 2, right: 2,
    minWidth: 16, height: 16, borderRadius: 8, paddingHorizontal: 3,
    backgroundColor: '#D94625', justifyContent: 'center', alignItems: 'center',
  },
  cartBadgeText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },

  // White content sheet sweeping up over the image with a big rounded curve
  // (cart-2 style).
  sheet: { flex: 1, marginTop: -44, backgroundColor: '#FFFFFF', borderTopLeftRadius: 44, borderTopRightRadius: 44 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 120 },
  eyebrow: { fontSize: 11, letterSpacing: 1.5, color: '#D94625', fontFamily: typography.labelMedium.fontFamily, marginBottom: 8 },
  title: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#0F172A', letterSpacing: -0.5, marginBottom: 10 },
  desc: { fontSize: 14, lineHeight: 21, color: '#64748B', marginBottom: 20 },

  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metaBox: { flex: 1, backgroundColor: '#EEF2FB', borderRadius: 14, paddingVertical: 16, paddingHorizontal: 16 },
  metaLabel: { fontSize: 10, letterSpacing: 1, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily, marginBottom: 6 },
  metaValue: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  sectionLabel: { fontSize: 11, letterSpacing: 1.5, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily, marginBottom: 12 },
  includedList: { gap: 12, marginBottom: 28 },
  includedItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  checkDot: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: '#FDECE7',
    justifyContent: 'center', alignItems: 'center', marginTop: 1,
  },
  includedText: { flex: 1, fontSize: 14, lineHeight: 20, color: '#334155' },

  stepsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 28 },
  stepCard: {
    width: '47%', flexGrow: 1,
    borderWidth: 1, borderColor: '#F1F5F9', borderRadius: 14, padding: 14,
    backgroundColor: '#FFFFFF',
  },
  stepNum: { fontSize: 12, fontFamily: typography.h4.fontFamily, color: '#D94625', marginBottom: 6 },
  stepTitle: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A', marginBottom: 4 },
  stepDesc: { fontSize: 12, lineHeight: 17, color: '#94A3B8' },

  proofBox: { backgroundColor: '#20304C', borderRadius: 16, padding: 20 },
  proofLabel: { fontSize: 11, letterSpacing: 1.5, color: '#FCD9C8', fontFamily: typography.labelMedium.fontFamily, marginBottom: 8 },
  proofText: { fontSize: 14, lineHeight: 21, color: '#E2E8F0' },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28,
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
    shadowColor: '#1E293B', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 10,
  },
  bottomPrice: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  bottomDuration: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  cta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#F97316', borderRadius: 30, paddingHorizontal: 22, paddingVertical: 15,
  },
  ctaDisabled: { backgroundColor: '#94A3B8' },
  ctaText: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
});

export default ServiceInfo;
