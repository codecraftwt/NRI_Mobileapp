import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import RMWidget from '../../Components/RMWidget';
import { useDashboard } from '../../Hooks/useDashboard';
import { lightColors as colors, typography, spacing, radius } from '../../theme';

const { width: W, height: H } = Dimensions.get('window');

function Dashboard({ navigation }) {
  const { data, loading, failed, retry } = useDashboard();

  const stats = data?.stats || { activeTickets: 0, completedTickets: 0, walletBalance: 0 };
  const membership = data?.membership;
  const recentTickets = data?.recentTickets || [];
  const recentReports = data?.recentReports || [];

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return { bg: colors.badgeBackground, text: colors.primary };
      case 'assigned': return { bg: colors.warningBackground, text: colors.warning };
      case 'in progress': return { bg: colors.successBackground, text: colors.success };
      default: return { bg: colors.surfaceSecondary, text: colors.textSecondary };
    }
  };

  const quickActions = [
    { id: 'props', name: 'My Properties', icon: 'business', screen: 'Properties', color: colors.primary },
    { id: 'vault', name: 'Document Vault', icon: 'folder-shared', screen: 'Document Vault', color: colors.accent },
    { id: 'billing', name: 'Billing', icon: 'receipt-long', screen: 'Billing & Payments', color: colors.primaryDark },
    { id: 'addons', name: 'Packages', icon: 'auto-awesome-mosaic', screen: 'Add-on Packages', color: colors.warning },
    { id: 'reports', name: 'Reports', icon: 'bar-chart', screen: 'Reports & Media', color: colors.success },
    { id: 'wallet', name: 'Wallet', icon: 'account-balance-wallet', screen: 'Wallet & Coupons', color: colors.primaryLight },
  ];

  const renderKPICard = (title, value, icon, color) => (
    <View style={styles.kpiCard}>
      <View style={[styles.kpiIconWrapper, { backgroundColor: color + '15' }]}>
        <Icon name={icon} size={28} color={color} />
      </View>
      <View style={styles.kpiTextContainer}>
        <Text style={styles.kpiValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.kpiLabel}>{title}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Dynamic Geometric Background Layering matching Auth screens */}
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />

      <Header navigation={navigation} />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading && !data && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Fetching your dashboard...</Text>
          </View>
        )}
        {failed && !data && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Icon name="refresh" size={20} color={colors.error} />
            <Text style={styles.retryText}>Failed to load. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* RM Connection */}
        <RMWidget rm={data?.rm} />

        {/* KPI Grid */}
        <View style={styles.kpiGrid}>
          {renderKPICard('Active Requests', stats.activeTickets, 'assignment', colors.primary)}
          {renderKPICard('Completed', stats.completedTickets, 'check-circle', colors.success)}
          {renderKPICard('Membership', membership?.planName || 'Free', 'workspace-premium', colors.accent)}
          {renderKPICard('Wallet', `₹${stats.walletBalance}`, 'account-balance-wallet', colors.primaryDark)}
        </View>

        {!!membership?.renewalAlert && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIcon}>
              <Icon name="error-outline" size={24} color={colors.warning} />
            </View>
            <Text style={styles.alertText}>{membership.renewalAlert}</Text>
          </View>
        )}

        {/* Active Requests List */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('CreateTicket')}>
              <Icon name="add" size={20} color={colors.onPrimary} />
              <Text style={styles.actionButtonText}>New</Text>
            </TouchableOpacity>
          </View>

          {recentTickets.length > 0 ? (
            <View style={styles.cardBlock}>
              {recentTickets.slice(0, 3).map((ticket, index, arr) => {
                const statusStyle = getStatusColor(ticket.status);
                const isLast = index === arr.length - 1;
                return (
                  <TouchableOpacity 
                    key={ticket.id} 
                    style={[styles.ticketItem, !isLast && styles.borderBottom]}
                    onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
                    activeOpacity={0.6}
                  >
                    <View style={styles.ticketDetails}>
                      <Text style={styles.ticketRef}>{ticket.reference}</Text>
                      <Text style={styles.ticketName} numberOfLines={1}>{ticket.service}</Text>
                    </View>
                    <View style={styles.ticketMeta}>
                      <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.badgeText, { color: statusStyle.text }]}>{ticket.status}</Text>
                      </View>
                      <Icon name="chevron-right" size={24} color={colors.primaryLight} />
                    </View>
                  </TouchableOpacity>
                );
              })}
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('My Tickets')}>
                <Text style={styles.viewAllText}>View All Requests</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight + '15' }]}>
                <Icon name="receipt" size={32} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No active requests</Text>
              <Text style={styles.emptySub}>Book your first service with us today.</Text>
            </View>
          )}
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Explore</Text>
          <View style={styles.actionGrid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.actionSquare}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconBg, { backgroundColor: action.color + '15' }]}>
                  <Icon name={action.icon} size={28} color={action.color} />
                </View>
                <Text style={styles.actionLabel} numberOfLines={2}>{action.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Reports Media Card */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          <View style={styles.cardBlock}>
            {recentReports.length > 0 ? (
              recentReports.map((report, index) => {
                const isLast = index === recentReports.length - 1;
                return (
                  <TouchableOpacity key={report.id} style={[styles.reportItem, !isLast && styles.borderBottom]}>
                    <View style={styles.reportIconBg}>
                      <Icon name="insert-drive-file" size={20} color={colors.primary} />
                    </View>
                    <Text style={styles.reportTitle} numberOfLines={1}>{report.title}</Text>
                    <Icon name="arrow-forward" size={20} color={colors.primaryLight} />
                  </TouchableOpacity>
                )
              })
            ) : (
              <View style={styles.emptyStateMinimal}>
                <Text style={styles.emptySub}>No reports available yet.</Text>
              </View>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Clean white back to let shapes shine
    position: 'relative',
    overflow: 'hidden',
  },
  
  // Dynamic Background Layers matching Auth screen
  bgShape1: {
    position: 'absolute',
    top: -H * 0.15,
    right: -W * 0.3,
    width: W * 1.5,
    height: H * 0.5,
    backgroundColor: colors.primaryLight + '10', // Very light blue
    borderRadius: 80, 
    transform: [{ rotate: '-25deg' }]
  },
  bgShape2: {
    position: 'absolute',
    bottom: -H * 0.2,
    left: -W * 0.4,
    width: W * 1.5,
    height: H * 0.4,
    backgroundColor: colors.accent + '08', // Very light orange
    borderRadius: 60,
    transform: [{ rotate: '-35deg' }]
  },
  bgShape3: {
    position: 'absolute',
    top: '35%',
    left: -W * 0.1,
    width: W * 1.2,
    height: H * 0.05,
    backgroundColor: colors.primary + '05',
    borderRadius: 20,
    transform: [{ rotate: '15deg' }]
  },

  scrollContainer: {
    padding: spacing.lg,
    paddingBottom: 100,
    zIndex: 2,
  },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  retryText: { ...typography.labelMedium, color: colors.error },
  
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    rowGap: spacing.md,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'], // Like inputs on Auth
    padding: spacing.md,
    flexDirection: 'row', // Align horizontal instead of vertical stack
    alignItems: 'center',
    shadowColor: colors.primaryLight, // Premium colorful shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    gap: spacing.sm,
  },
  kpiIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 22,
    fontFamily: typography.h2.fontFamily,
    color: '#1A1A1A',
    marginBottom: -4,
  },
  kpiLabel: {
    ...typography.tiny,
    color: '#64748B',
    fontFamily: typography.labelMedium.fontFamily,
  },
  
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    gap: spacing.sm,
  },
  alertIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertText: { ...typography.body, color: '#92400E', flex: 1 },

  sectionContainer: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#1A1A1A',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent, // Use accent (orange) to make it pop like Auth buttons
    borderRadius: radius.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 4,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  actionButtonText: {
    ...typography.labelMedium,
    color: colors.onPrimary,
  },

  cardBlock: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    paddingHorizontal: spacing.md,
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },

  ticketItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  ticketDetails: {
    flex: 1,
    paddingRight: spacing.sm,
    justifyContent: 'center',
  },
  ticketRef: {
    ...typography.tiny,
    color: '#94A3B8',
    marginBottom: 4,
    fontFamily: typography.labelMedium.fontFamily,
  },
  ticketName: {
    fontSize: 15,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#1E293B',
  },
  ticketMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  badgeText: {
    ...typography.tiny,
    fontFamily: typography.labelMedium.fontFamily,
    textTransform: 'uppercase',
  },
  viewAllBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  viewAllText: {
    ...typography.labelMedium,
    color: colors.primary,
  },

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius['2xl'],
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emptySub: {
    ...typography.small,
    color: '#64748B',
    textAlign: 'center',
  },
  emptyStateMinimal: {
    padding: spacing.lg,
    alignItems: 'center',
  },

  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  actionSquare: {
    width: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: radius['xl'],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  actionIconBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#334155',
    textAlign: 'center',
  },

  reportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  reportIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportTitle: {
    flex: 1,
    ...typography.body,
    color: '#1E293B',
    fontFamily: typography.labelMedium.fontFamily,
  },
});

export default Dashboard;
