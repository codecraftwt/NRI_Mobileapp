import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

// Match the main tab screens (Services/Requests/MyMembership etc.), which use a
// fixed paddingTop of 50 with a ~96px total header height. Using fixed
// constants (NOT the async useSafeAreaInsets() hook, which returns 0 on the
// first frame after a transition then updates) keeps every header the exact
// same height as the main screens and flicker-free on navigation.
const HEADER_PADDING_TOP = 50;
const HEADER_HEIGHT = 96;

function Header({ navigation, title, showBack, isTabRoot }) {
  const isDashboard = !showBack && !isTabRoot && !title;

  if (isDashboard) {
    return (
      <View style={styles.mainContainer}>
        <StatusBar backgroundColor={'#20304C'} barStyle="light-content" translucent />

        <View style={styles.profileContainer}>
          <View style={styles.avatarMain}>
            <Icon name="person" size={24} color={'#20304C'} />
          </View>
          <View>
            <Text style={styles.greetingMain}>Welcome back,</Text>
            <Text style={styles.brandTextMain} numberOfLines={1}>NRI Circle Member</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.iconBtnMain}>
          <Icon name="notifications-none" size={24} color="#FFFFFF" />
          <View style={styles.badgeMain} />
        </TouchableOpacity>
      </View>
    );
  }

  // Standard Header for inner screens or Tab Roots
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={'#20304C'} barStyle="light-content" translucent />
      {showBack ? (
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={styles.backIcon} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideSpacer} />
      )}
      {!!title && <Text style={styles.title} numberOfLines={1}>{title}</Text>}
      <View style={styles.sideSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#20304C',
    paddingHorizontal: spacing.lg,
    paddingTop: HEADER_PADDING_TOP,
    height: HEADER_HEIGHT,
    borderBottomWidth: 0,
    shadowColor: '#20304C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    // Nudge the back button up slightly so it optically aligns with the title.
    transform: [{ translateY: -6 }],
  },
  backIcon: {
    marginLeft: 6,
  },
  sideSpacer: {
    width: 44,
  },
  title: { flex: 1, ...typography.h4, color: '#FFFFFF', textAlign: 'center', transform: [{ translateY: -6 }] },

  // Clean Modern Colored Header
  mainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#20304C', // Merges perfectly with status bar
    paddingHorizontal: spacing.lg,
    paddingTop: HEADER_PADDING_TOP,
    height: HEADER_HEIGHT,
    borderBottomWidth: 0,
    shadowColor: '#20304C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: 10,
  },
  avatarMain: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingMain: {
    ...typography.tiny,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  brandTextMain: {
    fontSize: 16,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  iconBtnMain: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeMain: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: '#20304C',
  }
});

export default Header;
