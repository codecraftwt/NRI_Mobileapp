import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <TouchableOpacity style={styles.yearSelect} onPress={chooseYear}>
            <Text style={styles.yearLabel}>Year</Text>
            <Text style={styles.yearValue}>{year}</Text>
            <Icon name="arrow-drop-down" size={20} color="#6B7280" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.pdfBtn} onPress={downloadPdf} disabled={!summary || generatingPdf}>
            {generatingPdf ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Icon name="picture-as-pdf" size={16} color="white" />
            )}
            <Text style={styles.pdfBtnText}>{generatingPdf ? 'Preparing…' : 'Download PDF'}</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
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
                <Text style={[styles.statValue, { color: '#10B981' }]}>{summary.completed}</Text>
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
                <Icon name="home" size={18} color="#6B7280" />
                <Text style={styles.highlightLabel}>Property visits & services</Text>
                <Text style={styles.highlightCount}>{summary.propertyVisits}</Text>
              </View>
              <View style={styles.highlightRow}>
                <Icon name="favorite-border" size={18} color="#6B7280" />
                <Text style={styles.highlightLabel}>Parent & family care services</Text>
                <Text style={styles.highlightCount}>{summary.parentCare}</Text>
              </View>
              <View style={styles.highlightRow}>
                <Icon name="group" size={18} color="#6B7280" />
                <Text style={styles.highlightLabel}>Family members on file</Text>
                <Text style={styles.highlightCount}>{members.length}</Text>
              </View>
              <View style={styles.highlightRow}>
                <Icon name="bar-chart" size={18} color="#6B7280" />
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  yearSelect: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'white', borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', paddingHorizontal: 12, paddingVertical: 8 },
  yearLabel: { fontSize: 12, color: '#6B7280' },
  yearValue: { fontSize: 13, color: '#111827', fontWeight: '600' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#007AFF', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9 },
  pdfBtnText: { fontSize: 12, color: 'white', fontWeight: '600' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#6B7280' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flexBasis: '47%', flexGrow: 1, backgroundColor: 'white', borderRadius: 14, padding: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 6 },
  panelCard: { backgroundColor: 'white', borderRadius: 14, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  panelTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827', marginBottom: 10 },
  panelEmptyText: { fontSize: 12, color: '#9CA3AF' },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  categoryName: { fontSize: 13, color: '#111827' },
  categoryBadge: { backgroundColor: '#E5F1FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2 },
  categoryBadgeText: { fontSize: 12, color: '#007AFF', fontWeight: 'bold' },
  highlightRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  highlightLabel: { fontSize: 13, color: '#374151', flex: 1 },
  highlightCount: { fontSize: 14, fontWeight: 'bold', color: '#111827' },
});

export default AnnualSummary;
