import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';

function ServicesCatalog({ navigation }) {
  const categories = [
    { name: 'Parent & Elder Care', icon: 'favorite-border', color: '#D94625', desc: 'Scheduled visits, wellness reports & esc...' },
    { name: 'Property Care', icon: 'domain', color: '#1E3A8A', desc: 'Inspections, tenant management & mai...' },
    { name: 'Govt. Documents', icon: 'account-balance', color: '#92400E', desc: '7/12, PAN, Aadhaar, Passport, OCI & mo...' },
    { name: 'Legal & Finance', icon: 'gavel', color: '#047857', desc: 'Will drafting, NRI tax, FEMA & investm...' },
    { name: 'Travel & Transport', icon: 'airport-shuttle', color: '#4338CA', desc: 'Airport pickup, car rental & India visit p...' },
    { name: 'Home Maintenance', icon: 'build', color: '#B45309', desc: 'Plumbing, electrical, deep cleaning & pa...' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Services</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.searchBar}>
          <Icon name="crop-free" size={20} color="#64748B" />
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search services..." 
            placeholderTextColor="#94A3B8"
          />
        </View>

        <View style={styles.list}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.name}
              style={styles.catCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('ServiceDetail', { category: cat })}
            >
              <View style={[styles.catIcon, { backgroundColor: cat.color + '15' }]}>
                <Icon name={cat.icon} size={24} color={cat.color} />
              </View>
              <View style={styles.catInfo}>
                <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                <Text style={styles.catDesc} numberOfLines={1}>{cat.desc}</Text>
              </View>
              <Icon name="chevron-right" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#FDFBF7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  searchBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    borderRadius: 16, 
    paddingHorizontal: 16, 
    height: 52, 
    gap: 12, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#64748B', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 12, 
    elevation: 2 
  },
  searchInput: { 
    flex: 1, 
    fontSize: 15, 
    color: '#0F172A',
  },
  list: { gap: 16 },
  catCard: { 
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
    elevation: 3 
  },
  catIcon: { 
    width: 52, 
    height: 52, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  catInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  catName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  catDesc: { fontSize: 13, color: '#64748B' },
});

export default ServicesCatalog;
