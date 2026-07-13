import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch } from 'react-redux';
import { addFamilyMember } from '../../../Redux/slices/familySlice';
import { addProperty } from '../../../Redux/slices/propertiesSlice';
import { setOnboarded, login } from '../../../Redux/slices/userSlice';

function SetupWizard({ navigation }) {
  const dispatch = useDispatch();

  // Family Member inputs
  const [famName, setFamName] = useState('');
  const [famRelation, setFamRelation] = useState('');
  const [famAge, setFamAge] = useState('');
  const [famHealth, setFamHealth] = useState('');

  // Property inputs
  const [propName, setPropName] = useState('');
  const [propType, setPropType] = useState('');
  const [propAddress, setPropAddress] = useState('');

  const handleFinishSetup = () => {
    if (!famName || !famRelation || !propName || !propAddress) {
      Alert.alert('Details Required', 'Please enter at least one family member and one property to finish setup.');
      return;
    }

    // Dispatch family member to Redux
    dispatch(addFamilyMember({
      name: famName,
      relation: famRelation,
      age: parseInt(famAge) || 70,
      healthNotes: famHealth || 'No special requirements listed.',
      emergencyContact: '+91 99887 76655',
      address: propAddress,
    }));

    // Dispatch property to Redux
    dispatch(addProperty({
      name: propName,
      type: propType || 'Apartment',
      address: propAddress,
      tenantName: 'N/A',
      rentAmount: 0,
      utilities: {
        electricityNumber: 'N/A',
        waterNumber: 'N/A',
        propertyTaxId: 'N/A',
      },
      inspections: [],
    }));

    // Finalize user status in Redux
    dispatch(login({
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1 555 123 4567',
        membership: 'Family',
        membershipExpiry: '09 Jun 2027',
        language: 'English',
        onboarded: true,
        rm: {
          name: 'Rahul RM',
          email: 'rm@nricircle.com',
          phone: '+91 99887 76655',
          avatar: 'RA',
        }
      },
      token: 'fake-jwt-token-998877',
    }));

    Alert.alert(
      'Profile Setup Complete!',
      'Your care plan is now active. Your Relationship Manager has been briefed on your family and property details.',
      [
        { 
          text: 'Go to Dashboard', 
          onPress: () => navigation.replace('AppHome') 
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account Setup Wizard</Text>
        <Text style={styles.headerSubtitle}>Add your initial family and property care details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 1: Family Member */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Icon name="people" size={22} color="#007AFF" />
            <Text style={styles.sectionTitle}>1. Register Family Member</Text>
          </View>

          <Text style={styles.inputLabel}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Ramesh Patel"
            placeholderTextColor="#94A3B8"
            value={famName}
            onChangeText={setFamName}
          />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>Relation</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Father"
                placeholderTextColor="#94A3B8"
                value={famRelation}
                onChangeText={setFamRelation}
              />
            </View>
            <View style={{ width: 80, marginLeft: 12 }}>
              <Text style={styles.inputLabel}>Age</Text>
              <TextInput
                style={styles.input}
                placeholder="70"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={famAge}
                onChangeText={setFamAge}
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Medical / Health Notes</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="e.g. Diabetes, needs medicine reminders, escort for checkups..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={famHealth}
            onChangeText={setFamHealth}
          />
        </View>

        {/* Step 2: Property */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Icon name="location-city" size={22} color="#007AFF" />
            <Text style={styles.sectionTitle}>2. Register Property</Text>
          </View>

          <Text style={styles.inputLabel}>Property Nickname</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Rajarampuri House, Farm Land"
            placeholderTextColor="#94A3B8"
            value={propName}
            onChangeText={setPropName}
          />

          <Text style={styles.inputLabel}>Property Type</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 3 BHK Flat, Farm, Villa"
            placeholderTextColor="#94A3B8"
            value={propType}
            onChangeText={setPropType}
          />

          <Text style={styles.inputLabel}>Complete Address (Back in India)</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Complete address in India..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={propAddress}
            onChangeText={setPropAddress}
          />
        </View>

        {/* Action Button */}
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinishSetup}>
          <Text style={styles.finishBtnText}>Finish & Open Dashboard</Text>
          <Icon name="done-all" size={20} color="white" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
  },
  multilineInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  finishBtn: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  finishBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SetupWizard;
