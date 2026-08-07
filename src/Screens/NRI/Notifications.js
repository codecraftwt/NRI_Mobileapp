import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme';
import { useNotifications } from '../../Hooks/useNotifications';
import { handleNotificationNavigation } from '../../Services/firebase/notificationRouting';

// Icon + colour by notification type/event keyword.
function getVisual(n) {
  const key = `${n.type || ''} ${n.event || ''}`.toLowerCase();
  if (/complete|success|paid|resolved/.test(key)) return { icon: 'check-circle', color: '#059669', bg: '#D1FAE5' };
  if (/warn|action|required|sla|overdue|reject/.test(key)) return { icon: 'warning', color: '#D94625', bg: '#FBEAE5' };
  if (/offer|package|promo|coupon/.test(key)) return { icon: 'local-offer', color: '#3B82F6', bg: '#EFF6FF' };
  if (/chat|message|support/.test(key)) return { icon: 'chat', color: '#8B5CF6', bg: '#F3E8FF' };
  return { icon: 'notifications', color: '#3B82F6', bg: '#EFF6FF' };
}

// Compact relative time ("2h ago", "3d ago").
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
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Notifications({ navigation }) {
  const { items, unreadCount, meta, loading, failed, error, fetch, markRead, markAllRead } = useNotifications();
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const currentPage = meta?.currentPage || 1;
  const lastPage = meta?.lastPage || 1;

  useFocusEffect(
    useCallback(() => {
      fetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // Fetch the next page when the list nears the bottom (infinite scroll).
  const loadMore = useCallback(() => {
    if (loadingMoreRef.current || loading || currentPage >= lastPage) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    Promise.resolve(fetch({ page: currentPage + 1 })).finally(() => {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    });
  }, [currentPage, lastPage, loading, fetch]);

  const onScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (contentSize.height - contentOffset.y - layoutMeasurement.height < 200) loadMore();
  };

  const onPressItem = (n) => {
    if (!n.read) markRead(n.id);
    // Route from the mapped fields (url/event/title/message live at the top of
    // the RM item, not inside data), plus any extra keys in data.
    handleNotificationNavigation({
      url: n.url,
      event: n.event,
      type: n.type,
      title: n.title,
      message: n.message,
      ...n.data,
    });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Notifications" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={loading && items.length > 0 && !loadingMore} onRefresh={fetch} colors={['#D94625']} tintColor="#D94625" />}
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>Recent Activity{unreadCount > 0 ? ` (${unreadCount})` : ''}</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={styles.markReadText}>Mark all as read</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading && items.length === 0 ? (
          <View style={styles.stateBox}><ActivityIndicator size="large" color="#D94625" /></View>
        ) : failed ? (
          <TouchableOpacity style={styles.stateBox} onPress={fetch} activeOpacity={0.7}>
            <Icon name="refresh" size={36} color="#DC2626" />
            <Text style={styles.stateText}>{error?.message || 'Couldn\'t load notifications. Tap to retry.'}</Text>
          </TouchableOpacity>
        ) : items.length === 0 ? (
          <View style={styles.stateBox}>
            <Icon name="notifications-none" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {items.map((notif, index) => {
              const v = getVisual(notif);
              return (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.notificationCard, index === items.length - 1 && styles.lastCard, !notif.read && styles.unreadCard]}
                  activeOpacity={0.7}
                  onPress={() => onPressItem(notif)}
                >
                  <View style={[styles.iconContainer, { backgroundColor: v.bg }]}>
                    <Icon name={v.icon} size={24} color={v.color} />
                  </View>

                  <View style={styles.contentContainer}>
                    <Text style={styles.notifTitle}>{notif.title}</Text>
                    {!!notif.message && <Text style={styles.notifMessage}>{notif.message}</Text>}
                    <Text style={styles.notifTime}>{relativeTime(notif.createdAt)}</Text>
                  </View>

                  {!notif.read && <View style={styles.unreadDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {loadingMore && (
          <View style={styles.footerLoader}><ActivityIndicator size="small" color="#D94625" /></View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#1A1A1A',
  },
  markReadText: {
    ...typography.labelMedium,
    color: '#D94625',
  },

  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 80 },
  emptyTitle: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginTop: 4 },
  stateText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },

  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    padding: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  unreadCard: { backgroundColor: '#FBF7F2', borderRadius: 16 },
  lastCard: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 16,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    marginBottom: 4,
  },
  notifMessage: {
    ...typography.body,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 6,
  },
  notifTime: {
    ...typography.tiny,
    color: '#94A3B8',
  },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D94625', marginLeft: 8 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});

export default Notifications;
