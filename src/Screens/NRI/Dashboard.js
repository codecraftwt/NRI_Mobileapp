import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import RMWidget from '../../Components/RMWidget';
import { useDashboard } from '../../Hooks/useDashboard';

function Dashboard({ navigation }) {
  const { data, loading, failed, retry } = useDashboard();

  const stats = data?.stats || { activeTickets: 0, completedTickets: 0, walletBalance: 0 };
  const membership = data?.membership;
  const recentTickets = data?.recentTickets || [];
  const recentReports = data?.recentReports || [];

  const getStatusColor = (status) => {
    switch (status) {
      case 'New': return { bg: '#E5F1FF', text: '#007AFF' };
      case 'Assigned': return { bg: '#FFF3E0', text: '#FF9800' };
      case 'In Progress': return { bg: '#E8F5E9', text: '#4CAF50' };
      default: return { bg: '#F3F4F6', text: '#6B7280' };
    }
  };

  const quickActions = [
    { id: 'props', name: 'My Properties', icon: 'location-city', screen: 'Properties', color: '#F59E0B' },
    { id: 'vault', name: 'Document Vault', icon: 'folder_open', screen: 'Document Vault', color: '#8B5CF6' },
    { id: 'billing', name: 'Billing & Payments', icon: 'receipt', screen: 'Billing & Payments', color: '#EC4899' },
    { id: 'addons', name: 'Add-on Packages', icon: 'layers', screen: 'Add-on Packages', color: '#6B7280' },
    { id: 'reports', name: 'Reports & Media', icon: 'insert-chart', screen: 'Reports & Media', color: '#EF4444' },
    { id: 'wallet', name: 'Wallet & Coupons', icon: 'account-balance-wallet', screen: 'Wallet & Coupons', color: '#14B8A6' },
    { id: 'refer', name: 'Refer & Earn', icon: 'card-giftcard', screen: 'Refer & Earn', color: '#F97316' },
  ];

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="NRI Circle" />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {loading && !data && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading your dashboard…</Text>
          </View>
        )}
        {failed && !data && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load dashboard. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {/* KPI Cards */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#E5F1FF' }]}>
                <Icon name="assignment" size={18} color="#007AFF" />
              </View>
              <Text style={styles.kpiLabel}>Active Requests</Text>
            </View>
            <Text style={styles.kpiValue}>{stats.activeTickets}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <Icon name="verified" size={18} color="#4CAF50" />
              </View>
              <Text style={styles.kpiLabel}>Completed Services</Text>
            </View>
            <Text style={styles.kpiValue}>{stats.completedTickets}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <Icon name="card-membership" size={18} color="#FF9800" />
              </View>
              <Text style={styles.kpiLabel}>Membership</Text>
            </View>
            <Text style={styles.kpiValue}>{membership?.planName || 'Free'}</Text>
          </View>

          <View style={styles.kpiCard}>
            <View style={styles.kpiTopRow}>
              <View style={[styles.kpiIconContainer, { backgroundColor: '#E0F2FE' }]}>
                <Icon name="account-balance-wallet" size={18} color="#0284C7" />
              </View>
              <Text style={styles.kpiLabel}>Wallet Credits</Text>
            </View>
            <Text style={styles.kpiValue}>₹{stats.walletBalance}</Text>
          </View>
        </View>

        {!!membership?.renewalAlert && (
          <View style={styles.renewalBanner}>
            <Icon name="notifications-active" size={16} color="#B45309" />
            <Text style={styles.renewalBannerText}>{membership.renewalAlert}</Text>
          </View>
        )}

        {/* Active Requests List */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Requests</Text>
            <TouchableOpacity style={styles.newRequestBtn} onPress={() => navigation.navigate('CreateTicket')}>
              <Icon name="add-circle" size={15} color="white" />
              <Text style={styles.newRequestBtnText}>New Request</Text>
            </TouchableOpacity>
          </View>

          {recentTickets.length > 0 ? (
            <>
              {recentTickets.map(ticket => {
                const statusStyle = getStatusColor(ticket.status);
                return (
                  <View key={ticket.id} style={styles.ticketRow}>
                    <View style={styles.ticketInfo}>
                      <Text style={styles.ticketId}>{ticket.reference}</Text>
                      <Text style={styles.ticketService} numberOfLines={1}>{ticket.service}</Text>
                      {!!ticket.vendor && <Text style={styles.ticketVendor}>Vendor: {ticket.vendor}</Text>}
                    </View>
                    <View style={styles.ticketRight}>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{ticket.status}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.detailsBtn}
                        onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
                      >
                        <Icon name="visibility" size={18} color="#007AFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity style={styles.seeAllRow} onPress={() => navigation.navigate('My Tickets')}>
                <Text style={styles.seeAllText}>All My Requests</Text>
                <Icon name="chevron-right" size={16} color="#007AFF" />
              </TouchableOpacity>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Icon name="assignment-late" size={40} color="#999" />
              <Text style={styles.emptyText}>No active requests. Book a service below.</Text>
            </View>
          )}
        </View>

        {/* RM Connection */}
        <RMWidget rm={data?.rm} />

        {/* Recent Reports Media Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Reports</Text>
          {recentReports.length > 0 ? (
            recentReports.map(report => (
              <View key={report.id} style={styles.reportRow}>
                <Icon name="description" size={16} color="#6B7280" />
                <Text style={styles.reportRowText} numberOfLines={1}>{report.title}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.reportText}>No reports yet. Visit reports appear here after each service.</Text>
          )}
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.grid}>
            {quickActions.map(action => (
              <TouchableOpacity
                key={action.id}
                style={styles.gridItem}
                onPress={() => navigation.navigate(action.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.gridIconContainer, { backgroundColor: action.color }]}>
                  <Icon name={action.icon} size={22} color="white" />
                </View>
                <Text style={styles.gridItemLabel}>{action.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 90,
  },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#666' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  kpiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  kpiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  kpiIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  kpiLabel: {
    fontSize: 11,
    color: '#666',
    flexShrink: 1,
  },
  renewalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  renewalBannerText: { fontSize: 12.5, color: '#92400E', fontWeight: '600', flex: 1 },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  usageLabel: { fontSize: 12.5, color: '#475569' },
  usageValue: { fontSize: 12.5, color: '#1E293B', fontWeight: '700' },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'Roboto',
  },
  newRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  newRequestBtnText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingTop: 12,
  },
  seeAllText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  ticketId: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  ticketService: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginVertical: 2,
  },
  ticketVendor: {
    fontSize: 12,
    color: '#666',
  },
  ticketRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    minWidth: 70,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailsBtn: {
    padding: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 13,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  reportRowText: { fontSize: 12.5, color: '#374151', flex: 1 },
  reportText: {
    fontSize: 12.5,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 16,
  },
  quickActionsContainer: {
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  gridItem: {
    width: '48%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  gridIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridItemLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#444',
  },
});

export default Dashboard;
