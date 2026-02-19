import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { STORAGE_KEYS } from './constants';
import { AuthTokens, ProcessedFile, UnreadEmail, Todo } from '../types';
import { SubscriptionState, UsageQuota } from '../types/subscription';

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
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROCESSED_FILES);
    const allFiles: ProcessedFile[] = data ? JSON.parse(data) : [];
    
    const index = allFiles.findIndex((f) => f.id === id);
    if (index !== -1) {
      allFiles[index] = { ...allFiles[index], ...updates };
      await AsyncStorage.setItem(STORAGE_KEYS.PROCESSED_FILES, JSON.stringify(allFiles));
    }
  },

  async setLastSyncTime(timestamp: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  },

  async getLastSyncTime(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
  },

  async setLastCleanupTime(timestamp: string): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_CLEANUP, timestamp);
  },

  async getLastCleanupTime(): Promise<string | null> {
    return await AsyncStorage.getItem(STORAGE_KEYS.LAST_CLEANUP);
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

  /**
   * Subscription State
   */
  async getSubscriptionState(): Promise<SubscriptionState | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SUBSCRIPTION_STATE);
    return data ? JSON.parse(data) : null;
  },

  async setSubscriptionState(state: SubscriptionState): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.SUBSCRIPTION_STATE, JSON.stringify(state));
  },

  /**
   * Usage Quota
   */
  async getUsageQuota(): Promise<UsageQuota | null> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USAGE_QUOTA);
    return data ? JSON.parse(data) : null;
  },

  async setUsageQuota(quota: UsageQuota): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.USAGE_QUOTA, JSON.stringify(quota));
  },

  async getCachedEmails(): Promise<UnreadEmail[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_EMAILS);
    return data ? JSON.parse(data) : [];
  },

  async setCachedEmails(emails: UnreadEmail[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_EMAILS, JSON.stringify(emails));
  },

  async clearAll(): Promise<void> {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.USER_INFO,
      STORAGE_KEYS.PROCESSED_FILES,
      STORAGE_KEYS.LAST_SYNC,
      STORAGE_KEYS.SYNC_PERIOD,
      STORAGE_KEYS.HISTORY_ID,
      STORAGE_KEYS.THEME_PREFERENCE,
      STORAGE_KEYS.CACHED_EMAILS,
      STORAGE_KEYS.TODOS,
      STORAGE_KEYS.LAST_CLEANUP,
    ]);
  },

  /**
   * Todos
   */
  async getTodos(): Promise<Todo[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TODOS);
    return data ? JSON.parse(data) : [];
  },

  async setTodos(todos: Todo[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.TODOS, JSON.stringify(todos));
  },

  async addTodo(todo: Todo): Promise<void> {
    const todos = await this.getTodos();
    
    // Normalize for comparison
    const normalizedText = todo.text.trim().toLowerCase();
    const sourceId = todo.sourceId;

    // Avoid duplicates based on text AND sourceId
    const isDuplicate = todos.some(t => 
      (t.id === todo.id) || 
      (t.text.trim().toLowerCase() === normalizedText && t.sourceId === sourceId)
    );

    if (isDuplicate) {
      console.log('Skipping duplicate todo:', normalizedText);
      return;
    }

    todos.unshift(todo);
    await this.setTodos(todos);
    
    // Sync to server
    const userInfo = await this.getUserInfo();
    if (userInfo?.email) {
      const TodoService = require('../services/TodoService').default;
      TodoService.syncTodo(userInfo.email, todo).catch(console.error);
    }
  },

  async toggleTodo(id: string): Promise<void> {
    const todos = await this.getTodos();
    const index = todos.findIndex(t => t.id === id);
    if (index !== -1) {
      todos[index].completed = !todos[index].completed;
      await this.setTodos(todos);
      
      // Sync to server
      const userInfo = await this.getUserInfo();
      if (userInfo?.email) {
        const TodoService = require('../services/TodoService').default;
        TodoService.toggleTodo(userInfo.email, todos[index]).catch(console.error);
      }
    }
  },

  async deleteTodo(id: string): Promise<void> {
    const todos = await this.getTodos();
    const todoToDelete = todos.find(t => t.id === id);
    const filtered = todos.filter(t => t.id !== id);
    await this.setTodos(filtered);

    // Sync to server
    if (todoToDelete) {
      const userInfo = await this.getUserInfo();
      if (userInfo?.email) {
        const TodoService = require('../services/TodoService').default;
        TodoService.deleteTodo(userInfo.email, todoToDelete).catch(console.error);
      }
    }
  },

  /**
   * Extraction Tracking (to prevent duplicate AI work)
   */
  async getExtractedEmailIds(): Promise<string[]> {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.EXTRACTED_EMAILS);
    return data ? JSON.parse(data) : [];
  },

  async hasExtractedTodos(emailId: string): Promise<boolean> {
    const ids = await this.getExtractedEmailIds();
    return ids.includes(emailId);
  },

  async markAsExtracted(emailId: string): Promise<void> {
    const ids = await this.getExtractedEmailIds();
    if (!ids.includes(emailId)) {
      ids.push(emailId);
      // Keep only last 1000 to prevent infinite growth
      const limited = ids.slice(-1000);
      await AsyncStorage.setItem(STORAGE_KEYS.EXTRACTED_EMAILS, JSON.stringify(limited));
    }
  },
};
