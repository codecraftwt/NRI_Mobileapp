import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { getTelecallerSupportTickets } from '../../Api/Telecaller/telecallerSupportApi';

function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (isNaN(then)) return '';
  const s = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function getStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'open') return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE', label: 'Waiting on You' };
  if (s === 'pending') return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', label: 'Waiting on Customer' };
  if (s === 'resolved' || s === 'closed') return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', label: 'Resolved' };
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0', label: status };
}

function GeneralSupport({ route, navigation }) {
  const { status: initialStatus = 'all', chatId: initialChatId = null } = route?.params || {};

  const [status, setStatus] = useState(initialStatus);
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Auto-navigate to initial chat if passed
  useEffect(() => {
    if (initialChatId) {
      navigation.navigate('SupportTicketDetail', { ticketId: initialChatId });
    }
  }, [initialChatId, navigation]);

  const fetchTickets = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      if (pageNum === 1 && !isRefresh) setLoading(true);
      setError(null);

      const res = await getTelecallerSupportTickets({
        status: status !== 'all' ? status : undefined,
        page: pageNum,
      });

      if (pageNum === 1) {
        setTickets(res.tickets || []);
      } else {
        setTickets(prev => [...prev, ...(res.tickets || [])]);
      }

      setPage(res.meta?.currentPage || 1);
      setLastPage(res.meta?.lastPage || 1);
      setTotal(res.meta?.total || 0);
      setUnreadTotal(res.meta?.unreadTotal || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [status]);

  useFocusEffect(
    useCallback(() => {
      fetchTickets(1);
    }, [fetchTickets])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets(1, true);
  };

  const onEndReached = () => {
    if (!loading && !loadingMore && page < lastPage) {
      setLoadingMore(true);
      fetchTickets(page + 1);
    }
  };

  const renderTicketCard = ({ item }) => {
    const statusCfg = getStatusStyle(item.status);
    const customer = item.customer || {};
    const initials = (customer.name || item.subject || 'C').substring(0, 2).toUpperCase();
    const hasUnread = item.unreadCount > 0;

    return (
      <TouchableOpacity
        style={[styles.card, hasUnread && styles.cardUnread]}
        onPress={() => navigation.navigate('SupportTicketDetail', { ticketId: item.id, ticketNumber: item.ticketNumber, initialTicket: item })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.customerCol}>
            <View style={styles.customerRow}>
              <Text style={styles.customerName} numberOfLines={1}>
                {customer.name || 'Customer'}
              </Text>
              {hasUnread && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{item.unreadCount}</Text>
                </View>
              )}
            </View>
            <Text style={styles.ticketNumber} numberOfLines={1}>
              {item.ticketNumber} • {item.subject || 'Support Request'}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.border }]}>
            <Text style={[styles.statusBadgeText, { color: statusCfg.text }]}>{statusCfg.label}</Text>
          </View>
        </View>

        {/* Message Snippet */}
        {item.lastMessage ? (
          <View style={styles.messageBox}>
            <Text style={[styles.messageSnippet, hasUnread && styles.messageSnippetUnread]} numberOfLines={2}>
              {item.lastMessage}
            </Text>
          </View>
        ) : null}

        {/* Footer Meta */}
        <View style={styles.cardFooter}>
          {item.request ? (
            <View style={styles.linkedPill}>
              <Icon name="confirmation-number" size={11} color="#EA580C" />
              <Text style={styles.linkedPillText}>{item.request.ticketNumber}</Text>
            </View>
          ) : (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{item.category || 'General'}</Text>
            </View>
          )}

          <Text style={styles.timeText}>{relativeTime(item.lastMessageAt || item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20304C" barStyle="light-content" translucent />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Support Chat</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      {/* Content */}
      {loading && !refreshing ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20304C" />
          <Text style={styles.loadingText}>Loading support chats...</Text>
        </View>
      ) : error && tickets.length === 0 ? (
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Could not load support chats</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchTickets(1)}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={item => String(item.id)}
          renderItem={renderTicketCard}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#20304C']} />}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#20304C" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chat-bubble-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No support chats found</Text>
              <Text style={styles.emptySub}>No customer support requests in this queue.</Text>
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
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#20304C',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backIcon: {
    marginLeft: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: typography.bold,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 36,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    fontFamily: typography.medium,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: typography.bold,
    color: '#1E293B',
    marginTop: 12,
  },
  errorSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    fontFamily: typography.regular,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#20304C',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: typography.semiBold,
  },

  listContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardUnread: {
    borderColor: '#BFDBFE',
    backgroundColor: '#F8FAFF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 13,
    fontFamily: typography.bold,
    color: '#4F46E5',
  },
  customerCol: {
    flex: 1,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 14,
    fontFamily: typography.semiBold,
    color: '#1E293B',
    flexShrink: 1,
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  unreadBadgeText: {
    fontSize: 9,
    fontFamily: typography.bold,
    color: '#FFFFFF',
  },
  ticketNumber: {
    fontSize: 11,
    fontFamily: typography.regular,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: typography.bold,
  },

  messageBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  messageSnippet: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: '#475569',
    lineHeight: 16,
  },
  messageSnippetUnread: {
    fontFamily: typography.medium,
    color: '#1E293B',
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  linkedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  linkedPillText: {
    fontSize: 10,
    fontFamily: typography.semiBold,
    color: '#C2410C',
  },
  categoryPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontFamily: typography.medium,
    color: '#64748B',
    textTransform: 'capitalize',
  },
  timeText: {
    fontSize: 10,
    fontFamily: typography.regular,
    color: '#94A3B8',
    marginLeft: 'auto',
  },

  footerLoader: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: typography.semiBold,
    color: '#475569',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    fontFamily: typography.regular,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
  },
});

export default GeneralSupport;
