import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { updateMembership } from '../../../Redux/slices/userSlice';
import { addInvoice } from '../../../Redux/slices/walletSlice';

function Payment({ route, navigation }) {
  const { plan } = route.params || { plan: { id: 'Family', price: '₹24,999' } };
  const dispatch = useDispatch();
  const wallet = useSelector(state => state.wallet);

  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [loading, setLoading] = useState(false);

  const basePriceVal = parseInt(plan.price.replace(/[^\d]/g, ''));
  const discountVal = discount;
  const priceAfterDiscount = basePriceVal - discountVal;
  const gstVal = Math.round(priceAfterDiscount * 0.18);
  const grandTotal = priceAfterDiscount + gstVal;

  const handleApplyCoupon = () => {
    const matched = wallet.coupons.find(c => c.code.toUpperCase() === couponCode.toUpperCase());
    if (matched) {
      if (matched.discountType === 'percentage') {
        const val = Math.round(basePriceVal * (matched.discountValue / 100));
        setDiscount(val);
      } else {
        setDiscount(matched.discountValue);
      }
      Alert.alert('Coupon Applied', `Code ${matched.code} applied successfully! Discount of ₹${discount} deducted.`);
    } else {
      Alert.alert('Invalid Coupon', 'The coupon code entered is invalid or expired.');
    }
  };

  const handleProcessPayment = () => {
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      
      // Update membership in Redux user state
      dispatch(updateMembership(plan.id));

      // Add transaction invoice in wallet
      dispatch(addInvoice({
        id: `INV-2026-${Date.now().toString().slice(-4)}`,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        description: `${plan.id} Membership Plan (Annual)`,
        amount: basePriceVal,
        status: 'Paid',
        cgst: Math.round(gstVal / 2),
        sgst: Math.round(gstVal / 2),
        igst: 0,
        total: grandTotal,
      }));

      Alert.alert(
        'Payment Successful!',
        `Welcome to NRI Circle ${plan.id} Plan! You can now add family and property details from the dashboard.`,
        [
          { 
            text: 'Go to Dashboard', 
            onPress: () => navigation.navigate('AppHome') 
          }
        ]
      );
    }, 2000); // 2-second simulation
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Plan Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Plan Summary Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Plan Summary</Text>
          <View style={styles.planSummaryRow}>
            <View>
              <Text style={styles.planName}>{plan.id} Tier</Text>
              <Text style={styles.planTerm}>Annual Membership Plan</Text>
            </View>
            <Text style={styles.planPriceText}>{plan.price}</Text>
          </View>
        </View>

        {/* Coupons Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Apply Coupon</Text>
          <View style={styles.couponRow}>
            <TextInput
              style={styles.couponInput}
              placeholder="WELCOME20, SAVE2000..."
              placeholderTextColor="#94A3B8"
              autoCapitalize="characters"
              value={couponCode}
              onChangeText={setCouponCode}
            />
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCoupon}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Price Summary Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Billing Summary</Text>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Base Amount</Text>
            <Text style={styles.billValue}>₹{basePriceVal}</Text>
          </View>
          {discount > 0 && (
            <View style={styles.billRow}>
              <Text style={[styles.billLabel, { color: '#10B981' }]}>Coupon Discount</Text>
              <Text style={[styles.billValue, { color: '#10B981' }]}>-₹{discount}</Text>
            </View>
          )}
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>GST (18%)</Text>
            <Text style={styles.billValue}>₹{gstVal}</Text>
          </View>
          <View style={styles.billDivider} />
          <View style={[styles.billRow, { marginTop: 8 }]}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>₹{grandTotal}</Text>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity 
            style={[styles.methodRow, paymentMethod === 'card' && styles.methodRowActive]}
            onPress={() => setPaymentMethod('card')}
          >
            <Icon name="credit-card" size={24} color={paymentMethod === 'card' ? '#007AFF' : '#666'} />
            <Text style={styles.methodText}>Stripe (International Credit/Debit Card)</Text>
            <View style={[styles.radioCircle, paymentMethod === 'card' && styles.radioActive]} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.methodRow, paymentMethod === 'upi' && styles.methodRowActive]}
            onPress={() => setPaymentMethod('upi')}
          >
            <Icon name="phone-android" size={24} color={paymentMethod === 'upi' ? '#007AFF' : '#666'} />
            <Text style={styles.methodText}>Razorpay UPI (Google Pay, PhonePe, Paytm)</Text>
            <View style={[styles.radioCircle, paymentMethod === 'upi' && styles.radioActive]} />
          </TouchableOpacity>
        </View>

        {/* Action Button */}
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginVertical: 20 }} />
        ) : (
          <TouchableOpacity style={styles.payBtn} onPress={handleProcessPayment}>
            <Text style={styles.payBtnText}>Pay & Activate</Text>
            <Icon name="payment" size={20} color="white" />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  planSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  planTerm: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  planPriceText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  couponRow: {
    flexDirection: 'row',
    gap: 10,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 46,
    color: '#333',
    fontWeight: 'bold',
  },
  applyBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  applyBtnText: {
    color: 'white',
    fontWeight: 'bold',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  billLabel: {
    fontSize: 14,
    color: '#666',
  },
  billValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF7C1A', // matching the grand total color scheme
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginVertical: 6,
    gap: 10,
  },
  methodRowActive: {
    borderColor: '#007AFF',
    backgroundColor: '#E5F1FF',
  },
  methodText: {
    fontSize: 12,
    color: '#333',
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#999',
  },
  radioActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  payBtn: {
    flexDirection: 'row',
    backgroundColor: '#FF7C1A',
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: '#FF7C1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  payBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Payment;
