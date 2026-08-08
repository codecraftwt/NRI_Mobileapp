import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, StatusBar, Platform, Image, Modal, Alert, PermissionsAndroid, Linking } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import { typography } from '../../theme/typography';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useVendorProfile } from '../../Hooks/useVendorProfile';
import { logoutUser, uploadUserProfilePhoto, removeUserProfilePhoto } from '../../Redux/slices/userSlice';

const initialsFor = (name) => (name || 'V').trim().split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase();
const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

const MENU_ITEMS = [
  { key: 'personal', label: 'Personal Info', subtitle: 'View and edit your details', icon: 'person-outline', route: 'ProfilePersonal' },
  { key: 'bank', label: 'Bank & Payout Details', subtitle: 'Manage payout account', icon: 'account-balance', route: 'BankDetails' },
  { key: 'documents', label: 'Documents / KYC', subtitle: 'Manage verification documents', icon: 'folder-shared', route: 'Documents' },
  { key: 'availability', label: 'Availability', subtitle: 'Manage your job availability', icon: 'event-available', route: 'Availability' },
  { key: 'services', label: 'Services Offered', subtitle: 'View your offered services', icon: 'miscellaneous-services', route: 'ServiceOffered' },
];

const { height: H } = Dimensions.get('window');
// Clear the (translucent) status bar, plus a little breathing room above the
// "My Profile" title.
const STATUS_BAR_HEIGHT = (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 47) + 22;

function Profile({ navigation }) {
  const dispatch = useDispatch();
  const { profile, loading } = useVendorProfile();
  const { showAlert, alertProps } = useAppAlert();
  // Profile photo lives on the auth user (GET /auth/me → profile_photo), not on
  // the vendor profile — upload/remove go through the shared user thunks.
  const avatarUri = useSelector(state => state.user.user?.avatarUri);
  const uploadingPhoto = useSelector(state => state.user.uploadPhotoStatus === 'loading');
  const removingPhoto = useSelector(state => state.user.removePhotoStatus === 'loading');
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  const requestCameraPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const already = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
    if (already) return true;
    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
      title: 'Allow Camera Access',
      message: 'NRI Circle needs access to your camera to take a profile photo.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert('Permission Required', 'Camera access is blocked. Please enable it from app settings to take a photo.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]);
    } else {
      Alert.alert('Permission Denied', 'Camera access is required to take a photo.');
    }
    return false;
  };

  const requestGalleryPermission = async () => {
    if (Platform.OS !== 'android') return true;
    const permission = Platform.Version >= 33
      ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
      : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const already = await PermissionsAndroid.check(permission);
    if (already) return true;
    const result = await PermissionsAndroid.request(permission, {
      title: 'Allow Photo Access',
      message: 'NRI Circle needs access to your photos so you can set a profile picture.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    if (result === PermissionsAndroid.RESULTS.GRANTED) return true;
    if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
      Alert.alert('Permission Required', 'Photo access is blocked. Please enable it from app settings to choose a profile picture.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]);
    } else {
      Alert.alert('Permission Denied', 'Photo access is required to choose a profile picture.');
    }
    return false;
  };

  const uploadPhoto = (asset) => {
    if (!asset?.uri) return;
    dispatch(uploadUserProfilePhoto({ uri: asset.uri, name: asset.fileName, type: asset.type }))
      .unwrap()
      .catch((error) => {
        Alert.alert('Upload Failed', error?.message || 'Could not update your profile photo. Please try again.');
      });
  };

  const handleTakePhoto = async () => {
    setShowPhotoModal(false);
    const allowed = await requestCameraPermission();
    if (!allowed) return;
    launchCamera({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      uploadPhoto(response.assets?.[0]);
    });
  };

  const handleChooseFromGallery = async () => {
    setShowPhotoModal(false);
    const allowed = await requestGalleryPermission();
    if (!allowed) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      uploadPhoto(response.assets?.[0]);
    });
  };

  const handleRemovePhoto = () => {
    setShowPhotoModal(false);
    showAlert('Remove Photo', 'Remove your profile photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          dispatch(removeUserProfilePhoto())
            .unwrap()
            .catch((error) => {
              Alert.alert('Could Not Remove Photo', error?.message || 'Please try again.');
            });
        },
      },
    ]);
  };

  const handleLogout = () => {
    showAlert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser()); // POST /auth/logout + clear local session
          let root = navigation;
          while (root.getParent()) root = root.getParent();
          root.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  const name = profile?.businessName || 'Vendor';
  const vendorType = titleCase(profile?.vendorType);
  const coverageCity = profile?.geoCoverage?.[0]?.city?.name || '';
  const subtitle = [vendorType, coverageCity].filter(Boolean).join(' · ');
  const ratingScore = profile?.rating?.score;
  const isActive = (profile?.status || '').toLowerCase() === 'active';
  const isAvailable = profile?.availability?.isAvailable !== false;

  return (
    <View style={styles.container}>
      {/* Assert the translucent status bar this screen expects — without it,
          returning from a subscreen (whose Header sets translucent) reverts to
          the OS default for a frame and the header visibly grows then shrinks. */}
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      {/* Top Blue Header */}
      <View style={styles.topBlueBg}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {uploadingPhoto || removingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initialsFor(name)}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.editAvatarBtn} onPress={() => setShowPhotoModal(true)} activeOpacity={0.8} disabled={uploadingPhoto || removingPhoto}>
              <Icon name="photo-camera" size={12} color="#1E3A8A" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{name}</Text>
            {!!profile?.id && <Text style={styles.profileEmail}>Vendor ID: VEN-{profile.id}</Text>}
            {!!subtitle && <Text style={styles.profilePhone}>{subtitle}</Text>}
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* My Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.statusBgDeco} />

          <View style={styles.statusHeader}>
            <View style={styles.statusHeaderLeft}>
              <View style={styles.statusIconWrap}>
                <Icon name="verified-user" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.statusTitle}>My Status</Text>
            </View>
            <View style={styles.ratingRow}>
              <Icon name="star" size={16} color="#F59E0B" />
              <Text style={styles.ratingText}>{ratingScore != null ? Number(ratingScore).toFixed(2) : '—'}</Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Text style={styles.statusRowLabel}>Account</Text>
            {loading && !profile ? (
              <ActivityIndicator size="small" color="#64748B" />
            ) : (
              <View style={[styles.chip, { backgroundColor: isActive ? '#D1FAE5' : '#FEE2E2' }]}>
                <Text style={[styles.chipText, { color: isActive ? '#059669' : '#DC2626' }]}>
                  {titleCase(profile?.status) || 'Unknown'}
                </Text>
              </View>
            )}
          </View>
          <View style={[styles.statusRow, { marginBottom: 0 }]}>
            <Text style={styles.statusRowLabel}>Availability</Text>
            <View style={[styles.chip, { backgroundColor: isAvailable ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={[styles.chipText, { color: isAvailable ? '#059669' : '#D97706' }]}>
                {isAvailable ? 'Available' : 'Unavailable'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.menuItemLast]}
              onPress={() => navigation.navigate(item.route)}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconBox}>
                  <Icon name={item.icon} size={20} color="#1E3A8A" />
                </View>
                <View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.7} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showPhotoModal} transparent animationType="slide" onRequestClose={() => setShowPhotoModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPhotoModal(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Update Profile Photo</Text>
            <TouchableOpacity style={[styles.modalOption, { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]} onPress={handleTakePhoto}>
              <View style={styles.modalOptionLeft}>
                <View style={styles.menuIconBox}>
                  <Icon name="photo-camera" size={20} color="#1E3A8A" />
                </View>
                <Text style={styles.menuLabel}>Take Photo</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalOption, avatarUri && { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' }]} onPress={handleChooseFromGallery}>
              <View style={styles.modalOptionLeft}>
                <View style={styles.menuIconBox}>
                  <Icon name="photo-library" size={20} color="#1E3A8A" />
                </View>
                <Text style={styles.menuLabel}>Choose from Gallery</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>
            {!!avatarUri && (
              <TouchableOpacity style={styles.modalOption} onPress={handleRemovePhoto}>
                <View style={styles.modalOptionLeft}>
                  <View style={styles.menuIconBox}>
                    <Icon name="delete-outline" size={20} color="#1E3A8A" />
                  </View>
                  <Text style={styles.menuLabel}>Remove Photo</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Base is light (not the header blue) so navigating to a subscreen doesn't
  // flash blue behind the bottom tab bar before the content paints.
  container: { flex: 1, backgroundColor: '#FDFBF7' },

  topBlueBg: {
    backgroundColor: '#20304C',
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 24,
    zIndex: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  editAvatarBtn: {
    position: 'absolute', bottom: -4, right: -4,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 2 },
  profileEmail: { fontSize: 13, color: '#93C5FD', marginBottom: 2 },
  profilePhone: { fontSize: 13, color: '#93C5FD' },

  scrollContent: {
    backgroundColor: '#FDFBF7',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: H * 0.7,
  },

  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    position: 'relative',
    overflow: 'hidden',
  },
  statusBgDeco: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EEF2FF',
  },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, zIndex: 1 },
  statusHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, zIndex: 1 },
  statusRowLabel: { fontSize: 14, color: '#64748B' },
  chip: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  chipText: { fontSize: 12, fontWeight: '600' },

  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: 8,
    marginBottom: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  menuIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 16, fontWeight: '600', color: '#0F172A', marginBottom: 2 },
  menuSubtitle: { fontSize: 13, color: '#64748B' },

  logoutBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F97316',
    backgroundColor: '#FFFFFF',
  },
  logoutBtnText: { fontSize: 16, fontWeight: '700', color: '#F97316' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, color: '#1E293B', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 8 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  modalOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});

export default Profile;
