import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import {
  getStateAdminPendingVendors,
  approveStateAdminVendor,
} from '../../Api/StateAdmin/stateAdminVendorsApi';

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

function PendingVendorCard({ vendor, onApprove, approving, onPress }) {
  const initials = (vendor.businessName || vendor.ownerName || 'V')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.cardHeader}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.businessName} numberOfLines={1}>
              {vendor.businessName}
            </Text>
            <View style={styles.pendingBadge}>
              <Icon name="hourglass-top" size={11} color="#D97706" />
              <Text style={styles.pendingBadgeText}>Pending</Text>
            </View>
          </View>

          {!!vendor.ownerName && (
            <Text style={styles.ownerText} numberOfLines={1}>
              Owner: {vendor.ownerName}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      {/* Meta details */}
      <View style={styles.metaBody}>
        {!!vendor.phone && (
          <View style={styles.metaRow}>
            <Icon name="phone" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{vendor.phone}</Text>
          </View>
        )}

        {!!vendor.email && (
          <View style={styles.metaRow}>
            <Icon name="email" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{vendor.email}</Text>
          </View>
        )}

        {!!vendor.location && (
          <View style={styles.metaRow}>
            <Icon name="location-on" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{vendor.location}</Text>
          </View>
        )}

        {!!vendor.submittedAt && (
          <View style={styles.metaRow}>
            <Icon name="event" size={13} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>
              Applied on {formatDate(vendor.submittedAt)}
            </Text>
          </View>
        )}

        {vendor.categories?.length > 0 && (
          <View style={styles.tagsWrap}>
            {vendor.categories.map((cat, idx) => (
              <View key={idx} style={styles.tagPill}>
                <Text style={styles.tagText}>{cat}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Action Footer */}
      {vendor.canApprove && (
        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={[styles.approveBtn, approving && styles.btnDisabled]}
            activeOpacity={0.8}
            onPress={() => onApprove(vendor)}
            disabled={approving}
          >
            {approving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="check-circle" size={16} color="#FFFFFF" />
                <Text style={styles.approveBtnText}>Approve Vendor</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
}

function PendingVendors({ navigation }) {
  const [vendors, setVendors] = useState([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [approvingId, setApprovingId] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchList = useCallback(async (page = 1, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const res = await getStateAdminPendingVendors({
        search: debouncedSearch.trim() || undefined,
        page,
        per_page: 20,
      });

      if (page === 1) {
        setVendors(res.vendors || []);
      } else {
        setVendors(prev => [...prev, ...(res.vendors || [])]);
      }
      setMeta(res.meta || { currentPage: page, lastPage: page, total: res.vendors?.length || 0 });
    } catch {
      if (page === 1) setVendors([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    fetchList(1, false);
  }, [fetchList]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchList(1, false);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (loading || loadingMore || meta.currentPage >= meta.lastPage) return;
    fetchList(meta.currentPage + 1, true);
  };

  const handleApprove = (vendor) => {
    Alert.alert(
      'Approve Vendor',
      `Are you sure you want to approve "${vendor.businessName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            setApprovingId(vendor.id);
            try {
              await approveStateAdminVendor(vendor.id);
              Alert.alert('Success', `"${vendor.businessName}" has been approved.`);
              // Remove approved vendor from list
              setVendors(prev => prev.filter(v => v.id !== vendor.id));
              setMeta(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
            } catch (err) {
              Alert.alert('Error', err?.message || 'Could not approve vendor. Please try again.');
            } finally {
              setApprovingId(null);
            }
          },
        },
      ]
    );
  };

  const totalCount = meta.total || vendors.length;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Icon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Pending Vendors
            </Text>
          </View>

          {totalCount > 0 && (
            <View style={styles.headerCount}>
              <Icon name="hourglass-top" size={14} color="#FDE68A" />
              <Text style={styles.headerCountText}>{totalCount}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.controlsWrap}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search pending vendors..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => fetchList(1, false)}
            returnKeyType="search"
          />
          {!!search && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Icon name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* List */}
      {loading && vendors.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#A64416" />
          <Text style={styles.loadingText}>Loading pending vendors...</Text>
        </View>
      ) : (
        <FlatList
          data={vendors}
          keyExtractor={item => String(item.id)}
          renderItem={({ item }) => (
            <PendingVendorCard
              vendor={item}
              onApprove={handleApprove}
              approving={approvingId === item.id}
              onPress={() => navigation.navigate('VendorDetail', { vendor: item })}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#A64416']}
            />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.loadingMoreWrap}>
                <ActivityIndicator size="small" color="#A64416" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="check-circle" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Pending Vendors</Text>
              <Text style={styles.emptySub}>
                {search
                  ? `No pending vendors matching "${search}"`
                  : 'All vendor applications in your jurisdiction have been approved.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#20304C',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerSub: {
    fontSize: 12.5,
    color: '#94A3B8',
    marginTop: 3,
  },
  headerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  headerCountText: {
    fontSize: 14,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },

  controlsWrap: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    padding: 0,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 30,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFBEB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#D97706',
  },
  headerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  businessName: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    marginRight: 8,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#B45309',
  },
  ownerText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },

  metaBody: {
    gap: 5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },

  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
  },

  cardFooter: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  approveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#16A34A',
    paddingVertical: 9,
    borderRadius: 10,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
  },
  loadingMoreWrap: {
    paddingVertical: 20,
  },

  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
});

export default PendingVendors;
