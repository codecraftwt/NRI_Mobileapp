import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';

function ServiceDetail({ route, navigation }) {
  const { category } = route.params || { category: { name: 'Parent & Elder Care', icon: 'favorite', color: '#FF6B6B' } };

  const sampleServices = [
    { name: 'Extra Home Visit', customerPrice: '₹699', vendorCost: '₹400', turnaround: 'Same / Next day' },
    { name: 'Doctor Appointment Booking', customerPrice: '₹299', vendorCost: '₹150', turnaround: '24 hrs' },
    { name: 'Doctor Visit Escort', customerPrice: '₹999', vendorCost: '₹600', turnaround: 'Scheduled' },
    { name: 'Medicine Purchase & Delivery', customerPrice: '₹199 + cost', vendorCost: '₹100 + cost', turnaround: 'Same day' },
    { name: 'Nursing (Full Day 12 hrs)', customerPrice: '₹1,999', vendorCost: '₹1,200', turnaround: '24 hrs notice' },
    { name: 'Physiotherapy Home Visit', customerPrice: '₹799', vendorCost: '₹500', turnaround: '48 hrs notice' },
    { name: 'Blood Test Collection', customerPrice: '₹499 + lab', vendorCost: '₹250 + cost', turnaround: 'Same day' },
    { name: 'Grocery Shopping & Delivery', customerPrice: '₹299 + cost', vendorCost: '₹150 + cost', turnaround: 'Same day' },
  ];

  const [selectedService, setSelectedService] = useState(null);

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'Standard': return { bg: '#E5F1FF', text: '#007AFF' };
      case 'Express': return { bg: '#FFF3E0', text: '#FF9800' };
      case 'Emergency': return { bg: '#FFEBEE', text: '#EF4444' };
      default: return { bg: '#F3F4F6', text: '#666' };
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={category.name} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.categoryHeader}>
          <View style={[styles.catIcon, { backgroundColor: category.color + '20' }]}>
            <Icon name={category.icon} size={36} color={category.color} />
          </View>
          <Text style={styles.catTitle}>{category.name}</Text>
          <Text style={styles.catDesc}>Select a service below to book. Each service has standard pricing with optional express delivery.</Text>
        </View>

        <View style={styles.urgencyRow}>
          {['Standard', 'Express', 'Emergency'].map(u => {
            const colors = getUrgencyColor(u);
            return (
              <TouchableOpacity key={u} style={[styles.urgencyChip, { backgroundColor: colors.bg }]}>
                <Text style={[styles.urgencyText, { color: colors.text }]}>{u}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {sampleServices.map((svc, idx) => {
          const isSelected = selectedService === idx;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
              onPress={() => setSelectedService(isSelected ? null : idx)}
              activeOpacity={0.7}
            >
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceName}>{svc.name}</Text>
                {isSelected && <Icon name="check-circle" size={20} color="#007AFF" />}
              </View>
              <View style={styles.servicePriceRow}>
                <Text style={styles.servicePrice}>{svc.customerPrice}</Text>
                <Text style={styles.serviceTurnaround}>{svc.turnaround}</Text>
              </View>
              {isSelected && (
                <View style={styles.serviceExpanded}>
                  <View style={styles.serviceMetaRow}>
                    <Text style={styles.metaLabel}>Platform Price</Text>
                    <Text style={styles.metaValue}>{svc.customerPrice}</Text>
                  </View>
                  <View style={styles.serviceMetaRow}>
                    <Text style={styles.metaLabel}>Turnaround</Text>
                    <Text style={styles.metaValue}>{svc.turnaround}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => navigation.navigate('BookingSummary', { service: svc, category: category.name })}
                  >
                    <Text style={styles.bookBtnText}>Book Now</Text>
                    <Icon name="arrow-forward" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 10 },
  categoryHeader: { alignItems: 'center', padding: 20, backgroundColor: 'white', borderRadius: 16, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  catIcon: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  catTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  catDesc: { fontSize: 12, color: '#666', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  urgencyRow: { flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 8 },
  urgencyChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  urgencyText: { fontSize: 12, fontWeight: 'bold' },
  serviceCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  serviceCardSelected: { borderWidth: 2, borderColor: '#007AFF' },
  serviceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 14, fontWeight: 'bold', color: '#333', flex: 1 },
  servicePriceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  servicePrice: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  serviceTurnaround: { fontSize: 12, color: '#666' },
  serviceExpanded: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  serviceMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metaLabel: { fontSize: 13, color: '#666' },
  metaValue: { fontSize: 13, color: '#333', fontWeight: '600' },
  bookBtn: { flexDirection: 'row', backgroundColor: '#007AFF', height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 },
  bookBtnText: { color: 'white', fontSize: 14, fontWeight: 'bold' },
});

export default ServiceDetail;
