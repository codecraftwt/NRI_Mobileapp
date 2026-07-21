import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, PermissionsAndroid, Linking, Image, Dimensions, Modal, Animated } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { updateProfile, logoutUser } from '../../Redux/slices/userSlice';
import { useReferrals } from '../../Hooks/useReferrals';
import { useToast } from '../../context/ToastContext';

const MENU_ITEMS = [
  { key: 'nri', label: 'NRI & Membership', subtitle: 'View your plan', icon: 'card-membership', route: 'ProfileNri' },
  { key: 'personal', label: 'Personal Info', subtitle: 'View and edit details', icon: 'person-outline', route: 'ProfilePersonal' },
  { key: 'address', label: 'Address', subtitle: 'Update your address', icon: 'place', route: 'ProfileAddress' },
  { key: 'password', label: 'Password', subtitle: 'Update your password', icon: 'lock-outline', route: 'ProfilePassword' },
];

const { width: W, height: H } = Dimensions.get('window');

function Profile({ navigation }) {
  const user = useSelector(state => state.user.user);
  const dispatch = useDispatch();
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const { referralCode } = useReferrals();
  const { showAlert, alertProps } = useAppAlert();
  const { showToast } = useToast();

  const handleCopyCode = () => {
    showToast('Referral code copied successfully!', 'success');
  };

  const name = user?.name || '';
  const initials = (name || 'U').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

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
      Alert.alert(
        'Permission Required',
        'Camera access is blocked. Please enable it from app settings to take a photo.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
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
      Alert.alert(
        'Permission Required',
        'Photo access is blocked. Please enable it from app settings to choose a profile picture.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
    } else {
      Alert.alert('Permission Denied', 'Photo access is required to choose a profile picture.');
    }
    return false;
  };

  const handleTakePhoto = async () => {
    setShowPhotoModal(false);
    const allowed = await requestCameraPermission();
    if (!allowed) return;
    launchCamera({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) dispatch(updateProfile({ avatarUri: uri }));
    });
  };

  const handleChooseFromGallery = async () => {
    setShowPhotoModal(false);
    const allowed = await requestGalleryPermission();
    if (!allowed) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) dispatch(updateProfile({ avatarUri: uri }));
    });
  };

  const handleUploadPhoto = () => {
    setShowPhotoModal(true);
  };


  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser());
          let root = navigation;
          while (root.getParent()) root = root.getParent();
          root.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Blue Header */}
      <View style={styles.topBlueBg}>
        {/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Text style={styles.screenTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileSettings')} style={{ padding: 8 }}>
            <Icon name="settings" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View> */}


        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.avatarUri ? (
                <Image source={{ uri: user.avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.editAvatarBtn} onPress={handleUploadPhoto} activeOpacity={0.8}>
              <Icon name="photo-camera" size={12} color="#1E3A8A" />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name || 'Customer'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
            <Text style={styles.profilePhone}>{user?.phone || '+1-647-555-0192 (Canada)'}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Premium Referral Code Card */}
        <View style={styles.referralCard}>
          <View style={styles.referralBgDeco} />
          
          <View style={styles.referralHeader}>
            <View style={styles.referralHeaderLeft}>
              <View style={styles.giftIconWrap}>
                <Icon name="redeem" size={20} color="#F59E0B" />
              </View>
              <Text style={styles.referralTitle}>Refer & Earn</Text>
            </View>
            <View style={styles.earnedBadge}>
              <Text style={styles.earnedText}>₹2,500 earned</Text>
            </View>
          </View>
          
          <Text style={styles.referralFooter}>Share your code & earn ₹2,500 for every Premium plan referral.</Text>

          <View style={styles.referralCodeBox}>
            <Text style={styles.referralCodeText}>{referralCode || 'WY71RSH2'}</Text>
            <TouchableOpacity style={styles.copyBtn} activeOpacity={0.7} onPress={handleCopyCode}>
              <Icon name="content-copy" size={16} color="#FFFFFF" />
              <Text style={styles.copyBtnText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.key}
              style={[styles.menuItem, index === MENU_ITEMS.length - 1 && styles.menuItemLast]}
              onPress={() => {
                const exploreRoutes = ['Properties', 'Document Vault', 'Billing & Payments', 'Reports & Media', 'Wallet & Coupons'];
                if (exploreRoutes.includes(item.route)) {
                  navigation.navigate('Dashboard', { screen: item.route });
                } else {
                  navigation.navigate(item.route);
                }
              }}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconBox}>
                  <Icon name={item.icon} size={20} color="#1E3A8A" />
                </View>
                <View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {!!item.subtitle && <Text style={styles.menuSubtitle}>{item.subtitle}</Text>}
                </View>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
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
            <TouchableOpacity style={styles.modalOption} onPress={handleChooseFromGallery}>
              <View style={styles.modalOptionLeft}>
                <View style={styles.menuIconBox}>
                  <Icon name="photo-library" size={20} color="#1E3A8A" />
                </View>
                <Text style={styles.menuLabel}>Choose from Gallery</Text>
              </View>
              <Icon name="chevron-right" size={24} color="#CBD5E1" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C' }, // Base is dark blue for top, ScrollView is white/cream
  
  topBlueBg: {
    backgroundColor: '#20304C',
    paddingTop: 60,
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
    backgroundColor: '#F59E0B', // Yellow-orange from screenshot
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', marginBottom: 2, textTransform: 'capitalize' },
  profileEmail: { fontSize: 13, color: '#93C5FD', marginBottom: 2 }, // Light blue text
  profilePhone: { fontSize: 13, color: '#93C5FD' },

  scrollContent: { 
    backgroundColor: '#FDFBF7', 
    paddingTop: 24, 
    paddingHorizontal: 20,
    paddingBottom: 40,
    minHeight: H * 0.7,
  },

  referralCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 18,
    marginBottom: 24,
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
  referralBgDeco: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EEF2FF',
  },
  referralHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 12,
    zIndex: 1,
  },
  referralHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  giftIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referralTitle: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#0F172A' 
  },
  earnedBadge: { 
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  earnedText: { 
    fontSize: 13, 
    fontWeight: '800', 
    color: '#16A34A' 
  },
  referralFooter: { 
    fontSize: 14, 
    color: '#475569', 
    marginBottom: 14,
    lineHeight: 20,
    paddingRight: 20,
    zIndex: 1,
  },
  referralCodeBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 8,
    zIndex: 1,
  },
  referralCodeText: { 
    fontSize: 18, 
    fontWeight: '800', 
    color: '#0F172A', 
    letterSpacing: 4 
  },
  copyBtn: { 
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E3A8A', 
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  copyBtnText: { 
    fontSize: 14, 
    fontWeight: '700', 
    color: '#FFFFFF' 
  },

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
    borderColor: '#A64416',
    backgroundColor: '#FFFFFF',
  },
  logoutBtnText: { fontSize: 16, fontWeight: '700', color: '#A64416' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32, paddingTop: 12 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { ...typography.h3, color: '#1E293B', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 8 },
  modalOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12 },
  modalOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  modalOptionText: { ...typography.body, color: '#1E293B' },
});

export default Profile;
