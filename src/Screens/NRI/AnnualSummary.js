import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { useAnnualSummary } from '../../Hooks/useAnnualSummary';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useProperties } from '../../Hooks/useProperties';
import { useMembership } from '../../Hooks/useMembership';
import { generateAndSaveAnnualSummaryPdf } from '../../Utils/annualSummaryPdf';

const YEARS = [2026, 2025, 2024];

function AnnualSummary({ navigation }) {
  const [year, setYear] = useState(2026);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const { summary, loading, failed, retry } = useAnnualSummary(year);
  const { members } = useFamilyMembers();
  const { properties } = useProperties();
  const { membership } = useMembership();
  const user = useSelector(state => state.user.user);
  const { showAlert, alertProps } = useAppAlert();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  // `retry` is a new function reference every render (not memoized by the
  // hook) — keeping it out of these deps avoids an infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const chooseYear = () => {
    showAlert(
      'Select Year',
      undefined,
      YEARS.map(y => ({ text: String(y), onPress: () => setYear(y) })).concat({ text: 'Cancel', style: 'cancel' })
    );
  };

  const downloadPdf = async () => {
    if (!summary || generatingPdf) return;
    setGeneratingPdf(true);
    try {
      await generateAndSaveAnnualSummaryPdf({
        year,
        summary,
        membershipName: membership?.planName,
        familyCount: members.length,
        propertiesCount: properties.length,
        customerName: user?.name || 'Customer',
      });
      showAlert('Download Complete', `Your ${year} annual summary PDF has been saved to your Downloads folder.`);
    } catch (error) {
      showAlert('Download Failed', error?.message || 'Could not generate the PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={`Annual Summary — ${year}`} showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.yearSelect} onPress={chooseYear}>
            <Text style={styles.yearLabel}>Year</Text>
            <Text style={styles.yearValue}>{year}</Text>
            <Icon name="arrow-drop-down" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfBtn} onPress={downloadPdf} disabled={!summary || generatingPdf}>
            {generatingPdf ? (
              <ActivityIndicator size="small" color={colors.onAccent} />
            ) : (
              <Icon name="picture-as-pdf" size={16} color={colors.onAccent} />
            )}
            <Text style={styles.pdfBtnText}>{generatingPdf ? 'Preparing…' : 'Download PDF'}</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loadingText}>Loading summary…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load the annual summary. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {summary && (
          <>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Requests</Text>
                <Text style={styles.statValue}>{summary.totalRequests}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Completed Services</Text>
                <Text style={[styles.statValue, { color: colors.success }]}>{summary.completed}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Total Spend</Text>
                <Text style={styles.statValue}>₹{summary.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Membership</Text>
                <Text style={styles.statValue}>{membership?.planName || 'Free'}</Text>
              </View>
            </View>

            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Services by Category</Text>
              {summary.byCategory.length === 0 ? (
                <Text style={styles.panelEmptyText}>No services recorded yet.</Text>
              ) : (
                summary.byCategory.map(cat => (
                  <View key={cat.name} style={styles.categoryRow}>
                    <Text style={styles.categoryName}>{cat.name}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>{cat.count}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View style={styles.panelCard}>
              <Text style={styles.panelTitle}>Care Highlights</Text>
              <View style={styles.highlightRow}>
                <Icon name="home" size={18} color={colors.textSecondary} />
                <Text style={styles.highlightLabel}>Property visits & services</Text>
                <Text style={styles.highlightCount}>{summary.propertyVisits}</Text>
              </View>
              <View style={styles.highlightRow}>
                <Icon name="favorite-border" size={18} color={colors.textSecondary} />
                <Text style={styles.highlightLabel}>Parent & family care services</Text>
                <Text style={styles.highlightCount}>{summary.parentCare}</Text>
              </View>
              <View style={styles.highlightRow}>
                <Icon name="group" size={18} color={colors.textSecondary} />
                <Text style={styles.highlightLabel}>Family members on file</Text>
                <Text style={styles.highlightCount}>{members.length}</Text>
              </View>
              <View style={styles.highlightRow}>
                <Icon name="bar-chart" size={18} color={colors.textSecondary} />
                <Text style={styles.highlightLabel}>Properties managed</Text>
                <Text style={styles.highlightCount}>{properties.length}</Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  yearSelect: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', paddingHorizontal: 16, paddingVertical: 12 },
  yearLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  yearValue: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#A64416', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pdfBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 14, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 13, color: '#EF4444' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { 
    flexBasis: '47%', 
    flexGrow: 1, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    borderWidth: 1, 
    borderColor: '#E0E7FF', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 6 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 16, 
    elevation: 3 
  },
  statLabel: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#0F172A', marginTop: 8 },
  panelCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 24, 
    borderWidth: 1, 
    borderColor: '#E0E7FF', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 24, 
    elevation: 4 
  },
  panelTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 16 },
  panelEmptyText: { fontSize: 14, color: '#94A3B8', fontStyle: 'italic' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  categoryName: { fontSize: 15, fontWeight: '500', color: '#1E293B' },
  categoryBadge: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  categoryBadgeText: { fontSize: 13, fontWeight: '700', color: '#1E3A8A' },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  highlightLabel: { fontSize: 14, fontWeight: '500', color: '#475569', flex: 1 },
  highlightCount: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
});

export default AnnualSummary;
