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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import { getUserAssignableRoles } from '../../Api/StateAdmin/stateAdminUsersApi';

// First step of the Admin Management drill-down: pick a role here, then land
// on Users.js pre-filtered to that role (see openRole below). Customer isn't
// a "staff" role (it has its own Customers tab) and field-executive is
// excluded app-wide — both dropped here to match Dashboard's role chips.
function AdminRoles({ navigation }) {
  const insets = useSafeAreaInsets();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserAssignableRoles()
      .then(list => {
        const excluded = ['field-executive', 'customer'];
        setRoles((list || []).filter(r => !excluded.includes(String(r.name).toLowerCase())));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openRole = (role) => {
    navigation.navigate('Users', { role: role.name, roleLabel: role.label });
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Admin Management</Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#A64416" style={styles.loader} />
        ) : roles.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Icon name="badge" size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>No manageable roles found.</Text>
          </View>
        ) : (
          <View style={styles.listBlock}>
            {roles.map((r, idx) => (
              <TouchableOpacity
                key={r.name}
                style={[styles.roleRow, idx < roles.length - 1 && styles.roleRowBorder]}
                onPress={() => openRole(r)}
                activeOpacity={0.7}
              >
                <View style={styles.roleIconBg}>
                  <Icon name="badge" size={20} color="#7C3AED" />
                </View>
                <Text style={styles.roleLabel} numberOfLines={1}>{r.label}</Text>
                <Icon name="chevron-right" size={22} color="#CBD5E1" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#20304C',
    paddingHorizontal: 20,
    paddingBottom: 18,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnPlaceholder: { width: 40, height: 40 },
  headerTitle: { flex: 1, fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.3, textAlign: 'center' },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },

  listBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  roleRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  roleIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: '#F3E8FF', justifyContent: 'center', alignItems: 'center',
  },
  roleLabel: { flex: 1, fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#334155', fontWeight: '500' },

  loader: { marginTop: 60 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyText: { fontSize: 13, color: '#94A3B8' },
});

export default AdminRoles;
