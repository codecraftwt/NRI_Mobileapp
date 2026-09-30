import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT, lightColors as baseColors } from '../../theme';
import { getStateAdminUserDetail } from '../../Api/StateAdmin/stateAdminUsersApi';

const C = {
  ...baseColors,
  primary: '#20304C',
  accent: '#A64416',
};

function UserDetail({ navigation, route }) {
  const userId = route.params?.userId;
  const initialUser = route.params?.user || null;

  const [user, setUser] = useState(initialUser);
  const [loading, setLoading] = useState(!initialUser);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    getStateAdminUserDetail(userId)
      .then(res => {
        setUser(res);
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false);
      });
  }, [userId]);

  const initials = (user?.name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Navy Header */}
      <View style={styles.header}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Account Detail</Text>
          <View style={{ width: 40 }} />
        </View>

        {user && (
          <View style={styles.profileHeader}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
              <View style={styles.roleTag}>
                <Text style={styles.roleTagText}>{user.roleLabel || user.role}</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#A64416" />
          <Text style={styles.loaderText}>Loading account details...</Text>
        </View>
      ) : user ? (
        <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Status Banner */}
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: user.isActive ? '#ECFDF5' : '#FEF2F2' },
            ]}
          >
            <Icon
              name={user.isActive ? 'check-circle' : 'block'}
              size={20}
              color={user.isActive ? '#059669' : '#DC2626'}
            />
            <Text
              style={[
                styles.statusBannerText,
                { color: user.isActive ? '#065F46' : '#991B1B' },
              ]}
            >
              {user.isActive ? 'Account is active and authorized' : 'Account is currently inactive'}
            </Text>
          </View>

          {/* Contact Details Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="contact-phone" size={18} color="#20304C" />
              <Text style={styles.sectionTitle}>Contact & System Info</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>User ID</Text>
              <Text style={styles.infoValue}>#{user.id}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Primary Phone</Text>
              <Text style={styles.infoValue}>{user.phone || '—'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email Address</Text>
              <Text style={styles.infoValue}>{user.email || '—'}</Text>
            </View>

            {user.createdAt && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Registered On</Text>
                <Text style={styles.infoValue}>{new Date(user.createdAt).toLocaleDateString()}</Text>
              </View>
            )}
          </View>

          {/* Geographic Coverage */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Icon name="public" size={18} color="#20304C" />
              <Text style={styles.sectionTitle}>Geographic Scope & Jurisdiction</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assigned State</Text>
              <Text style={styles.infoValue}>{user.stateName || '—'}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assigned City</Text>
              <Text style={styles.infoValue}>{user.cityName || '—'}</Text>
            </View>

            {user.districtIds?.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Covered District IDs</Text>
                <Text style={styles.infoValue}>{user.districtIds.join(', ')}</Text>
              </View>
            )}

            {user.talukaIds?.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Covered Taluka IDs</Text>
                <Text style={styles.infoValue}>{user.talukaIds.join(', ')}</Text>
              </View>
            )}

            {user.stateIds?.length > 0 && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>State Scopes</Text>
                <Text style={styles.infoValue}>{user.stateIds.join(', ')}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#20304C',
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircleLg: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  profileName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  profileEmail: { fontSize: 13, color: 'rgba(255, 255, 255, 0.75)', marginTop: 2 },
  roleTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#A64416',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 6,
  },
  roleTagText: { fontSize: 10, fontWeight: '700', color: '#FFFFFF' },

  body: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },
  loaderWrap: { paddingVertical: 60, alignItems: 'center' },
  loaderText: { fontSize: 13, color: '#64748B', marginTop: 12 },

  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
  },
  statusBannerText: { fontSize: 13, fontWeight: '600' },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: { fontSize: 13, color: '#64748B', fontWeight: '500' },
  infoValue: { fontSize: 13, color: '#0F172A', fontWeight: '700', maxWidth: '60%', textAlign: 'right' },
});

export default UserDetail;
