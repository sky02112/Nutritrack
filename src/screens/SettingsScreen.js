import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Switch, Linking } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome } from '@expo/vector-icons';
import SafeAreaWrapper from '../components/SafeAreaWrapper';
import Constants from 'expo-constants';

const SettingsScreen = () => {
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  return (
    <SafeAreaWrapper backgroundColor="#F0F6FF" statusBarStyle="dark-content">
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage your app preferences</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <MaterialIcons name="account-circle" size={20} color="#1565C0" />
            </View>
            <Text style={styles.sectionTitle}>Account</Text>
          </View>

          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemText}>Edit Profile</Text>
            <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemText}>Change Password</Text>
            <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.item} 
            onPress={() => setDeleteModalVisible(true)}
          >
            <Text style={[styles.itemText, { color: '#D32F2F' }]}>Delete Account</Text>
            <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <Ionicons name="settings-outline" size={20} color="#1565C0" />
            </View>
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>

          <View style={styles.item}>
            <Text style={styles.itemText}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#BDBDBD', true: '#90CAF9' }}
              thumbColor={notificationsEnabled ? '#1565C0' : '#f4f3f4'}
            />
          </View>

          <View style={styles.item}>
            <Text style={styles.itemText}>Dark Mode</Text>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#BDBDBD', true: '#90CAF9' }}
              thumbColor={darkModeEnabled ? '#1565C0' : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconContainer}>
              <FontAwesome name="info-circle" size={20} color="#1565C0" />
            </View>
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <TouchableOpacity 
            style={styles.item} 
            onPress={() => Linking.openURL('https://example.com/privacy')}
          >
            <Text style={styles.itemText}>Privacy Policy</Text>
            <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.item}
            onPress={() => Linking.openURL('https://example.com/terms')}
          >
            <Text style={styles.itemText}>Terms of Service</Text>
            <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemText}>Contact Support</Text>
            <MaterialIcons name="chevron-right" size={24} color="#BDBDBD" />
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>
          Version {Constants.manifest?.version || '1.0.0'}
        </Text>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Deleting your account will permanently remove all your data from our servers. 
                This action cannot be undone.
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.deleteButton}
              onPress={() => {
                // Handle delete account
                setDeleteModalVisible(false);
              }}
            >
              <Text style={styles.deleteButtonText}>Delete My Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setDeleteModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F6FF',
  },
  header: {
    backgroundColor: '#1565C0',
    padding: 20,
    paddingBottom: 15,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#E3F2FD',
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginVertical: 10,
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#1565C0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#E3F2FD',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1565C0',
    marginLeft: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E3F2FD',
  },
  itemText: {
    fontSize: 16,
    color: '#424242',
  },
  itemValue: {
    fontSize: 16,
    color: '#1565C0',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  version: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 30,
    color: '#78909C',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1565C0',
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#1565C0',
    fontWeight: 'bold',
    fontSize: 16,
  },
  infoContainer: {
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 10,
    marginBottom: 20,
  },
  infoText: {
    color: '#1565C0',
    fontSize: 14,
    lineHeight: 20,
  },
});

export default SettingsScreen; 