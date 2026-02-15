// OAuth2 Configuration
export const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';
export const GOOGLE_CLIENT_SECRET = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET || '';

// OAuth2 Scopes
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email',
];

// API Endpoints
export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
export const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';
export const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
export const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';

// Backend AI Classification Endpoint
// TODO: Replace with your actual backend endpoint
export const AI_CLASSIFICATION_ENDPOINT = process.env.EXPO_PUBLIC_AI_CLASSIFICATION_ENDPOINT || 'https://your-backend-api.com/classify';

// Background Task Configuration
export const BACKGROUND_FETCH_TASK = 'fileflow-background-sync';
export const BACKGROUND_FETCH_INTERVAL = 15 * 60; // 15 minutes in seconds

// Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'fileflow_access_token',
  REFRESH_TOKEN: 'fileflow_refresh_token',
  TOKEN_EXPIRY: 'fileflow_token_expiry',
  USER_INFO: 'fileflow_user_info',
  PROCESSED_FILES: 'fileflow_processed_files',
  LAST_SYNC: 'fileflow_last_sync',
  SYNC_PERIOD: 'fileflow_sync_period',
  HISTORY_ID: 'fileflow_history_id',
  THEME_PREFERENCE: 'fileflow_theme_preference',
};

// Dropbox Configuration
export const DROPBOX_CLIENT_ID = process.env.EXPO_PUBLIC_DROPBOX_CLIENT_ID || 'YOUR_DROPBOX_CLIENT_ID';
export const DROPBOX_AUTH_ENDPOINT = 'https://www.dropbox.com/oauth2/authorize';
export const DROPBOX_TOKEN_ENDPOINT = 'https://api.dropboxapi.com/oauth2/token';

// Local Storage Configuration
export const LOCAL_ROOT_FOLDER = 'FileFlow';

// Google Drive Configuration
export const DRIVE_ROOT_FOLDER = 'FileFlow';

// File Processing
export const MAX_EMAILS_PER_SYNC = 10;
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain',
];
// Premium Theme Configuration (DEPRECATED: Use Tailwind utility classes)
export const THEME = {
  colors: {
    primary: '#334155', // Slate 700
    primaryLight: '#64748b', // Slate 500
    primaryDark: '#1e293b', // Slate 800
    background: '#ffffff',
    surface: '#f8fafc', // Slate 50
    text: '#1e293b', // Slate 800
    textSecondary: '#64748b', // Slate 500
    textTertiary: '#94a3b8', // Slate 400
    border: '#f1f5f9', // Slate 100
    success: '#059669', // Emerald 600
    warning: '#d97706', // Amber 600
    error: '#dc2626', // Red 600
    white: '#ffffff',
    glass: 'rgba(255, 255, 255, 0.5)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 40,
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    full: 9999,
  },
};
