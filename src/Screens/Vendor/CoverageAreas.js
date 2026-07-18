import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme/typography';

function CoverageAreas({ navigation }) {

  return (
    <View >
      <Header navigation={navigation} title="Coverage Areas" showBack />
    </View>
  );
}



export default CoverageAreas;
