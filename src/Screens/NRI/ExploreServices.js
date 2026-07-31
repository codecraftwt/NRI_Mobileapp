import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, StatusBar, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const { width: W, height: H } = Dimensions.get('window');

// Intro landing shown before the Services grid — mirrors the "Let's Explore"
// splash layout (hero image + tagline + CTA), in the app's own colors.
function ExploreServices({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Decorative background shapes */}
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />

      <View style={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.heroWrap}>
          <View style={styles.heroRing}>
            <Image source={require('../../Assets/images/onbgn1.png')} style={styles.heroImage} />
          </View>
        </View>

        <View style={styles.textWrap}>
          <Text style={styles.eyebrow}>NRI CIRCLE</Text>
          <Text style={styles.title}>Explore Services{'\n'}for your family</Text>
          <Text style={styles.subtitle}>
            Verified local vendors, photo proof and a dedicated Relationship Manager —
            everything your family back home needs, in one place.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('GuestServices')}
        >
          <Text style={styles.ctaText}>Let's Explore</Text>
          <Icon name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C', overflow: 'hidden' },
  bgShape1: {
    position: 'absolute', top: -H * 0.18, right: -W * 0.3,
    width: W * 1.4, height: H * 0.5, borderRadius: 80,
    backgroundColor: 'rgba(217,70,37,0.18)', transform: [{ rotate: '-25deg' }],
  },
  bgShape2: {
    position: 'absolute', bottom: -H * 0.22, left: -W * 0.4,
    width: W * 1.4, height: H * 0.4, borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.05)', transform: [{ rotate: '-30deg' }],
  },
  content: { flex: 1, paddingHorizontal: 28, justifyContent: 'space-between', alignItems: 'center' },

  heroWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroRing: {
    width: W * 0.66, height: W * 0.66, borderRadius: W * 0.33,
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  heroImage: { width: '82%', height: '82%', resizeMode: 'contain' },

  textWrap: { alignItems: 'center', marginBottom: 24 },
  eyebrow: { fontSize: 12, letterSpacing: 2, color: '#FCD9C8', fontFamily: typography.labelMedium.fontFamily, marginBottom: 12 },
  title: { fontSize: 30, lineHeight: 38, textAlign: 'center', color: '#FFFFFF', fontFamily: typography.h2.fontFamily, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, lineHeight: 22, textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: 14 },

  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#D94625', height: 58, borderRadius: 29, width: '100%',
    shadowColor: '#D94625', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 6,
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: typography.h4.fontFamily, letterSpacing: 0.3 },
});

export default ExploreServices;
