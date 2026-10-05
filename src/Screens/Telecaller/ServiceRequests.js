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
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { getTelecallerServiceRequests } from '../../Api/Telecaller/telecallerRequestsApi';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'needs_vendor', label: 'Needs Vendor' },
  { id: 'open', label: 'Open' },
  { id: 'needs_review', label: 'Needs Review' },
  { id: 'closed', label: 'Closed' },
];

const STATUS_OPTIONS = [
  { id: 'all', label: 'All Statuses' },
  { id: 'new', label: 'New' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

const URGENCY_OPTIONS = [
  { id: 'all', label: 'All Urgencies' },
  { id: 'standard', label: 'Standard' },
  { id: 'express', label: 'Express' },
  { id: 'emergency', label: 'Emergency' },
];

function getStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolv') || s.includes('complet')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  if (s.includes('progress') || s.includes('active') || s.includes('assign')) return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  if (s.includes('pend') || s.includes('hold') || s.includes('needs_vendor')) return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  if (s.includes('cancel') || s.includes('breach') || s.includes('reject')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}

function getPriorityBadge(urgency) {
  const u = String(urgency || '').toLowerCase();
  if (u === 'emergency') return { bg: '#FEF2F2', text: '#DC2626', label: 'Emergency' };
  if (u === 'express' || u === 'urgent' || u === 'high') return { bg: '#FFF7ED', text: '#EA580C', label: 'Express' };
  return { bg: '#F1F5F9', text: '#64748B', label: 'Standard' };
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ServiceRequests({ navigation }) {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [status, setStatus] = useState('all');
  const [urgency, setUrgency] = useState('all');

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [tempActiveTab, setTempActiveTab] = useState('all');
  const [tempMineOnly, setTempMineOnly] = useState(false);
  const [tempUnreadOnly, setTempUnreadOnly] = useState(false);
  const [tempStatus, setTempStatus] = useState('all');
  const [tempUrgency, setTempUrgency] = useState('all');

  const [requests, setRequests] = useState([]);
  const [tabCounts, setTabCounts] = useState({});
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const searchTimer = useRef(null);

  const activeFilterCount =
    (activeTab !== 'all' ? 1 : 0) +
    (mineOnly ? 1 : 0) +
    (unreadOnly ? 1 : 0) +
    (status !== 'all' ? 1 : 0) +
    (urgency !== 'all' ? 1 : 0);

  const fetchRequests = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      setError(null);

      const res = await getTelecallerServiceRequests({
        view: activeTab,
        search: searchQuery,
        status: status !== 'all' ? status : undefined,
        urgency: urgency !== 'all' ? urgency : undefined,
        mine: mineOnly,
        unread: unreadOnly,
        page: pageNum,
      });

      if (pageNum === 1) {
        setRequests(res.requests || []);
      } else {
        setRequests(prev => [...prev, ...(res.requests || [])]);
      }

      setTabCounts(res.meta?.tabCounts || {});
      setPage(res.meta?.currentPage || 1);
      setLastPage(res.meta?.lastPage || 1);
    } catch (err) {
      setError(err?.message || 'Failed to load service requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [activeTab, searchQuery, status, urgency, mineOnly, unreadOnly]);

  useEffect(() => {
    fetchRequests(1);
  }, [fetchRequests]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchRequests(1, true);
  }, [fetchRequests]);

  const onEndReached = () => {
    if (!loading && !loadingMore && page < lastPage) {
      setLoadingMore(true);
      fetchRequests(page + 1);
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
    setTempActiveTab(activeTab);
    setTempMineOnly(mineOnly);
    setTempUnreadOnly(unreadOnly);
    setTempStatus(status);
    setTempUrgency(urgency);
    setFilterModalVisible(true);
  };

  const applyFilters = () => {
    setActiveTab(tempActiveTab);
    setMineOnly(tempMineOnly);
    setUnreadOnly(tempUnreadOnly);
    setStatus(tempStatus);
    setUrgency(tempUrgency);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setTempActiveTab('all');
    setTempMineOnly(false);
    setTempUnreadOnly(false);
    setTempStatus('all');
    setTempUrgency('all');
    setActiveTab('all');
    setMineOnly(false);
    setUnreadOnly(false);
    setStatus('all');
    setUrgency('all');
    setFilterModalVisible(false);
  };

  const getTabCount = (tabId) => {
    if (tabId === 'all') return tabCounts.all;
    if (tabId === 'needs_vendor') return tabCounts.needsVendor;
    if (tabId === 'open') return tabCounts.open;
    if (tabId === 'needs_review') return tabCounts.needsReview;
    if (tabId === 'closed') return tabCounts.closed;
    return null;
  };

  const renderItem = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.requestCard}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('TicketDetail', { ticketId: item.id, ticket: item.ticketNumber })}
      >
        {/* Top Header: Ticket Number, Unread Badge, Status Pill */}
        <View style={styles.cardHeader}>
          <View style={styles.ticketNumWrap}>
            <Text style={styles.ticketNumText}>{item.ticketNumber}</Text>
            {item.chatUnread && (
              <View style={styles.unreadChatBadge}>
                <Icon name="chat" size={10} color="#FFFFFF" />
                <Text style={styles.unreadChatBadgeText}>Unread</Text>
              </View>
            )}
          </View>

          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg, borderColor: statusStyle.border }]}>
            <Text style={[styles.statusPillText, { color: statusStyle.text }]}>{item.statusLabel}</Text>
          </View>
        </View>

        {/* Service Name */}
        <Text style={styles.serviceTitle} numberOfLines={1}>{item.serviceName}</Text>

        {/* Footer: Customer Name & Created Date */}
        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <Icon name="person-outline" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{item.customer?.name || 'Customer'}</Text>
          </View>

          {item.createdAt && (
            <View style={styles.dateRow}>
              <Icon name="event" size={13} color="#94A3B8" />
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Top Dark Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Service Requests</Text>

          {/* New Service Request Button */}
          <TouchableOpacity
            style={styles.newRequestBtn}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('NewServiceRequest')}
          >
            <Icon name="add" size={18} color="#FFFFFF" />
            <Text style={styles.newRequestBtnText}>New Request</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar + Filter Icon Row */}
      <View style={styles.searchWrap}>
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search request #, customer, service..."
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

        {/* Active Filter Chips Row */}
        {activeFilterCount > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersRow}>
            {activeTab !== 'all' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>
                  Tab: {TABS.find(t => t.id === activeTab)?.label || activeTab}
                </Text>
                <TouchableOpacity onPress={() => setActiveTab('all')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {mineOnly && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>Assigned to Me</Text>
                <TouchableOpacity onPress={() => setMineOnly(false)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {unreadOnly && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>Unread Chats</Text>
                <TouchableOpacity onPress={() => setUnreadOnly(false)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {status !== 'all' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>
                  Status: {STATUS_OPTIONS.find(s => s.id === status)?.label || status}
                </Text>
                <TouchableOpacity onPress={() => setStatus('all')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                  <Icon name="close" size={13} color="#20304C" />
                </TouchableOpacity>
              </View>
            )}
            {urgency !== 'all' && (
              <View style={styles.activeFilterPill}>
                <Text style={styles.activeFilterPillText}>
                  Urgency: {URGENCY_OPTIONS.find(u => u.id === urgency)?.label || urgency}
                </Text>
                <TouchableOpacity onPress={() => setUrgency('all')} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
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

      {/* Requests List */}
      <View style={styles.listContainer}>
        {loading && !refreshing ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#A64416" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerEmpty}>
            <Icon name="error-outline" size={40} color="#DC2626" />
            <Text style={styles.errorTitle}>Could not load requests</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchRequests(1)}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.centerEmpty}>
            <Icon name="confirmation-number" size={44} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No service requests found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery || activeFilterCount > 0
                ? 'Try changing your search keywords or filter criteria.'
                : 'There are currently no requests under this filter.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={item => String(item.id)}
            renderItem={renderItem}
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
          <Pressable style={styles.filterSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.filterHandleWrap}>
              <View style={styles.filterHandle} />
            </View>

            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>Filter Requests</Text>
              <TouchableOpacity onPress={resetFilters} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.filterResetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Queue / Category Tabs Section matching reference style */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Queue / Category</Text>
                <View style={styles.modalTabsWrap}>
                  {TABS.map(tab => {
                    const isSelected = tempActiveTab === tab.id;
                    const count = getTabCount(tab.id);
                    return (
                      <TouchableOpacity
                        key={tab.id}
                        style={[styles.modalTabPill, isSelected && styles.modalTabPillActive]}
                        onPress={() => setTempActiveTab(tab.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.modalTabPillText, isSelected && styles.modalTabPillTextActive]}>
                          {tab.label}
                        </Text>
                        {count != null && (
                          <View style={[styles.modalTabBadge, isSelected && styles.modalTabBadgeActive]}>
                            <Text style={[styles.modalTabBadgeText, isSelected && styles.modalTabBadgeTextActive]}>
                              {count}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Quick Toggles */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Quick Filters</Text>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[styles.toggleChip, tempMineOnly && styles.toggleChipActive]}
                    onPress={() => setTempMineOnly(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    <Icon name="person" size={16} color={tempMineOnly ? '#FFFFFF' : '#64748B'} />
                    <Text style={[styles.toggleChipText, tempMineOnly && styles.toggleChipTextActive]}>
                      Assigned to Me
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.toggleChip, tempUnreadOnly && styles.toggleChipActive]}
                    onPress={() => setTempUnreadOnly(prev => !prev)}
                    activeOpacity={0.7}
                  >
                    <Icon name="chat" size={16} color={tempUnreadOnly ? '#FFFFFF' : '#64748B'} />
                    <Text style={[styles.toggleChipText, tempUnreadOnly && styles.toggleChipTextActive]}>
                      Unread Chats
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Status */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.optionsWrap}>
                  {STATUS_OPTIONS.map(opt => {
                    const isSelected = tempStatus === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.optionPill, isSelected && styles.optionPillActive]}
                        onPress={() => setTempStatus(opt.id)}
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

              {/* Urgency */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Urgency Tier</Text>
                <View style={styles.optionsWrap}>
                  {URGENCY_OPTIONS.map(opt => {
                    const isSelected = tempUrgency === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        style={[styles.optionPill, isSelected && styles.optionPillActive]}
                        onPress={() => setTempUrgency(opt.id)}
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
            </ScrollView>

            {/* Apply Button */}
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
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#A64416',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 4,
    elevation: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  newRequestBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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

  modalTabsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    gap: 7,
  },
  modalTabPillActive: {
    backgroundColor: '#1E293B',
  },
  modalTabPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modalTabPillTextActive: {
    color: '#FFFFFF',
  },
  modalTabBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTabBadgeActive: {
    backgroundColor: '#3B82F6',
  },
  modalTabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  modalTabBadgeTextActive: {
    color: '#FFFFFF',
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

  requestCard: {
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
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ticketNumWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ticketNumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  unreadChatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    gap: 3,
  },
  unreadChatBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },

  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
    flexShrink: 1,
  },
  dotSeparator: {
    color: '#94A3B8',
    fontSize: 12,
  },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },

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
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  toggleChipActive: {
    backgroundColor: '#20304C',
    borderColor: '#20304C',
  },
  toggleChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  toggleChipTextActive: {
    color: '#FFFFFF',
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
    backgroundColor: '#A64416',
    borderColor: '#A64416',
  },
  optionPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  optionPillTextActive: {
    color: '#FFFFFF',
  },
  filterTabBadge: {
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterTabBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterTabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  filterTabBadgeTextActive: {
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

export default ServiceRequests;
