import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { createStartupSnapshotStore } from './snapshotStore';

export const createNativeSnapshotStore = () => createStartupSnapshotStore({
  secureStorage: {
    getItem: key => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
  },
  dataStorage: AsyncStorage,
});
