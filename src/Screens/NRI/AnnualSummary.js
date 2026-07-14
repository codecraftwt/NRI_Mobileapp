import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
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
    Alert.alert(
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
      Alert.alert('Download Complete', `Your ${year} annual summary PDF has been saved to your Downloads folder.`);
    } catch (error) {
      Alert.alert('Download Failed', error?.message || 'Could not generate the PDF. Please try again.');
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  yearSelect: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 12 },
  yearLabel: { ...typography.labelMedium, color: colors.textSecondary },
  yearValue: { ...typography.labelLarge, color: colors.textPrimary },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  pdfBtnText: { ...typography.labelLarge, color: colors.onAccent },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { ...typography.labelMedium, color: colors.error },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  statLabel: { ...typography.labelMedium, color: colors.textSecondary },
  statValue: { ...typography.h3, color: colors.textPrimary, marginTop: 8 },
  panelCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.border, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  panelTitle: { ...typography.h4, color: colors.textPrimary, marginBottom: 12 },
  panelEmptyText: { ...typography.body, color: colors.textPlaceholder },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  categoryName: { ...typography.body, color: colors.textPrimary },
  categoryBadge: { backgroundColor: colors.surfaceSecondary, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  categoryBadgeText: { ...typography.labelMedium, color: colors.primary },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.surfaceSecondary },
  highlightLabel: { ...typography.body, color: colors.textSecondary, flex: 1 },
  highlightCount: { ...typography.labelLarge, color: colors.textPrimary },
});

export default AnnualSummary;
