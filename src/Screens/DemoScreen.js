import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Image,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

// AsyncStorage
/*
function DemoScreen() {
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('userName', name);
      setSavedName(name);
      alert('Saved successfully!');
    } catch (error) {
      alert('Error saving data');
    }
  };

  const loadData = async () => {
    try {
      const value = await AsyncStorage.getItem('userName');
      if (value !== null) {
        setSavedName(value);
        setName(value);
      }
    } catch (error) {
      console.log('Error loading data', error);
    }
  };

  const clearData = async () => {
    try {
      await AsyncStorage.removeItem('userName');
      setSavedName('');
      setName('');
      alert('Cleared successfully!');
    } catch (error) {
      alert('Error clearing data');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AsyncStorage Demo</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter your name"
        value={name}
        onChangeText={setName}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={saveData}
        >
          <Text style={styles.buttonText}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearData}
        >
          <Text style={styles.buttonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {savedName ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>Saved Name: {savedName}</Text>
        </View>
      ) : (
        <Text style={styles.noData}>No data saved yet</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  button: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButton: { backgroundColor: '#007AFF' },
  clearButton: { backgroundColor: '#FF3B30' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  resultBox: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  resultText: { fontSize: 18, color: '#333' },
  noData: { textAlign: 'center', fontSize: 16, color: '#999' },
});
*/

// Image Picker/ Camera

function DemoScreen() {
  const [imageUri, setImageUri] = useState(null);

  const pickImage = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel) {
        console.log('User cancelled');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
      } else if (response.assets) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const takePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      alert('Camera permission is required');
      return;
    }
    launchCamera({ mediaType: 'photo', quality: 0.8 }, response => {
      if (response.didCancel) {
        console.log('User cancelled');
      } else if (response.error) {
        console.log('Camera Error: ', response.error);
      } else if (response.assets) {
        setImageUri(response.assets[0].uri);
      }
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Image Picker Demo</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, styles.galleryButton]}
          onPress={pickImage}
        >
          <Text style={styles.buttonText}>Pick from Gallery</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cameraButton]}
          onPress={takePhoto}
        >
          <Text style={styles.buttonText}>Take Photo</Text>
        </TouchableOpacity>
      </View>

      {imageUri && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.image} />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => setImageUri(null)}
          >
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f5f5f5' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  galleryButton: { backgroundColor: '#007AFF' },
  cameraButton: { backgroundColor: '#34C759' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  imageContainer: { flex: 1, alignItems: 'center' },
  image: { width: 300, height: 300, borderRadius: 10, marginBottom: 20 },
  removeButton: {
    backgroundColor: '#FF3B30',
    padding: 10,
    borderRadius: 10,
    width: 150,
    alignItems: 'center',
  },
  removeText: { color: 'white', fontSize: 16, fontWeight: '600' },
});

export default DemoScreen;
