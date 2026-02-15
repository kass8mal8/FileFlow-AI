import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { Platform } from 'react-native';
import { SyncStatus, ProcessedFile, EmailAttachment } from '../types';
import { BACKGROUND_FETCH_TASK, BACKGROUND_FETCH_INTERVAL } from '../utils/constants';
import { appStorage } from '../utils/storage';
import gmailService from './gmail';
import driveService from './drive';
import classifierService from './classifier';
import authService from './auth';

/**
 * Background Sync Service
 * Handles background task registration and email processing
 */
class BackgroundService {
  /**
   * Register background fetch task
   */
  async registerBackgroundTask(): Promise<void> {
    if (Platform.OS === 'web') {
      console.log('Background tasks are not supported on Web');
      return;
    }

    try {
      const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
      
      if (isRegistered) {
        console.log('Background task already registered');
        return;
      }

      await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
        minimumInterval: BACKGROUND_FETCH_INTERVAL,
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background task registered successfully');
    } catch (error) {
      console.error('Error registering background task:', error);
      throw error;
    }
  }

  /**
   * Unregister background fetch task
   */
  async unregisterBackgroundTask(): Promise<void> {
    if (Platform.OS === 'web') return;

    try {
      await BackgroundFetch.unregisterTaskAsync(BACKGROUND_FETCH_TASK);
      console.log('Background task unregistered');
    } catch (error) {
      console.error('Error unregistering background task:', error);
    }
  }

  /**
   * Check if background task is registered
   */
  async isBackgroundTaskRegistered(): Promise<boolean> {
    if (Platform.OS === 'web') return false;
    return await TaskManager.isTaskRegisteredAsync(BACKGROUND_FETCH_TASK);
  }

  /**
   * Process emails and organize attachments
   * This is the main sync logic
   */
  async processEmails(): Promise<ProcessedFile[]> {
    const processedFiles: ProcessedFile[] = [];

    try {
      console.log('Starting email processing...');

      // Load sync preferences and state
      const historyId = await appStorage.getHistoryId();
      const syncPeriod = await appStorage.getSyncPeriod();
      const customQuery = this.getSyncQueryForPeriod(syncPeriod);

      // Fetch emails (Incremental or Query-based)
      const { attachments, historyId: newHistoryId } = await gmailService.fetchUnreadEmailsWithAttachments({
        historyId: (historyId && historyId !== 'undefined') ? historyId : undefined,
        customQuery: (historyId && historyId !== 'undefined') ? undefined : customQuery,
      });
      
      if (attachments.length === 0) {
        console.log('No new attachments found');
        await appStorage.setLastSync(new Date().toISOString());
        if (newHistoryId) await appStorage.setHistoryId(newHistoryId);
        return processedFiles;
      }

      // Step: Filter non-existent emails (interpret "filter the ones that don't exist in gmail")
      console.log('Cleaning up ghost files...');
      const storedFiles = await appStorage.getProcessedFiles();
      const validFiles: ProcessedFile[] = [];
      const userInfo = await appStorage.getUserInfo();
      
      for (const file of storedFiles) {
        try {
          // Check if message still exists in Gmail
          await gmailService.getMessageDetails(file.messageId, await authService.getValidAccessToken() || '');
          validFiles.push(file);
        } catch (error) {
          console.log(`File ${file.filename} (Message ${file.messageId}) no longer exists in Gmail, removing.`);
        }
      }
      
      if (validFiles.length !== storedFiles.length) {
        await appStorage.setProcessedFiles(validFiles);
      }

      console.log(`Found ${attachments.length} attachments to process`);

      // Process each attachment
      for (const attachment of attachments) {
        try {
          // Skip if already processed
          const alreadyProcessed = validFiles.some(f => f.messageId === attachment.messageId && f.filename === attachment.filename);
          if (alreadyProcessed) continue;

          const processedFile = await this.processAttachment(attachment, userInfo.email);
          processedFiles.push(processedFile);
          
          // Store processed file
          await appStorage.addProcessedFile(processedFile);
        } catch (error) {
          console.error(`Error processing attachment ${attachment.filename}:`, error);
          
          // Store failed file
          const failedFile: ProcessedFile = {
            id: `${Date.now()}-${attachment.filename}`,
            userEmail: userInfo.email,
            messageId: attachment.messageId,
            filename: attachment.filename,
            category: 'Personal' as any,
            status: SyncStatus.Error,
            uploadedAt: new Date().toISOString(),
            emailDate: attachment.emailDate,
            size: attachment.size,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
          };
          
          processedFiles.push(failedFile);
          await appStorage.addProcessedFile(failedFile);
        }
      }

      // Update state for next incremental sync
      await appStorage.setLastSync(new Date().toISOString());
      if (newHistoryId) {
        await appStorage.setHistoryId(newHistoryId);
      }
      
      console.log(`Processed ${processedFiles.length} files`);
      return processedFiles;
    } catch (error) {
      console.error('Error in processEmails:', error);
      throw error;
    }
  }

  /**
   * Calculate Gmail query for a given sync period
   */
  private getSyncQueryForPeriod(period: string): string {
    if (period === 'all') return '';
    
    const days = parseInt(period) || 30;
    const date = new Date();
    date.setDate(date.getDate() - days);
    
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    return `after:${yyyy}/${mm}/${dd}`;
  }

  /**
   * Process a single attachment
   */
  private async processAttachment(attachment: EmailAttachment, userEmail: string): Promise<ProcessedFile> {
    const fileId = `${Date.now()}-${attachment.filename}`;
    
    try {
      // Step 1: Classify the file
      console.log(`Classifying ${attachment.filename}...`);
      const category = await classifierService.classifyFile({
        filename: attachment.filename,
        emailSubject: attachment.emailSubject,
        emailSnippet: attachment.emailSnippet,
        emailFrom: attachment.emailFrom,
      });

      // Step 2: Download attachment
      console.log(`Downloading ${attachment.filename}...`);
      const attachmentData = await gmailService.downloadAttachment(
        attachment.messageId,
        attachment.attachmentId
      );

      // Step 3: Upload to Google Drive
      console.log(`Uploading ${attachment.filename} to Drive...`);
      const driveFile = await driveService.uploadFile(
        attachment.filename,
        attachmentData,
        attachment.mimeType,
        category
      );

      // Step 4: Create processed file record
      const processedFile: ProcessedFile = {
        id: fileId,
        userEmail: userEmail,
        messageId: attachment.messageId,
        filename: attachment.filename,
        emailFrom: attachment.emailFrom,
        emailSubject: attachment.emailSubject,
        threadId: attachment.threadId,
        category: category,
        status: SyncStatus.Success,
        uploadedAt: new Date().toISOString(),
        emailDate: attachment.emailDate,
        size: attachment.size,
        driveFileId: driveFile.fileId,
        driveUrl: driveFile.webViewLink,
      };

      console.log(`Successfully processed ${attachment.filename}`);
      return processedFile;
    } catch (error) {
      console.error(`Failed to process ${attachment.filename}:`, error);
      throw error;
    }
  }
}

// Define the background task (skip on Web)
if (Platform.OS !== 'web') {
  TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
    try {
      console.log('Background task executing...');
      
      const backgroundServiceInstance = new BackgroundService();
      await backgroundServiceInstance.processEmails();
      
      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background task error:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  });
}

export default new BackgroundService();
