import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

function Onboarding({ navigation }) {
  const [activeSlide, setActiveSlide] = useState(0);

  const slides = [
    {
      title: 'Parent & Elder Care',
      description: 'Scheduled doctor visits, medicine delivery coordination, and weekly wellness reports with photos. Peace of mind for your parents back home.',
      icon: 'favorite',
      color: '#10B981', // green
    },
    {
      title: 'Property & Farm Management',
      description: 'Periodic inspection visits, utility bill payments, tenant coordination, and drone boundary surveys for agricultural lands.',
      icon: 'location-city',
      color: '#F59E0B', // amber
    },
    {
      title: '24x7 Emergency SOS',
      description: 'Instant medical help, ambulance coordination, police support, or break-in response. A dedicated relationship manager always on call.',
      icon: 'error-outline',
      color: '#EF4444', // red
    }
  ];

  const handleScroll = (event) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveSlide(slide);
  };

  return (
    <View style={styles.container}>
      {/* Skip Button */}
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
          <Text style={styles.skipText}>Sign Up</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Swipeable Content */}
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((slide, index) => (
          <View key={index} style={styles.slideContainer}>
            <View style={[styles.iconBox, { backgroundColor: slide.color }]}>
              <Icon name={slide.icon} size={64} color="white" />
            </View>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDesc}>{slide.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Slide Indicators & CTA */}
      <View style={styles.footer}>
        <View style={styles.indicatorRow}>
          {slides.map((_, index) => (
            <View 
              key={index} 
              style={[
                styles.indicator, 
                activeSlide === index ? styles.indicatorActive : null
              ]} 
            />
          ))}
        </View>

        <TouchableOpacity 
          style={styles.ctaBtn}
          onPress={() => {
            if (activeSlide < slides.length - 1) {
              // Scroll to next slide
              // For simplicity on mobile, navigate to login or scroll
              navigation.navigate('Login');
            } else {
              navigation.navigate('Login');
            }
          }}
        >
          <Text style={styles.ctaText}>
            {activeSlide === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Icon name="arrow-forward" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  skipText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  slideContainer: {
    width: width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  iconBox: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Outfit',
  },
  slideDesc: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'Roboto',
  },
  footer: {
    paddingHorizontal: 24,
    alignItems: 'center',
    gap: 30,
  },
  indicatorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  indicatorActive: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  ctaText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default Onboarding;
