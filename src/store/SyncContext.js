import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';

// Create a sync context to manage sync state across the app
export const SyncContext = createContext();

export const useSyncContext = () => useContext(SyncContext);

export const SyncProvider = ({ children }) => {
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Function to handle data synchronization
  const syncData = async () => {
    if (isSyncing) return; // Prevent multiple simultaneous syncs
    
    setIsSyncing(true);
    try {
      // We use a controlled flag to prevent infinite recursion
      // When this event is emitted, components should update their data
      // but they should NOT call syncData() again within their event handlers
      global.eventEmitter?.emit('SYNC_DATA', { fromSyncContext: true });
      
      // Update last sync time
      setLastSyncTime(new Date());
      
      // Optional: Show sync success message
      // Alert.alert('Sync Complete', 'Data has been synchronized successfully');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Sync Error', 'Failed to synchronize data. Please try again.');
    } finally {
      setIsSyncing(false);
    }
  };
  
  return (
    <SyncContext.Provider value={{ syncData, lastSyncTime, isSyncing }}>
      {children}
    </SyncContext.Provider>
  );
}; 