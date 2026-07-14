import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform, PermissionsAndroid, Linking, Image, Dimensions } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { updateProfile, logoutUser } from '../../Redux/slices/userSlice';

const MENU_ITEMS = [
  { key: 'personal', label: 'Personal Info', icon: 'person-outline', route: 'ProfilePersonal' },
  { key: 'address', label: 'Address', icon: 'place', route: 'ProfileAddress' },
  { key: 'nri', label: 'NRI & Membership', icon: 'card-membership', route: 'ProfileNri' },
  { key: 'password', label: 'Password', icon: 'lock-outline', route: 'ProfilePassword' },
];

const { width: W, height: H } = Dimensions.get('window');

function Profile({ navigation }) {
  const user = useSelector(state => state.user.user);
  const dispatch = useDispatch();

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
    const allowed = await requestCameraPermission();
    if (!allowed) return;
    launchCamera({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) dispatch(updateProfile({ avatarUri: uri }));
    });
  };

  const handleChooseFromGallery = async () => {
    const allowed = await requestGalleryPermission();
    if (!allowed) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) dispatch(updateProfile({ avatarUri: uri }));
    });
  };

  const handleUploadPhoto = () => {
    Alert.alert('Update Profile Photo', 'Choose a source', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Gallery', onPress: handleChooseFromGallery },
    ]);
  };


  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
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
      {/* Dynamic Geometric Background Layering matching Auth screens */}
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />

      <Header navigation={navigation} title="My Profile" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, gap: 16 }}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              {user?.avatarUri ? (
                <Image source={{ uri: user.avatarUri }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <TouchableOpacity style={styles.editAvatarBtn} onPress={handleUploadPhoto} activeOpacity={0.8}>
              <Icon name="photo-camera" size={14} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name || 'Customer'}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleBadgeText}>{user?.role || 'Customer'}</Text>
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
                  <Icon name={item.icon} size={20} color={colors.accent} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-right" size={24} color={colors.textPlaceholder} />
            </TouchableOpacity>
          ))}
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Icon name="logout" size={20} color={colors.error} />
          <Text style={styles.logoutBtnText}>Logout from App</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  // Dynamic Background Layers matching Auth screen
  bgShape1: { position: 'absolute', top: -H * 0.15, right: -W * 0.3, width: W * 1.5, height: H * 0.5, backgroundColor: colors.primaryLight + '10', borderRadius: 80, transform: [{ rotate: '-25deg' }] },
  bgShape2: { position: 'absolute', bottom: -H * 0.2, left: -W * 0.4, width: W * 1.5, height: H * 0.4, backgroundColor: colors.accent + '08', borderRadius: 60, transform: [{ rotate: '-35deg' }] },
  bgShape3: { position: 'absolute', top: '35%', left: -W * 0.1, width: W * 1.2, height: H * 0.05, backgroundColor: colors.primary + '05', borderRadius: 20, transform: [{ rotate: '15deg' }] },
  scrollContent: { flexGrow: 1, padding: 16, paddingBottom: 40, gap: 16 },
  profileCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { ...typography.h2, color: colors.onPrimary },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 3 },
  profileInfo: { flex: 1, alignItems: 'flex-start' },
  profileName: { ...typography.h3, color: colors.textPrimary },
  profileEmail: { ...typography.body, color: colors.textSecondary },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.surfaceSecondary, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginTop: 8, alignSelf: 'flex-start' },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.warning },
  roleBadgeText: { ...typography.labelMedium, color: colors.textPrimary },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.errorBackground, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16, justifyContent: 'center' },
  logoutBtnText: { ...typography.labelLarge, color: colors.error },
  menuCard: { backgroundColor: colors.surface, borderRadius: 16, paddingVertical: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 4 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceSecondary },
  menuItemLast: { borderBottomWidth: 0 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  menuIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accent + '15', justifyContent: 'center', alignItems: 'center' },
  menuLabel: { ...typography.labelLarge, color: colors.textPrimary },
});

export default Profile;
