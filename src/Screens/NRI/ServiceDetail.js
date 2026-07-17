import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useServicesByCategory } from '../../Hooks/useServicesByCategory';
import { typography } from '../../theme';

function ServiceDetail({ route, navigation }) {
  const { category } = route.params;
  const [activeTab, setActiveTab] = useState('base'); // 'base' or 'addons'
  const [selectedAddonIds, setSelectedAddonIds] = useState([]);
  const [selectedBaseServiceIds, setSelectedBaseServiceIds] = useState([]);

  // Fetch services
  const { services: baseServices, loading: loadingBase } = useServicesByCategory(category.name, '', { type: 'base' });
  const { services: addonServices, loading: loadingAddons } = useServicesByCategory(category.name, '', { type: 'addon' });

  const toggleAddon = (id) => {
    setSelectedAddonIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleBook = () => {
    navigation.navigate('CreateTicket', {
      initialCategory: category.name,
      initialAddons: selectedAddonIds,
      initialBaseServiceIds: selectedBaseServiceIds,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header / Hero Section */}
      <View style={styles.heroSection}>
        <View style={[styles.heroTopRow, { zIndex: 10 }]}>
          <View style={styles.headerLeft}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Icon name="arrow-back" size={22} color={category.color} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{category.name}</Text>
          </View>
          <View style={[styles.headerIconBox, { backgroundColor: category.color + '15' }]}>
            <Icon name={category.icon} size={20} color={category.color} />
          </View>
        </View>

        <View style={styles.heroContent}>
          <Text style={styles.heroDesc}>{category.desc}</Text>

          <TouchableOpacity 
            style={[styles.bookBtn, (selectedBaseServiceIds || []).length === 0 && styles.bookBtnDisabled]} 
            onPress={handleBook}
            disabled={(selectedBaseServiceIds || []).length === 0}
          >
            <Text style={styles.bookBtnText}>Book This Service</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'base' && styles.activeTab]}
            onPress={() => setActiveTab('base')}
          >
            <Text style={[styles.tabText, activeTab === 'base' && styles.activeTabText]}>Base (Included)</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'addons' && styles.activeTab]}
            onPress={() => setActiveTab('addons')}
          >
            <Text style={[styles.tabText, activeTab === 'addons' && styles.activeTabText]}>Add-On Services</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {activeTab === 'addons' ? (
          loadingAddons ? (
            <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
          ) : addonServices.length === 0 ? (
            <Text style={styles.emptyText}>No add-on services available.</Text>
          ) : (
            addonServices.map(s => {
              const isSelected = selectedAddonIds.includes(s.id);
              return (
                <View key={s.id} style={styles.serviceCard}>
                  <View style={styles.serviceCardLeft}>
                    <Text style={styles.serviceCardTitle}>{s.name}</Text>
                    <Text style={styles.serviceCardSub}>{s.pricing?.turnaroundLabel || 'Standard turnaround'}</Text>
                  </View>
                  <View style={styles.serviceCardRight}>
                    <Text style={styles.serviceCardPrice}>{s.pricing?.displayPrice}</Text>
                    <TouchableOpacity 
                      style={[styles.addBtn, isSelected && styles.addedBtn]}
                      onPress={() => toggleAddon(s.id)}
                    >
                      <Text style={[styles.addBtnText, isSelected && styles.addedBtnText]}>
                        {isSelected ? '✓ Added' : '+ Add'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )
        ) : (
          loadingBase ? (
            <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
          ) : baseServices.length === 0 ? (
            <Text style={styles.emptyText}>No base services available.</Text>
          ) : (
            baseServices.map(s => {
              const safeIds = selectedBaseServiceIds || [];
              const isSelected = safeIds.includes(s.id);
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                  onPress={() => setSelectedBaseServiceIds(prev => ((prev || []).includes(s.id) ? [] : [s.id]))}
                  activeOpacity={0.7}
                >
                  <View style={styles.serviceCardLeft}>
                    <Text style={styles.serviceCardTitle}>{s.name}</Text>
                    <Text style={styles.serviceCardSub}>{s.pricing?.turnaroundLabel || 'Standard turnaround'}</Text>
                  </View>
                  <View style={styles.serviceCardRight}>
                    <View style={styles.includedPill}>
                      <Text style={styles.includedPillText}>Included</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7', // Matches the cream background
  },
  heroSection: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    paddingRight: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: typography.h2.fontFamily,
    color: '#1E293B',
    flex: 1,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    marginTop: 4,
  },
  heroDesc: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  bookBtn: {
    backgroundColor: '#D94625',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookBtnDisabled: {
    backgroundColor: '#CBD5E1', // slate-300
  },
  bookBtnText: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#FFFFFF',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F3EFE9', // Light beige
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: typography.labelLarge.fontFamily,
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#D94625',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 10,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
    fontSize: 14,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceCardSelected: {
    borderColor: '#D94625',
  },
  serviceCardLeft: {
    flex: 1,
    paddingRight: 16,
  },
  serviceCardTitle: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#1E293B',
    marginBottom: 4,
  },
  serviceCardSub: {
    fontSize: 13,
    color: '#94A3B8',
  },
  serviceCardRight: {
    alignItems: 'flex-end',
  },
  serviceCardPrice: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#D94625',
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9462540',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  addedBtn: {
    backgroundColor: '#F6FFED',
    borderColor: '#F6FFED',
  },
  addBtnText: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#D94625',
  },
  addedBtnText: {
    color: '#059669',
  },
  includedPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  includedPillText: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#059669',
  }
});

export default ServiceDetail;
