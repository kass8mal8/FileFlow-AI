export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  scope: string;
}

export enum FileCategory {
  Finance = 'Finance',
  Legal = 'Legal',
  Personal = 'Personal',
  Work = 'Work',
}

export enum SyncStatus {
  Success = 'Success',
  Pending = 'Pending',
  Error = 'Error',
}

export interface EmailAttachment {
  messageId: string;
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
  emailSubject: string;
  emailFrom: string;
  emailDate: string;
  emailSnippet: string;
  threadId: string;
}

export interface ProcessedFile {
  id: string;
  userEmail: string;
  messageId: string;
  filename: string;
  emailFrom?: string;
  emailSubject?: string;
  threadId?: string;
  attachmentId?: string;
  category: FileCategory;
  status: SyncStatus;
  uploadedAt: string;
  emailDate?: string;
  size: number;
  mimeType?: string;
  localUri?: string;
  localPath?: string;
  driveFileId?: string;
  driveUrl?: string;
  errorMessage?: string;
}

export interface ClassificationRequest {
  filename: string;
  emailSubject: string;
  emailSnippet: string;
  emailFrom: string;
}

export interface ClassificationResponse {
  category: FileCategory;
  confidence: number;
  reasoning?: string;
}

export interface UnreadEmail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
  isRead: boolean;
}
