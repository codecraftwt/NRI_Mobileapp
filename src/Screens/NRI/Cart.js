import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';
import { removeFromCart, clearCart, selectCartItems, selectCartSubtotal } from '../../Redux/slices/cartSlice';
import { usePlans } from '../../Hooks/usePlans';
import { useCartPriceSync } from '../../Hooks/useCartPriceSync';
import SubmitRequest from './SubmitRequest';

const GST_RATE = 0.18;

const toAmount = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const fmt = (v) => `$${toAmount(v).toFixed(2)}`;

function SummaryRow({ label, sub, value, strong }) {
  return (
    <View style={styles.sumRow}>
      <Text style={[styles.sumLabel, strong && styles.sumLabelStrong]}>
        {label}{!!sub && <Text style={styles.sumSub}> {sub}</Text>}
      </Text>
      <Text style={[styles.sumValue, strong && styles.sumValueStrong]}>{value}</Text>
    </View>
  );
}

function Cart({ navigation }) {
  const dispatch = useDispatch();
  const items = useSelector(selectCartItems);
  const servicesTotal = useSelector(selectCartSubtotal);
  const isAuthenticated = useSelector(s => s.user?.isAuthenticated);
  // Live membership plan — read here (before any early return) so the hook order
  // stays stable across the guest/authenticated branches. Only used by the guest
  // summary below; the authenticated branch ignores it.
  const { regularPlans } = usePlans();
  // Keep the guest cart's service prices exact (matches OnboardingPayment). Gated
  // to guests so the authenticated SubmitRequest path never triggers a refetch.
  useCartPriceSync(!isAuthenticated);

  // Signed-in members get the "Submit Request" checkout (create + pay for a
  // service request). Guests keep the membership + sign-in/register cart below.
  if (isAuthenticated) {
    return <SubmitRequest navigation={navigation} />;
  }

  // Annual NRI Circle membership that activates a guest's account before their
  // first service request can be dispatched. Pull the live plan + price from the
  // same source OnboardingPayment uses so the total shown here matches the
  // "Amount Payable" (and the amount Stripe actually charges) exactly.
  const plan = regularPlans.find(p => p.isPopular) || regularPlans[0] || null;
  const membershipRate = toAmount(plan?.usdPrice) || toAmount(plan?.price) || 0;

  // GST rounded to cents to match OnboardingPayment / the backend charge.
  const membershipGst = Math.round(membershipRate * GST_RATE * 100) / 100;
  const membershipTotal = membershipRate + membershipGst;

  // The backend does not apply GST to services when they are bundled into the
  // membership subscription checkout (guest flow).
  const servicesGst = 0;
  const grandTotal = servicesTotal + servicesGst + membershipTotal;

  const empty = items.length === 0;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Header card */}
      <View style={styles.headerCard}>
        <View style={styles.stepper}>
          <Text style={styles.stepActive}>● CART</Text>
          <Text style={styles.stepDim}>— ACCOUNT</Text>
          <Text style={styles.stepDim}>— PAYMENT</Text>
        </View>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Your Cart</Text>
            <Text style={styles.headerSub}>{items.length} service{items.length === 1 ? '' : 's'} added</Text>
          </View>
          {!empty && (
            <TouchableOpacity style={styles.clearBtn} onPress={() => dispatch(clearCart())}>
              <Icon name="delete-outline" size={16} color="#FFFFFF" />
              <Text style={styles.clearBtnText}>Clear cart</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {empty ? (
        <View style={styles.emptyWrap}>
          <Icon name="shopping-cart" size={54} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyDesc}>Browse services and add the ones you need.</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => navigation.navigate('GuestServices')}>
            <Text style={styles.browseBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Selected services */}
          <Text style={styles.sectionLabel}>SELECTED SERVICES</Text>
          {items.map((it) => (
            <View key={it.serviceId} style={styles.itemCard}>
              <View style={styles.itemIcon}>
                <Icon name="description" size={20} color="#20304C" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName} numberOfLines={2}>{it.name}</Text>
                <View style={styles.itemMetaRow}>
                  <View style={styles.itemBadge}>
                    <Text style={styles.itemBadgeText}>{(it.categoryName || '').toUpperCase()}</Text>
                  </View>
                  {!!it.durationLabel && (
                    <View style={styles.itemDuration}>
                      <Icon name="schedule" size={12} color="#94A3B8" />
                      <Text style={styles.itemDurationText}>{it.durationLabel}</Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 8 }}>
                <TouchableOpacity onPress={() => dispatch(removeFromCart(it.serviceId))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="delete-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {/* Trust row */}
          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <Icon name="verified-user" size={18} color="#20304C" />
              <Text style={styles.trustText}>Verified Vendors</Text>
            </View>
            <View style={styles.trustItem}>
              <Icon name="price-check" size={18} color="#20304C" />
              <Text style={styles.trustText}>Transparent Pricing</Text>
            </View>
            <View style={styles.trustItem}>
              <Icon name="support-agent" size={18} color="#20304C" />
              <Text style={styles.trustText}>Family-First Support</Text>
            </View>
          </View>

          {/* Membership / auth prompt (guests only) */}
          {!isAuthenticated && (
            <View style={styles.authCard}>
              <Text style={styles.authTitle}>Almost there</Text>
              <Text style={styles.authDesc}>
                Your account needs an active NRI Circle membership before we can send your
                service request to a vendor.
              </Text>
              <View style={styles.authBtnRow}>
                <TouchableOpacity style={styles.signInBtn} onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.registerBtn} onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerText}>Register</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.authFoot}>
                Already a member? Sign in and we'll pick up right where you left off. New here?
                Register — your cart is saved.
              </Text>
            </View>
          )}

          {/* Order summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHead}>
              <Icon name="receipt-long" size={20} color="#20304C" />
              <Text style={styles.summaryTitle}>Order Summary</Text>
            </View>
            <SummaryRow label="Services" value={String(items.length)} />
            <SummaryRow label="Services total" value={fmt(servicesTotal)} />
            <SummaryRow label="Services GST" sub={servicesGst > 0 ? "(18%)" : "(Included in Membership)"} value={fmt(servicesGst)} />
            {!isAuthenticated && (
              <>
                <View style={styles.divider} />
                <SummaryRow label="Membership rate" value={fmt(membershipRate)} />
                <SummaryRow label="Membership GST" sub="(18%)" value={fmt(membershipGst)} />
                <SummaryRow label="Membership total" sub="(activates your account)" value={fmt(membershipTotal)} />
              </>
            )}
            <View style={styles.payBox}>
              <Text style={styles.payLabel}>You'll pay</Text>
              <Text style={styles.payValue}>{fmt(grandTotal)}</Text>
            </View>
            <Text style={styles.disclaimer}>
              Services above reflect the average vendor rate in your city — the final amount is
              set by the verified vendor covering your exact address. Membership activates your
              account and is billed once, annually.
            </Text>

            {isAuthenticated ? (
              <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('AppHome')}>
                <Text style={styles.primaryBtnText}>Continue to Checkout</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.keepBrowsingBtn} onPress={() => navigation.navigate('GuestServices')}>
                <Text style={styles.keepBrowsingText}>Keep Browsing</Text>
              </TouchableOpacity>
            )}

            <View style={styles.footRow}>
              <View style={styles.footItem}><Icon name="shield" size={14} color="#10B981" /><Text style={styles.footText}>Secure checkout</Text></View>
              <View style={styles.footItem}><Icon name="check-circle" size={14} color="#10B981" /><Text style={styles.footText}>Verified local vendors only</Text></View>
              <View style={styles.footItem}><Icon name="autorenew" size={14} color="#10B981" /><Text style={styles.footText}>7-day refund policy</Text></View>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  headerCard: {
    backgroundColor: '#20304C',
    paddingTop: STATUS_BAR_HEIGHT - 8,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  stepper: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  stepActive: { fontSize: 10, letterSpacing: 1, color: '#FFFFFF', fontFamily: typography.labelMedium.fontFamily },
  stepDim: { fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,0.4)', fontFamily: typography.labelMedium.fontFamily },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerBack: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
  },
  clearBtnText: { fontSize: 12, color: '#FFFFFF', fontFamily: typography.labelMedium.fontFamily },

  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.5, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily, marginBottom: 12 },

  itemCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  itemIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#EEF2FB',
    justifyContent: 'center', alignItems: 'center',
  },
  itemName: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A', marginBottom: 6 },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  itemBadge: { backgroundColor: '#EEF2FB', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  itemBadgeText: { fontSize: 9, letterSpacing: 0.5, color: '#20304C', fontFamily: typography.labelMedium.fontFamily },
  itemDuration: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  itemDurationText: { fontSize: 11, color: '#94A3B8' },
  itemPrice: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#D94625' },

  trustRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: 8,
    marginTop: 8, marginBottom: 20,
  },
  trustItem: {
    flex: 1, alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 8,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  trustText: { fontSize: 10, color: '#64748B', textAlign: 'center', fontFamily: typography.labelMedium.fontFamily },

  authCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginBottom: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  authTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 6 },
  authDesc: { fontSize: 13, lineHeight: 19, color: '#64748B', marginBottom: 16 },
  authBtnRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  signInBtn: {
    flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  signInText: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  registerBtn: { flex: 1, backgroundColor: '#F97316', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  registerText: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
  authFoot: { fontSize: 11, lineHeight: 16, color: '#94A3B8' },

  summaryCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  summaryHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  summaryTitle: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
  sumLabel: { fontSize: 14, color: '#64748B' },
  sumLabelStrong: { color: '#0F172A', fontFamily: typography.h4.fontFamily },
  sumSub: { fontSize: 12, color: '#94A3B8' },
  sumValue: { fontSize: 14, color: '#0F172A', fontFamily: typography.labelMedium.fontFamily },
  sumValueStrong: { fontFamily: typography.h4.fontFamily },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 },

  payBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#EEF2FB', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, marginTop: 12,
  },
  payLabel: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  payValue: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#20304C' },
  disclaimer: { fontSize: 11, lineHeight: 16, color: '#94A3B8', marginTop: 12 },

  primaryBtn: { backgroundColor: '#F97316', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 16 },
  primaryBtnText: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
  keepBrowsingBtn: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 16,
  },
  keepBrowsingText: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A' },

  footRow: { marginTop: 16, gap: 8 },
  footItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footText: { fontSize: 12, color: '#64748B' },

  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginTop: 8 },
  emptyDesc: { fontSize: 14, color: '#94A3B8', textAlign: 'center' },
  browseBtn: { backgroundColor: '#F97316', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14, marginTop: 12 },
  browseBtnText: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
});

export default Cart;
