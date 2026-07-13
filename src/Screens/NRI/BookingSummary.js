import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { addTicket } from '../../Redux/slices/ticketsSlice';

function BookingSummary({ route, navigation }) {
  const { service, category } = route.params || { service: { name: 'Service', customerPrice: '₹699' }, category: 'General' };
  const dispatch = useDispatch();
  const [notes, setNotes] = useState('');
  const [urgency, setUrgency] = useState('Standard');

  const urgencies = [
    { name: 'Standard', surcharge: 0, color: '#007AFF', time: 'Next day' },
    { name: 'Express', surcharge: 499, color: '#FF9800', time: 'Same day (2-4 hrs)' },
    { name: 'Emergency', surcharge: 999, color: '#EF4444', time: 'Immediate (2 hrs)' },
  ];

  const basePrice = parseInt(service.customerPrice.replace(/[^\d]/g, ''), 10) || 699;
  const selectedUrgency = urgencies.find(u => u.name === urgency);
  const totalPrice = basePrice + selectedUrgency.surcharge;
  const gst = Math.round(totalPrice * 0.18);
  const grandTotal = totalPrice + gst;

  const handleConfirmBooking = () => {
    dispatch(addTicket({
      id: `TKT-${Date.now().toString().slice(-4)}`,
      service: service.name,
      category: category,
      vendor: 'Assigning...',
      status: 'New',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      priority: urgency,
      notes: notes || 'No special instructions',
    }));

    Alert.alert(
      'Booking Confirmed!',
      `Your ${service.name} request has been submitted. Our team will assign a vendor shortly.`,
      [{ text: 'View My Tickets', onPress: () => navigation.navigate('My Tickets') }]
    );
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Booking Summary" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.serviceCard}>
          <View style={styles.serviceHeaderRow}>
            <Icon name="room-service" size={24} color="#007AFF" />
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceTitle}>{service.name}</Text>
              <Text style={styles.serviceCategory}>{category}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Select Urgency</Text>
          <View style={styles.urgencyGrid}>
            {urgencies.map(u => (
              <TouchableOpacity
                key={u.name}
                style={[styles.urgencyCard, urgency === u.name && { borderColor: u.color, backgroundColor: u.color + '10' }]}
                onPress={() => setUrgency(u.name)}
              >
                <Icon name={u.name === 'Emergency' ? 'warning' : u.name === 'Express' ? 'flash-on' : 'schedule'} size={20} color={urgency === u.name ? u.color : '#999'} />
                <Text style={[styles.urgencyName, urgency === u.name && { color: u.color }]}>{u.name}</Text>
                <Text style={styles.urgencyTime}>{u.time}</Text>
                {u.surcharge > 0 && <Text style={[styles.urgencySurcharge, { color: u.color }]}>+₹{u.surcharge}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Special Instructions</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any special instructions for the vendor..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Price Breakdown</Text>
          <View style={styles.billRow}><Text style={styles.billLabel}>Service Charge</Text><Text style={styles.billValue}>₹{basePrice}</Text></View>
          {selectedUrgency.surcharge > 0 && (
            <View style={styles.billRow}><Text style={styles.billLabel}>{urgency} Surcharge</Text><Text style={styles.billValue}>+₹{selectedUrgency.surcharge}</Text></View>
          )}
          <View style={styles.billRow}><Text style={styles.billLabel}>GST (18%)</Text><Text style={styles.billValue}>₹{gst}</Text></View>
          <View style={styles.divider} />
          <View style={styles.billRow}><Text style={styles.grandLabel}>Grand Total</Text><Text style={styles.grandValue}>₹{grandTotal}</Text></View>
        </View>

        <View style={styles.paymentCard}>
          <View style={styles.paymentMethodRow}>
            <Icon name="credit-card" size={18} color="#007AFF" />
            <Text style={styles.paymentMethodText}>Pay after service completion</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmBooking}>
          <Text style={styles.confirmBtnText}>Confirm Booking</Text>
          <Icon name="check-circle" size={20} color="white" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  serviceCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  serviceHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  serviceCategory: { fontSize: 12, color: '#666', marginTop: 2 },
  sectionCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  urgencyGrid: { flexDirection: 'row', gap: 8 },
  urgencyCard: { flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, alignItems: 'center', gap: 4 },
  urgencyName: { fontSize: 12, fontWeight: 'bold', color: '#333', marginTop: 4 },
  urgencyTime: { fontSize: 9, color: '#999', textAlign: 'center' },
  urgencySurcharge: { fontSize: 10, fontWeight: 'bold', marginTop: 2 },
  notesInput: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, color: '#333', textAlignVertical: 'top', height: 80 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  billLabel: { fontSize: 14, color: '#666' },
  billValue: { fontSize: 14, color: '#333', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 8 },
  grandLabel: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  grandValue: { fontSize: 18, fontWeight: 'bold', color: '#FF7C1A' },
  paymentCard: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  paymentMethodText: { fontSize: 13, color: '#4CAF50', fontWeight: '600' },
  confirmBtn: { flexDirection: 'row', backgroundColor: '#FF7C1A', height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', gap: 8, shadowColor: '#FF7C1A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 3 },
  confirmBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default BookingSummary;
