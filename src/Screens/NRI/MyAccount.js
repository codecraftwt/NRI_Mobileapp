import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, Switch, RefreshControl } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { fetchCurrentUser } from '../../Redux/slices/userSlice';

function MyAccount({ navigation }) {
  const dispatch = useDispatch();
  const user = useSelector(state => state.user.user);
  const refreshing = useSelector(state => state.user.profileStatus === 'loading');
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [notifications, setNotifications] = useState(true);
  const [whatsappUpdates, setWhatsappUpdates] = useState(true);

  const onRefresh = () => {
    dispatch(fetchCurrentUser());
  };

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchCurrentUser());
    }, [dispatch])
  );

  const handleSave = () => {
    Alert.alert('Profile Updated', 'Your profile has been saved successfully.');
    setEditing(false);
  };

  const languages = ['English', 'Hindi', 'Marathi', 'Punjabi', 'Malayalam', 'Tamil', 'Telugu', 'Gujarati'];

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="My Account" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{name.split(' ').map(n => n[0]).join('').slice(0, 2)}</Text>
          </View>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profilePlan}>{user?.membership || 'Free'} Member</Text>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditing(!editing)}>
            <Icon name={editing ? 'close' : 'edit'} size={16} color="white" />
            <Text style={styles.editBtnText}>{editing ? 'Cancel' : 'Edit Profile'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} editable={editing} placeholderTextColor="#94A3B8" />
          <Text style={styles.inputLabel}>Email Address</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} editable={editing} keyboardType="email-address" placeholderTextColor="#94A3B8" />
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} editable={editing} keyboardType="phone-pad" placeholderTextColor="#94A3B8" />
          {editing && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Language Preference</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langRow}>
            {languages.map(lang => (
              <TouchableOpacity key={lang} style={[styles.langChip, user?.language === lang && styles.langChipActive]}>
                <Text style={[styles.langChipText, user?.language === lang && styles.langChipTextActive]}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Push Notifications</Text>
            <Switch value={notifications} onValueChange={setNotifications} trackColor={{ false: '#D1D5DB', true: '#93C5FD' }} thumbColor={notifications ? '#007AFF' : '#9CA3AF'} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>WhatsApp Updates</Text>
            <Switch value={whatsappUpdates} onValueChange={setWhatsappUpdates} trackColor={{ false: '#D1D5DB', true: '#93C5FD' }} thumbColor={whatsappUpdates ? '#007AFF' : '#9CA3AF'} />
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Your Relationship Manager</Text>
          {user?.rm ? (
            <View style={styles.rmRow}>
              <View style={styles.rmAvatar}>
                <Text style={styles.rmAvatarText}>{user.rm.avatar || 'RM'}</Text>
              </View>
              <View style={styles.rmInfo}>
                <Text style={styles.rmName}>{user.rm.name}</Text>
                <Text style={styles.rmDetail}>{user.rm.email}</Text>
                <Text style={styles.rmDetail}>{user.rm.phone}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.emptyText}>No RM assigned yet. Contact support.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  profileCard: { backgroundColor: 'white', borderRadius: 16, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  profileName: { fontSize: 20, fontWeight: 'bold', color: '#1E293B' },
  profilePlan: { fontSize: 13, color: '#007AFF', fontWeight: '600', marginTop: 4, marginBottom: 16 },
  editBtn: { flexDirection: 'row', backgroundColor: '#007AFF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, gap: 4, alignItems: 'center' },
  editBtnText: { color: 'white', fontSize: 13, fontWeight: '600' },
  sectionCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, height: 44, color: '#333' },
  saveBtn: { backgroundColor: '#10B981', height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  langRow: { gap: 8, paddingVertical: 4 },
  langChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  langChipActive: { backgroundColor: '#E5F1FF', borderColor: '#007AFF' },
  langChipText: { fontSize: 13, color: '#666', fontWeight: '500' },
  langChipTextActive: { color: '#007AFF', fontWeight: 'bold' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  switchLabel: { fontSize: 14, color: '#333' },
  rmRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  rmAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
  rmAvatarText: { fontSize: 16, fontWeight: 'bold', color: 'white' },
  rmInfo: { flex: 1 },
  rmName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  rmDetail: { fontSize: 12, color: '#666', marginTop: 2 },
  emptyText: { fontSize: 13, color: '#999', textAlign: 'center', paddingVertical: 12 },
});

export default MyAccount;
