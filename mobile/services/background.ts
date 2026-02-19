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
        await appStorage.setLastSyncTime(new Date().toISOString());
        if (newHistoryId) await appStorage.setHistoryId(newHistoryId);
        return processedFiles;
      }

      // Step: Filter non-existent emails (interpret "filter the ones that don't exist in gmail")
      // Optimization: Only cleanup ghost files occasionally (e.g. once every 24h) to save API calls
      console.log('Checking for ghost files cleanup...');
      const storedFiles = await appStorage.getProcessedFiles();
      const userInfo = await appStorage.getUserInfo();
      const lastCleanup = await appStorage.getLastCleanupTime();
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      let validFiles: ProcessedFile[] = [...storedFiles];
      
      if (!lastCleanup || new Date(lastCleanup) < oneDayAgo) {
        console.log('Performing periodic ghost files cleanup...');
        const newValidFiles: ProcessedFile[] = [];
        const accessToken = await authService.getValidAccessToken() || '';
        
        // Chunk processing to avoid hitting rate limits even during cleanup
        for (let i = 0; i < storedFiles.length; i += 5) {
          const chunk = storedFiles.slice(i, i + 5);
          await Promise.all(chunk.map(async (file) => {
            try {
              await gmailService.getMessageDetails(file.messageId, accessToken);
              newValidFiles.push(file);
            } catch (error) {
              console.log(`File ${file.filename} no longer exists in Gmail, removing.`);
            }
          }));
        }
        
        validFiles = newValidFiles;
        await appStorage.setLastCleanupTime(now.toISOString());
        
        if (validFiles.length !== storedFiles.length) {
          await appStorage.setProcessedFiles(validFiles);
        }
      } else {
        console.log('Skipping ghost file cleanup (recently performed)');
      }

      console.log(`Found ${attachments.length} attachments to process`);

      // Eager processing: Process new attachments in SMALL CHUNKS to avoid hitting rate limits
      for (let i = 0; i < attachments.length; i += 3) {
        const chunk = attachments.slice(i, i + 3);
        await Promise.all(chunk.map(async (attachment) => {
          try {
            // Skip if already exists in storage
            const alreadyProcessed = validFiles.some(f => f.messageId === attachment.messageId && f.filename === attachment.filename);
            if (alreadyProcessed) return;

            console.log(`Processing ${attachment.filename}...`);
            const processedFile = await this.processAttachment(attachment, userInfo.email);
            processedFiles.push(processedFile);
            await appStorage.addProcessedFile(processedFile);
          } catch (error) {
            console.error(`Error processing ${attachment.filename}:`, error);
             // Fallback: create pending entry
             const pendingFile: ProcessedFile = {
              id: `${Date.now()}-${attachment.filename}`,
              userEmail: userInfo.email,
              messageId: attachment.messageId,
              filename: attachment.filename,
              emailFrom: attachment.emailFrom,
              emailSubject: attachment.emailSubject,
              threadId: attachment.threadId,
              attachmentId: attachment.attachmentId,
              category: 'Personal' as any,
              status: SyncStatus.Pending,
              uploadedAt: new Date().toISOString(),
              emailDate: attachment.emailDate,
              size: attachment.size,
              mimeType: attachment.mimeType,
            };
            await appStorage.addProcessedFile(pendingFile);
          }
        }));
      }

      // Update state for next incremental sync
      await appStorage.setLastSyncTime(new Date().toISOString());
      if (newHistoryId) {
        await appStorage.setHistoryId(newHistoryId);
      }
      
      console.log(`Processed ${processedFiles.length} files`);
      
      // Pro Feature: Auto-extract todos from all unread emails (even without attachments)
      const SubscriptionService = require('./SubscriptionService').default;
      await SubscriptionService.initialize();
      
      if (SubscriptionService.isPro()) {
        console.log('Pro User: Starting background todo extraction...');
        const recentEmails = await gmailService.fetchRecentUnreadEmails();
        const AIService = require('./AIService').default;
        const NotificationService = require('./NotificationService').default;
        
        let newTodoCount = 0;
        
        for (const email of recentEmails) {
          // Check if we've already tried to extract from this email recently
          const alreadyExtracted = await appStorage.hasExtractedTodos(email.id);
          if (alreadyExtracted) continue;

          console.log(`Extracting todos from: ${email.subject}`);
          const body = await gmailService.getMessageBody(email.id);
          const tasks = await AIService.extractTodo(body, undefined, userInfo.userName);
          
          if (Array.isArray(tasks) && tasks.length > 0) {
            for (const task of tasks) {
              const taskText = typeof task === 'string' ? task : task.task;
              if (taskText) {
                await appStorage.addTodo({
                  id: `auto-${email.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  text: taskText,
                  sourceId: email.id,
                  sourceTitle: email.subject || 'Email',
                  completed: false,
                  createdAt: new Date().toISOString()
                });
                newTodoCount++;
              }
            }
          }
          await appStorage.markAsExtracted(email.id);
        }

        if (newTodoCount > 0) {
          await NotificationService.notifyNewTodos(newTodoCount);
        }
      }

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
