import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  FlatList,
  Modal,
  Pressable,
  Linking,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { getTelecallerVendors } from '../../Api/Telecaller/telecallerVendorsApi';
import { getServiceCategories } from '../../Api/catalogApi';
import { getCities } from '../../Api/geoApi';

const AVAILABILITY_OPTIONS = [
  { id: 'all', label: 'All Availability' },
  { id: 'available', label: 'Available' },
  { id: 'unavailable', label: 'Unavailable' },
];

function Vendors({ navigation }) {
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [availability, setAvailability] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempAvailability, setTempAvailability] = useState('all');
  const [tempCategory, setTempCategory] = useState(null);
  const [tempCity, setTempCity] = useState(null);

  // Filter options data
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);

  // Data state
  const [vendors, setVendors] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const searchTimer = useRef(null);

  // Count active filters
  const activeFilterCount =
    (availability !== 'all' ? 1 : 0) +
    (selectedCategory ? 1 : 0) +
    (selectedCity ? 1 : 0);

  // Load filter options (categories, cities)
  useEffect(() => {
    async function loadFilterData() {
      try {
        const [cats, cts] = await Promise.all([
          getServiceCategories().catch(() => []),
          getCities().catch(() => []),
        ]);
        setCategories(cats);
        setCities(cts);
      } catch (err) {
        console.warn('Error loading filter options:', err);
      }
    }
    loadFilterData();
  }, []);

  const fetchVendors = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      setError(null);

      const res = await getTelecallerVendors({
        q: searchQuery || undefined,
        category_id: selectedCategory?.id || undefined,
        city_id: selectedCity?.id || undefined,
        availability: availability !== 'all' ? availability : undefined,
        page: pageNum,
      });

      if (pageNum === 1) {
        setVendors(res.vendors || []);
      } else {
        setVendors(prev => [...prev, ...(res.vendors || [])]);
      }

      setPage(res.meta?.currentPage || 1);
      setLastPage(res.meta?.lastPage || 1);
      setTotalVendors(res.meta?.total || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load vendors');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [searchQuery, availability, selectedCategory, selectedCity]);

  useEffect(() => {
    fetchVendors(1);
  }, [fetchVendors]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchVendors(1, true);
  }, [fetchVendors]);

  const onEndReached = () => {
    if (!loading && !loadingMore && page < lastPage) {
      setLoadingMore(true);
      fetchVendors(page + 1);
    }
  };

  const handleSearchChange = (text) => {
    setSearch(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearchQuery(text);
    }, 400);
  };

  const clearSearch = () => {
    setSearch('');
    setSearchQuery('');
  };

  const openFilterModal = () => {
    setTempAvailability(availability);
    setTempCategory(selectedCategory);
    setTempCity(selectedCity);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setAvailability(tempAvailability);
    setSelectedCategory(tempCategory);
    setSelectedCity(tempCity);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempAvailability('all');
    setTempCategory(null);
    setTempCity(null);
    setAvailability('all');
    setSelectedCategory(null);
    setSelectedCity(null);
    setFilterModalVisible(false);
  };

  const handleCallVendor = (phone) => {
    if (!phone) return;
    Linking.openURL(`tel:${phone}`).catch(() => {});
  };

  const renderVendorCard = ({ item }) => {
    const initials = (item.businessName || 'V').substring(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        style={styles.vendorCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('VendorDetail', { vendorId: item.id, vendor: item })}
      >
        {/* Top Row: Avatar, Business Name, Owner Name, Availability Pill */}
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.businessName} numberOfLines={1}>{item.businessName}</Text>
            {item.ownerName ? (
              <View style={styles.ownerRow}>
                <Icon name="person" size={13} color="#64748B" />
                <Text style={styles.ownerText} numberOfLines={1}>{item.ownerName}</Text>
              </View>
            ) : null}
          </View>

          {/* Availability Pill */}
          <View style={[styles.availBadge, item.isAvailable ? styles.availBadgeActive : styles.availBadgeInactive]}>
            <View style={[styles.availDot, item.isAvailable ? styles.availDotActive : styles.availDotInactive]} />
            <Text style={[styles.availText, item.isAvailable ? styles.availTextActive : styles.availTextInactive]}>
              {item.isAvailable ? 'Available' : 'Unavailable'}
            </Text>
          </View>
        </View>

        {/* Footer: Rating, Total Jobs Completed & Quick Call */}
        <View style={styles.cardFooter}>
          <View style={styles.statsRow}>
            {item.rating > 0 ? (
              <View style={styles.ratingBadge}>
                <Icon name="star" size={12} color="#F59E0B" />
                <Text style={styles.ratingText}>{item.rating.toFixed(1)}</Text>
                {item.ratingCount > 0 && (
                  <Text style={styles.ratingCountText}>({item.ratingCount})</Text>
                )}
              </View>
            ) : (
              <View style={styles.noRatingBadge}>
                <Text style={styles.noRatingText}>New Vendor</Text>
              </View>
            )}

            <View style={styles.statChip}>
              <Icon name="check-circle" size={12} color="#059669" />
              <Text style={styles.statChipText}>{item.totalJobs || 0} jobs completed</Text>
            </View>
          </View>

          {item.phone ? (
            <TouchableOpacity
              style={styles.callButton}
              onPress={() => handleCallVendor(item.phone)}
              activeOpacity={0.7}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Icon name="phone" size={13} color="#059669" />
              <Text style={styles.callButtonText}>{item.phone}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Blue Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Vendors</Text>
          {totalVendors > 0 && (
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{totalVendors} total</Text>
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitle}>Directory of vendors covering your area</Text>
      </View>

      {/* Search Bar + Filter Icon */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search business, owner, phone..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={clearSearch} style={styles.clearSearchBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.filterToggleBtn, activeFilterCount > 0 && styles.filterToggleBtnActive]}
            activeOpacity={0.8}
            onPress={openFilterModal}
          >
            <Icon
              name="tune"
              size={22}
              color={activeFilterCount > 0 ? '#FFFFFF' : '#20304C'}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Active Filter Chips */}
        {activeFilterCount > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersRow}>
            {availability !== 'all' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>
                  Availability: {AVAILABILITY_OPTIONS.find(a => a.id === availability)?.label || availability}
                </Text>
                <TouchableOpacity onPress={() => setAvailability('all')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCategory && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>Category: {selectedCategory.name}</Text>
                <TouchableOpacity onPress={() => setSelectedCategory(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {selectedCity && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>City: {selectedCity.name}</Text>
                <TouchableOpacity onPress={() => setSelectedCity(null)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity onPress={resetFilters} style={styles.clearAllFiltersBtn}>
              <Text style={styles.clearAllFiltersText}>Clear all</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>

      {/* Vendors List */}
      <View style={styles.listContainer}>
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#A64416" />
            <Text style={styles.loadingText}>Loading vendors...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerEmpty}>
            <Icon name="error-outline" size={40} color="#DC2626" />
            <Text style={styles.errorTitle}>Could not load vendors</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchVendors(1)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : vendors.length === 0 ? (
          <View style={styles.centerEmpty}>
            <Icon name="storefront" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No vendors found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || activeFilterCount > 0
                ? 'Try adjusting your search query or filter options.'
                : 'There are no vendors assigned to your service area.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={vendors}
            keyExtractor={item => String(item.id)}
            renderItem={renderVendorCard}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
            onEndReached={onEndReached}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#A64416" style={{ marginVertical: 16 }} /> : null}
          />
        )}
      </View>

      {/* Filter Bottom Sheet Modal */}
      <Modal
        visible={filterModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setFilterModalVisible(false)}>
          <Pressable style={styles.filterSheet} onPress={e => e.stopPropagation()}>
            <View style={styles.filterHandleWrap}>
              <View style={styles.filterHandle} />
            </View>

            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Vendors</Text>
              <TouchableOpacity onPress={resetFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.filterResetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Availability Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Availability</Text>
                <View style={styles.optionsWrap}>
                  {AVAILABILITY_OPTIONS.map(opt => {
                    const isSelected = tempAvailability === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.optionPill, isSelected && styles.optionPillActive]}
                        onPress={() => setTempAvailability(opt.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.optionPillText, isSelected && styles.optionPillTextActive]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Service Categories Filter */}
              {categories.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>Category / Service</Text>
                  <View style={styles.optionsWrap}>
                    <TouchableOpacity
                      style={[styles.optionPill, !tempCategory && styles.optionPillActive]}
                      onPress={() => setTempCategory(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionPillText, !tempCategory && styles.optionPillTextActive]}>
                        All Categories
                      </Text>
                    </TouchableOpacity>
                    {categories.map(cat => {
                      const isSelected = tempCategory?.id === cat.id;
                      return (
                        <TouchableOpacity
                          key={String(cat.id)}
                          style={[styles.optionPill, isSelected && styles.optionPillActive]}
                          onPress={() => setTempCategory(cat)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.optionPillText, isSelected && styles.optionPillTextActive]}>
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Cities Filter */}
              {cities.length > 0 && (
                <View style={styles.filterSection}>
                  <Text style={styles.filterSectionTitle}>City Coverage</Text>
                  <View style={styles.optionsWrap}>
                    <TouchableOpacity
                      style={[styles.optionPill, !tempCity && styles.optionPillActive]}
                      onPress={() => setTempCity(null)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.optionPillText, !tempCity && styles.optionPillTextActive]}>
                        All Cities
                      </Text>
                    </TouchableOpacity>
                    {cities.slice(0, 15).map(ct => {
                      const isSelected = tempCity?.id === ct.id;
                      return (
                        <TouchableOpacity
                          key={String(ct.id)}
                          style={[styles.optionPill, isSelected && styles.optionPillActive]}
                          onPress={() => setTempCity(ct)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.optionPillText, isSelected && styles.optionPillTextActive]}>
                            {ct.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.applyBtn} onPress={applyFilters} activeOpacity={0.8}>
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },

  blueHeader: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 46,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#20304C',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  totalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  totalBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },

  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: '#FDFBF7',
    gap: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    color: '#0F172A',
    fontSize: 13,
    paddingVertical: 0,
    paddingHorizontal: 8,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  filterToggleBtnActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#A64416',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  activeFiltersRow: {
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 5,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  activeFilterPillText: {
    fontSize: 11,
    color: '#20304C',
    fontWeight: '600',
  },
  clearAllFiltersBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearAllFiltersText: {
    fontSize: 11,
    color: '#A64416',
    fontWeight: '700',
  },

  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 12,
    paddingBottom: 90,
    gap: 8,
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 10,
  },
  centerEmpty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 10,
  },
  errorSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  retryButton: {
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#A64416',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  // Vendor Card
  vendorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 1,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#20304C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerInfo: {
    flex: 1,
  },
  businessName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 1,
  },
  ownerText: {
    fontSize: 11,
    color: '#64748B',
  },

  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    gap: 5,
  },
  availBadgeActive: {
    backgroundColor: '#ECFDF5',
  },
  availBadgeInactive: {
    backgroundColor: '#F1F5F9',
  },
  availDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availDotActive: {
    backgroundColor: '#10B981',
  },
  availDotInactive: {
    backgroundColor: '#94A3B8',
  },
  availText: {
    fontSize: 10,
    fontWeight: '700',
  },
  availTextActive: {
    color: '#059669',
  },
  availTextInactive: {
    color: '#64748B',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  ratingCountText: {
    fontSize: 10,
    color: '#92400E',
  },
  noRatingBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  noRatingText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#059669',
  },
  activeJobChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  activeJobChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },

  categoriesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryTag: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTagText: {
    fontSize: 11,
    color: '#475569',
  },
  moreCategoriesTag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  moreCategoriesText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },

  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginTop: 2,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  filterHandleWrap: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  filterHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  filterResetText: {
    fontSize: 13,
    color: '#A64416',
    fontWeight: '700',
  },
  filterSection: {
    marginBottom: 16,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  optionPillActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  optionPillTextActive: {
    color: '#FFFFFF',
  },
  applyBtn: {
    backgroundColor: '#20304C',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default Vendors;
