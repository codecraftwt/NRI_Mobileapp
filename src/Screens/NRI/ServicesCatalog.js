import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';

function ServicesCatalog({ navigation }) {
  const categories = [
    { name: 'Parent & Elder Care', icon: 'favorite', color: '#FF6B6B', count: 24 },
    { name: 'Property Care & Management', icon: 'location-city', color: '#FFA726', count: 28 },
    { name: 'Government Documentation', icon: 'description', color: '#42A5F5', count: 26 },
    { name: 'Legal & Financial', icon: 'gavel', color: '#AB47BC', count: 18 },
    { name: 'Travel & Transportation', icon: 'airport-shuttle', color: '#26A69A', count: 15 },
    { name: 'Home Maintenance', icon: 'build', color: '#EF5350', count: 22 },
    { name: 'Gifts & Celebrations', icon: 'card-giftcard', color: '#EC407A', count: 15 },
    { name: 'Emergency Assistance', icon: 'error-outline', color: '#D32F2F', count: 12 },
    { name: 'Farm & Agricultural', icon: 'grass', color: '#66BB6A', count: 14 },
    { name: 'Investment & Wealth', icon: 'account-balance', color: '#7E57C2', count: 10 },
    { name: 'Education & Admissions', icon: 'school', color: '#29B6F6', count: 10 },
    { name: 'Vehicle Management', icon: 'directions-car', color: '#78909C', count: 11 },
    { name: 'Pet Care', icon: 'pets', color: '#8D6E63', count: 7 },
    { name: 'Religious & Astrology', icon: 'church', color: '#FF8A65', count: 11 },
    { name: 'Return to India Planning', icon: 'flight-takeoff', color: '#4DB6AC', count: 12 },
    { name: 'Visit Planning', icon: 'card-travel', color: '#AED581', count: 10 },
    { name: 'Custom Concierge', icon: 'star', color: '#FDD835', count: 11 },
  ];

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Services" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#999" />
          <Text style={styles.searchPlaceholder}>Search services...</Text>
        </View>

        <View style={styles.grid}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.name}
              style={styles.catCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ServiceDetail', { category: cat })}
            >
              <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                <Icon name={cat.icon} size={24} color={cat.color} />
              </View>
              <Text style={styles.catName} numberOfLines={2}>{cat.name}</Text>
              <Text style={styles.catCount}>{cat.count} services</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 16, height: 48, gap: 8, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  searchPlaceholder: { fontSize: 14, color: '#999' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: { width: '48%', backgroundColor: 'white', borderRadius: 16, padding: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  catIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  catName: { fontSize: 13, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  catCount: { fontSize: 11, color: '#999', marginTop: 4 },
});

export default ServicesCatalog;
