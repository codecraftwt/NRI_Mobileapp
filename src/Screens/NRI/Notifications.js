import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography, spacing, radius } from '../../theme';

const staticNotifications = [
  {
    id: '1',
    type: 'success',
    title: 'Service Completed',
    message: 'Your property inspection for Pune Flat was completed successfully.',
    time: '2 hours ago',
    icon: 'check-circle',
    color: '#059669',
    bgColor: '#D1FAE5',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Action Required',
    message: 'Please upload the pending documents for your new tenant agreement.',
    time: '5 hours ago',
    icon: 'warning',
    color: '#D94625',
    bgColor: '#FBEAE5',
  },
  {
    id: '3',
    type: 'info',
    title: 'New Package Available',
    message: 'Explore our new Premium Property Management plan tailored for you.',
    time: '1 day ago',
    icon: 'local-offer',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  {
    id: '4',
    type: 'general',
    title: 'Welcome to NRI Circle',
    message: 'Thank you for joining. Your Relationship Manager is ready to assist you.',
    time: '3 days ago',
    icon: 'waving-hand',
    color: '#8B5CF6',
    bgColor: '#F3E8FF',
  },
];

function Notifications({ navigation }) {
  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Notifications" showBack />
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerSection}>
          <Text style={styles.title}>Recent Activity</Text>
          <TouchableOpacity>
            <Text style={styles.markReadText}>Mark all as read</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.listContainer}>
          {staticNotifications.map((notif, index) => (
            <TouchableOpacity 
              key={notif.id} 
              style={[
                styles.notificationCard, 
                index === staticNotifications.length - 1 && styles.lastCard
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.iconContainer, { backgroundColor: notif.bgColor }]}>
                <Icon name={notif.icon} size={24} color={notif.color} />
              </View>
              
              <View style={styles.contentContainer}>
                <Text style={styles.notifTitle}>{notif.title}</Text>
                <Text style={styles.notifMessage}>{notif.message}</Text>
                <Text style={styles.notifTime}>{notif.time}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#1A1A1A',
  },
  markReadText: {
    ...typography.labelMedium,
    color: '#D94625',
  },
  listContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    padding: 8,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  lastCard: {
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  notifTitle: {
    fontSize: 16,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    marginBottom: 4,
  },
  notifMessage: {
    ...typography.body,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 6,
  },
  notifTime: {
    ...typography.tiny,
    color: '#94A3B8',
  },
});

export default Notifications;
