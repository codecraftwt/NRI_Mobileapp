import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions, Animated, StatusBar, Image, SafeAreaView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as baseColors } from '../../../theme/colors';
import { spacing, radius } from '../../../theme';

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};

const { width: W, height: H } = Dimensions.get('window');

function Onboarding({ navigation }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Swapped icons for high-quality, realistic photography to give a highly premium, modern feel.
  const slides = [
    {
      title: 'Parent & Elder Care',
      description: 'Scheduled doctor visits, medicine delivery, and weekly wellness reports. Peace of mind for your parents back home.',
      image: require('../../../Assets/images/onbgn1.png'),
    },
    {
      title: 'Property & Farm',
      description: 'Periodic inspection visits, utility bill payments, tenant coordination, and property maintenance.',
      image: require('../../../Assets/images/onbgn2.png'),
    },
    {
      title: '24x7 Emergency Support',
      description: 'Instant medical help, ambulance coordination, or break-in response. A dedicated manager on call.',
      image: require('../../../Assets/images/onbgn3.png'),
    }
  ];

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false, listener: (event) => {
        const slide = Math.round(event.nativeEvent.contentOffset.x / W);
        setActiveSlide(slide);
      }
    }
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

      {/* Modern diagonal geometric background layers */}
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      
      {/* Skip Button Row */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.topBtn}>
          <Text style={[styles.skipText, { color: C.primary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Content */}
      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => {
          return (
            <View key={index} style={styles.slideContainer}>
              <View style={styles.imageWrap}>
                <Image source={slide.image} style={styles.slideImage} />
              </View>
              <View style={styles.textWrap}>
                <Text style={styles.slideTitle}>{slide.title}</Text>
                <Text style={styles.slideDesc}>{slide.description}</Text>
              </View>
            </View>
          );
        })}
      </Animated.ScrollView>

      {/* Slide Indicators & CTA */}
      <View style={styles.footer}>
        <View style={styles.indicatorRow}>
          {slides.map((_, index) => {
            const widthAnim = scrollX.interpolate({
              inputRange: [
                W * (index - 1),
                W * index,
                W * (index + 1)
              ],
              outputRange: [8, 24, 8],
              extrapolate: 'clamp'
            });
            const opacityAnim = scrollX.interpolate({
              inputRange: [
                W * (index - 1),
                W * index,
                W * (index + 1)
              ],
              outputRange: [0.3, 1, 0.3],
              extrapolate: 'clamp'
            });
            return (
              <Animated.View 
                key={index} 
                style={[
                  styles.indicator, 
                  { 
                    backgroundColor: C.primary,
                    width: widthAnim,
                    opacity: opacityAnim
                  }
                ]} 
              />
            );
          })}
        </View>

        <TouchableOpacity 
          style={[styles.ctaBtn, { backgroundColor: C.accent, shadowColor: C.accent }]}
          onPress={() => {
             navigation.navigate('Login');
          }}
        >
          <Text style={styles.ctaText}>
            {activeSlide === slides.length - 1 ? 'Get Started' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
  },
  bgShape1: {
    position: 'absolute',
    top: -H * 0.2,
    right: -W * 0.3,
    width: W * 1.5,
    height: H * 0.6,
    backgroundColor: C.primaryLight + '12',
    borderRadius: 60,
    transform: [{ rotate: '-35deg' }]
  },
  bgShape2: {
    position: 'absolute',
    bottom: -H * 0.3,
    left: -W * 0.5,
    width: W * 1.8,
    height: H * 0.5,
    backgroundColor: C.accent + '10',
    borderRadius: 80,
    transform: [{ rotate: '-35deg' }]
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : 40,
    paddingBottom: 10,
    zIndex: 10,
  },
  topBtn: {
    padding: 8,
  },
  skipText: {
    fontSize: 15,
    fontFamily: 'Poppins-SemiBold',
  },
  scrollView: {
    flex: 1,
  },
  slideContainer: {
    width: W,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingBottom: 30,
  },
  imageWrap: {
    width: W * 1.0,
    height: H * 0.5,
    marginBottom: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  textWrap: {
    alignItems: 'center',
    width: '100%',
  },
  slideTitle: {
    fontSize: 30,
    fontFamily: 'Montserrat-Bold',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  slideDesc: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: 'Poppins-Regular',
    paddingHorizontal: 10,
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 10 : 30,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  ctaBtn: {
    flexDirection: 'row',
    height: 56,
    borderRadius: radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 8,
    elevation: 4,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  ctaText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Poppins-SemiBold',
    letterSpacing: 0.5,
  },
});

export default Onboarding;
