import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useMyTickets } from '../../Hooks/useMyTickets';
import { typography } from '../../theme/typography';

const TABS = ['All', 'Active', 'Completed', 'Pending'];

function getStatusPill(statusLabel) {
  switch (statusLabel) {
    case 'Completed': return { bg: '#D1FAE5', text: '#059669', label: 'Completed' };
    case 'In Progress': return { bg: '#FFEDD5', text: '#C2410C', label: 'In Progress' };
    case 'Assigned': return { bg: '#DBEAFE', text: '#1D4ED8', label: 'Assigned' };
    case 'Cancelled': return { bg: '#FEE2E2', text: '#B91C1C', label: 'Cancelled' };
    case 'Overdue': return { bg: '#FEE2E2', text: '#DC2626', label: 'Overdue' };
    default: return { bg: '#F3F4F6', text: '#4B5563', label: statusLabel || 'Requested' };
  }
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

function HorizontalProgressBar({ statusLabel }) {
  const steps = ['Requested', 'Assigned', 'In Progress', 'Completed'];
  let currentIndex = 0;
  if (statusLabel === 'Completed') currentIndex = 3;
  else if (statusLabel === 'In Progress') currentIndex = 2;
  else if (statusLabel === 'Assigned') currentIndex = 1;

  return (
    <View style={styles.progressBarContainer}>
      {steps.map((step, idx) => {
        const isActive = idx <= currentIndex;
        const isLast = idx === steps.length - 1;
        return (
          <View key={step} style={[styles.progressStep, isLast ? { flex: 0, width: 50 } : {}]}>
            <View style={styles.progressNodeRow}>
              <View style={[styles.progressNode, isActive && styles.progressNodeActive]}>
                {isActive && <Icon name="check" size={14} color="#FFF" />}
              </View>
              {!isLast && <View style={[styles.progressLine, idx < currentIndex && styles.progressLineActive]} />}
            </View>
            <Text style={[styles.progressLabel, isActive && styles.progressLabelActive]} numberOfLines={1}>{step}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Requests({ navigation }) {
  const { tickets, meta, loading, failed, retry, fetchPage } = useMyTickets();
  const [activeTab, setActiveTab] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const filteredTickets = tickets.filter(t => {
    if (activeTab === 'Active' && !['New', 'Assigned', 'In Progress'].includes(t.statusLabel)) return false;
    if (activeTab === 'Completed' && t.statusLabel !== 'Completed') return false;
    if (activeTab === 'Pending' && !['New', 'Assigned'].includes(t.statusLabel)) return false;
    return true;
  });

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Requests</Text>
      </View>

      {tickets.length > 0 && (
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {TABS.map(tab => (
              <TouchableOpacity 
                key={tab} 
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <ScrollView 
        contentContainerStyle={[styles.scrollContent, tickets.length === 0 && { flexGrow: 1 }]} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D94625']} tintColor="#D94625" />}
      >
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#D94625" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        )}
        
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Failed to load. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {!loading && !failed && filteredTickets.length === 0 && (
          <View style={[styles.emptyState, tickets.length === 0 && { flex: 1, justifyContent: 'center' }]}>
            <Icon name="receipt" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Requests Found</Text>
            <Text style={styles.emptyText}>You do not have any requests here.</Text>
          </View>
        )}

        {filteredTickets.map((ticket) => {
          // Verified live via GET /customer/tickets/5: a "New" ticket can
          // already have a past sla_deadline, so overdue applies from
          // creation, not just once work starts — exclude only the terminal
          // statuses where a missed SLA is no longer relevant.
          const overdue = isOverdue(ticket.slaDeadline) && !['Completed', 'Cancelled'].includes(ticket.statusLabel);
          const statusPill = getStatusPill(overdue ? 'Overdue' : ticket.statusLabel);

          return (
            <TouchableOpacity
              key={ticket.id}
              style={styles.ticketCard}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('TicketDetail', { ticketId: ticket.id })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.ticketService} numberOfLines={1}>{ticket.serviceName}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusPill.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusPill.text }]}>{statusPill.label}</Text>
                </View>
              </View>

              <Text style={styles.ticketSub}>{ticket.ticketNumber} · {ticket.location?.city || 'India'}</Text>

              <HorizontalProgressBar statusLabel={ticket.statusLabel} />

              <View style={styles.cardFooter}>
                <View style={styles.vendorRow}>
                  <View style={styles.vendorInitial}>
                    <Text style={styles.vendorInitialText}>{ticket.vendorName ? ticket.vendorName.substring(0, 2).toUpperCase() : 'NA'}</Text>
                  </View>
                  <Text style={styles.vendorName}>{ticket.vendorName || 'Pending Assignment'}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Icon name="schedule" size={14} color="#94A3B8" />
                  <Text style={styles.timeText}>Recently</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {meta.lastPage > 1 && (
          <View style={styles.pagerRow}>
            <TouchableOpacity
              style={[styles.pagerBtn, meta.currentPage <= 1 && styles.pagerBtnDisabled]}
              disabled={meta.currentPage <= 1}
              onPress={() => fetchPage(meta.currentPage - 1)}
            >
              <Icon name="chevron-left" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.pagerText}>Page {meta.currentPage} of {meta.lastPage}</Text>
            <TouchableOpacity
              style={[styles.pagerBtn, meta.currentPage >= meta.lastPage && styles.pagerBtnDisabled]}
              disabled={meta.currentPage >= meta.lastPage}
              onPress={() => fetchPage(meta.currentPage + 1)}
            >
              <Icon name="chevron-right" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: 50, paddingBottom: 15, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  tabsContainer: { paddingTop: 20, paddingBottom: 12 },
  tabsScroll: { paddingHorizontal: 20, gap: 12 },
  tab: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  tabActive: { backgroundColor: '#D94625', borderColor: '#D94625' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 12, gap: 16 },
  
  ticketCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 12 },
  ticketService: { fontSize: 17, fontWeight: '700', color: '#0F172A', flexShrink: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontWeight: '600' },
  ticketSub: { fontSize: 13, color: '#64748B', marginBottom: 16 },
  
  progressBarContainer: { flexDirection: 'row', marginBottom: 24, marginHorizontal: 12 },
  progressStep: { flex: 1 },
  progressNodeRow: { flexDirection: 'row', alignItems: 'center' },
  progressNode: { 
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0', 
    backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center', zIndex: 2 
  },
  progressNodeActive: { borderColor: '#D94625', backgroundColor: '#D94625' },
  progressLine: { flex: 1, height: 2, backgroundColor: '#E2E8F0', marginLeft: -2, marginRight: -2, zIndex: 1 },
  progressLineActive: { backgroundColor: '#D94625' },
  progressLabel: { fontSize: 10, color: '#94A3B8', marginTop: 8, position: 'absolute', top: 24, left: -16, width: 60, textAlign: 'center' },
  progressLabelActive: { color: '#0F172A', fontWeight: '600' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vendorInitial: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#1E3A8A', justifyContent: 'center', alignItems: 'center' },
  vendorInitialText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  vendorName: { fontSize: 14, color: '#475569' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 12, color: '#94A3B8' },

  loadingBox: { paddingVertical: 40, alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#94A3B8' },
  retryBox: { paddingVertical: 40, alignItems: 'center' },
  retryText: { fontSize: 14, color: '#EF4444' },
  emptyState: { paddingVertical: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  emptyText: { fontSize: 14, color: '#64748B' },
  
  pagerRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 24, paddingTop: 16 },
  pagerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  pagerBtnDisabled: { opacity: 0.3 },
  pagerText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
});

export default Requests;
