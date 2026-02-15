import axios from 'axios';
import authService from './auth';
import {
  DRIVE_API_BASE,
  UPLOAD_API_BASE,
  DRIVE_ROOT_FOLDER,
} from '../utils/constants';

/**
 * Google Drive Service
 * Handles folder management and file uploads to Google Drive
 */
class DriveService {
  private rootFolderId: string | null = null;

  /**
   * Get authorized headers for Google API requests
   */
  private async getHeaders() {
    const token = await authService.getValidAccessToken();
    if (!token) throw new Error('Not authenticated with Google');
    
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Find a folder by name and parent ID
   */
  private async findFolder(name: string, parentId?: string): Promise<string | null> {
    const headers = await this.getHeaders();
    let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    try {
      const response = await axios.get(`${DRIVE_API_BASE}/files`, {
        headers,
        params: {
          q: query,
          fields: 'files(id, name)',
          spaces: 'drive',
        },
      });

      const files = response.data.files;
      return files.length > 0 ? files[0].id : null;
    } catch (error) {
      console.error(`Error finding folder ${name}:`, error);
      return null;
    }
  }

  /**
   * Create a folder in Google Drive
   */
  private async createFolder(name: string, parentId?: string): Promise<string> {
    const headers = await this.getHeaders();
    const metadata = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : undefined,
    };

    try {
      const response = await axios.post(`${DRIVE_API_BASE}/files`, metadata, {
        headers,
      });
      return response.data.id;
    } catch (error) {
      console.error(`Error creating folder ${name}:`, error);
      throw new Error(`Failed to create folder: ${name}`);
    }
  }

  /**
   * Ensure the full folder path exists and return the leaf folder ID
   */
  private async ensureFolderPath(category: string, year: string): Promise<string> {
    // 1. Ensure Root Folder exists
    if (!this.rootFolderId) {
      this.rootFolderId = await this.findFolder(DRIVE_ROOT_FOLDER);
      if (!this.rootFolderId) {
        this.rootFolderId = await this.createFolder(DRIVE_ROOT_FOLDER);
      }
    }

    // 2. Ensure Category Folder exists
    let categoryFolderId = await this.findFolder(category, this.rootFolderId);
    if (!categoryFolderId) {
      categoryFolderId = await this.createFolder(category, this.rootFolderId);
    }

    // 3. Ensure Year Folder exists
    let yearFolderId = await this.findFolder(year, categoryFolderId);
    if (!yearFolderId) {
      yearFolderId = await this.createFolder(year, categoryFolderId);
    }

    return yearFolderId;
  }

  /**
   * Upload a file to Google Drive
   */
  async uploadFile(
    filename: string,
    base64Data: string,
    mimeType: string,
    category: string
  ): Promise<{ fileId: string; webViewLink: string }> {
    try {
      const year = new Date().getFullYear().toString();
      const folderId = await this.ensureFolderPath(category, year);
      const headers = await this.getHeaders();

      // Multipart upload
      const metadata = {
        name: filename,
        parents: [folderId],
      };

      // Gmail returns URL-safe base64, convert to standard base64 for Drive upload
      const normalizedBase64 = base64Data.replace(/-/g, '+').replace(/_/g, '/');

      // Construct multipart body manually for axios
      const boundary = 'foo_bar_baz';
      const delimiter = `--${boundary}`;
      const closeDelimiter = `--${boundary}--`;

      const multipartBody = 
        delimiter + '\r\n' +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) + '\r\n' +
        delimiter + '\r\n' +
        `Content-Type: ${mimeType}\r\n` +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        normalizedBase64 + '\r\n' +
        closeDelimiter;

      const response = await axios.post(
        `${UPLOAD_API_BASE}/files?uploadType=multipart&fields=id,name,webViewLink`,
        multipartBody,
        {
          headers: {
            ...headers,
            'Content-Type': `multipart/related; boundary=${boundary}`,
          },
        }
      );

      return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink,
      };
    } catch (error) {
      console.error(`Error uploading file ${filename}:`, error);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  /**
   * Revoke storage permissions (Reset cached folder IDs)
   */
  reset() {
    this.rootFolderId = null;
  }
}

export default new DriveService();
