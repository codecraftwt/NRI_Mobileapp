import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Dimensions, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useServiceCategories } from '../../Hooks/useServiceCategories';

const { width: W, height: H } = Dimensions.get('window');

const categoryDetails = {
  // Original Mappings
  'Parent Care': { displayName: 'Parent & Elder Care', icon: 'favorite-border', color: '#D94625', desc: 'Scheduled visits, wellness reports & esc...' },
  'Property Management': { displayName: 'Property Care', icon: 'domain', color: '#1E3A8A', desc: 'Inspections, tenant management & mai...' },
  'Government Documentation': { displayName: 'Govt. Documents', icon: 'account-balance', color: '#92400E', desc: '7/12, PAN, Aadhaar, Passport, OCI & mo...' },
  'Legal Services': { displayName: 'Legal & Finance', icon: 'gavel', color: '#047857', desc: 'Will drafting, NRI tax, FEMA & investm...' },
  'Travel & Transport': { displayName: 'Travel & Transport', icon: 'airport-shuttle', color: '#4338CA', desc: 'Airport pickup, car rental & India visit p...' },
  'Home Repair': { displayName: 'Home Maintenance', icon: 'build', color: '#B45309', desc: 'Plumbing, electrical, deep cleaning & pa...' },
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

function Services({ navigation }) {
  const { categories, loading } = useServiceCategories();
  const [search, setSearch] = useState('');

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
          <Icon name="crop-free" size={20} color="#64748B" />
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
                onPress={() => navigation.navigate('ServiceDetail', { category: cat })}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: '#20304C', // Dark blue status bar & header
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
    marginBottom: 24,
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
  }
});

export default Services;
