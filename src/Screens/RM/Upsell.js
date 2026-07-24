import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const OPPORTUNITIES = [
  { id: '1', name: 'Test', current: 'Membership', suggested: 'Care Plus', reason: 'Frequent home-visit requests', value: '₹12,000', score: 'High', color: '#16A34A' },
  { id: '2', name: 'Pradnya', current: 'Membership', suggested: 'Premium Care', reason: 'Elderly parent, medical needs', value: '₹24,000', score: 'High', color: '#16A34A' },
  { id: '3', name: 'Rohit Mehta', current: 'Membership', suggested: 'Property Add-on', reason: 'Owns 2 properties in India', value: '₹8,000', score: 'Medium', color: '#CA8A04' },
];

function Upsell({ navigation }) {
  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upsell</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Summary banner */}
        <View style={styles.banner}>
          <View style={{ position: 'absolute', top: -40, bottom: -40, right: -40, width: '60%', backgroundColor: '#A64416', borderRadius: 200, opacity: 0.95 }} />
          <View style={{ zIndex: 1 }}>
            <Text style={styles.bannerLabel}>POTENTIAL REVENUE</Text>
            <Text style={styles.bannerValue}>₹44,000</Text>
            <Text style={styles.bannerSub}>3 open opportunities</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Opportunities</Text>
        <View style={{ gap: 14 }}>
          {OPPORTUNITIES.map(o => (
            <View key={o.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{o.name.charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{o.name}</Text>
                  <Text style={styles.reason} numberOfLines={1}>{o.reason}</Text>
                </View>
                <View style={[styles.scorePill, { backgroundColor: o.color + '15' }]}>
                  <Text style={[styles.scoreText, { color: o.color }]}>{o.score}</Text>
                </View>
              </View>

              <View style={styles.upgradeRow}>
                <View style={styles.planTag}><Text style={styles.planTagText}>{o.current}</Text></View>
                <Icon name="arrow-forward" size={16} color="#94A3B8" />
                <View style={[styles.planTag, styles.planTagHighlight]}><Text style={[styles.planTagText, { color: '#D94625' }]}>{o.suggested}</Text></View>
                <Text style={styles.value}>{o.value}</Text>
              </View>

              <TouchableOpacity style={styles.pitchBtn} activeOpacity={0.8}>
                <Icon name="campaign" size={16} color="#FFFFFF" />
                <Text style={styles.pitchText}>Pitch Upgrade</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 16, backgroundColor: '#20304C' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 60, paddingTop: 20 },
  banner: { backgroundColor: '#202945', borderRadius: 24, padding: 24, overflow: 'hidden', marginBottom: 8 },
  bannerLabel: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#D1D5DB', letterSpacing: 0.5, marginBottom: 6 },
  bannerValue: { fontSize: 30, fontFamily: typography.h2.fontFamily, color: '#FFFFFF' },
  bannerSub: { fontSize: 13, color: '#E5E7EB', marginTop: 4 },

  sectionTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A', marginTop: 24, marginBottom: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontFamily: typography.h2.fontFamily },
  name: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  reason: { fontSize: 12, color: '#64748B', marginTop: 2 },
  scorePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  scoreText: { fontSize: 11, fontWeight: '700' },

  upgradeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  planTag: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  planTagHighlight: { backgroundColor: '#FFF3EE' },
  planTagText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  value: { marginLeft: 'auto', fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#16A34A' },

  pitchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#D94625', borderRadius: 12, paddingVertical: 12, marginTop: 16 },
  pitchText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});

export default Upsell;
