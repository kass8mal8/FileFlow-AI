import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from './constants';
import { AuthTokens, ProcessedFile } from '../types';

/**
 * Secure storage for sensitive data (tokens)
 * Fallback to AsyncStorage on Web (not truly secure, but allows previewing)
 */
export const secureStorage = {
  async setTokens(tokens: AuthTokens): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
      await AsyncStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
      await AsyncStorage.setItem(
        STORAGE_KEYS.TOKEN_EXPIRY,
        (Date.now() + tokens.expiresIn * 1000).toString()
      );
      return;
    }
    await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken);
    await SecureStore.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken);
    await SecureStore.setItemAsync(
      STORAGE_KEYS.TOKEN_EXPIRY,
      (Date.now() + tokens.expiresIn * 1000).toString()
    );
  },

  async getAccessToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    }
    return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
  },

  async getRefreshToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    }
    return await SecureStore.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
  },

  async getTokenExpiry(): Promise<number | null> {
    if (Platform.OS === 'web') {
      const expiry = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRY);
      return expiry ? parseInt(expiry, 10) : null;
    }
    const expiry = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN_EXPIRY);
    return expiry ? parseInt(expiry, 10) : null;
  },

  async isTokenValid(): Promise<boolean> {
    const expiry = await this.getTokenExpiry();
    if (!expiry) return false;
    return Date.now() < expiry - 5 * 60 * 1000; // 5 minute buffer
  },

  async clearTokens(): Promise<void> {
    if (Platform.OS === 'web') {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.TOKEN_EXPIRY,
      ]);
      return;
    }
    await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
    await SecureStore.deleteItemAsync(STORAGE_KEYS.TOKEN_EXPIRY);
  },
};

/**
 * Regular storage for non-sensitive data
 */
export const appStorage = {
  async setUserInfo(userInfo: any): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
  },

  async getUserInfo(): Promise<any | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_INFO);
    return data ? JSON.parse(data) : null;
  },

  async setProcessedFiles(files: ProcessedFile[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.PROCESSED_FILES, JSON.stringify(files));
  },

  async getProcessedFiles(): Promise<ProcessedFile[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROCESSED_FILES);
    const files: ProcessedFile[] = data ? JSON.parse(data) : [];
    const userInfo = await this.getUserInfo();
    if (!userInfo?.email) return [];
    return files.filter(f => f.userEmail === userInfo.email);
  },

  async addProcessedFile(file: ProcessedFile): Promise<void> {
    const userInfo = await this.getUserInfo();
    if (!userInfo?.email) {
      console.warn('Cannot add processed file: No user info found');
      return;
    }
    
    // Ensure userEmail is set
    const fileWithUser = { ...file, userEmail: userInfo.email };
    
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROCESSED_FILES);
    const allFiles: ProcessedFile[] = data ? JSON.parse(data) : [];
    
    // Avoid duplicates for the same user and message
    const isDuplicate = allFiles.some(f => 
      f.userEmail === userInfo.email && 
      f.messageId === file.messageId && 
      f.filename === file.filename
    );

    if (isDuplicate) return;

    allFiles.unshift(fileWithUser); 
    await this.setProcessedFiles(allFiles.slice(0, 500)); // Increased limit since it's shared storage
  },

  async updateProcessedFile(id: string, updates: Partial<ProcessedFile>): Promise<void> {
    const files = await this.getProcessedFiles();
    const index = files.findIndex((f) => f.id === id);
    if (index !== -1) {
      files[index] = { ...files[index], ...updates };
      await this.setProcessedFiles(files);
    }
  },

  async setLastSync(timestamp: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  },

  async getLastSync(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  },

  async getSyncPeriod(): Promise<string> {
    return (await AsyncStorage.getItem(STORAGE_KEYS.SYNC_PERIOD)) || '30d';
  },

  async setSyncPeriod(period: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SYNC_PERIOD, period);
  },

  async getHistoryId(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.HISTORY_ID);
  },

  async setHistoryId(historyId: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.HISTORY_ID, historyId);
  },
  
  async getThemePreference(): Promise<'light' | 'dark' | 'system'> {
    return (await AsyncStorage.getItem(STORAGE_KEYS.THEME_PREFERENCE) as any) || 'system';
  },

  async setThemePreference(theme: 'light' | 'dark' | 'system'): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.THEME_PREFERENCE, theme);
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_INFO,
      STORAGE_KEYS.PROCESSED_FILES,
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.SYNC_PERIOD,
      STORAGE_KEYS.HISTORY_ID,
      STORAGE_KEYS.THEME_PREFERENCE,
    ]);
  },
};
