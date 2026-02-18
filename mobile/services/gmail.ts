import api from './api';
import { EmailAttachment, UnreadEmail } from '../types';
import { GMAIL_API_BASE, MAX_EMAILS_PER_SYNC } from '../utils/constants';
import authService from './auth';
import { appStorage } from '../utils/storage';

// Cross-platform Base64 Helpers
const base64Decode = (str: string) => {
  // Convert URL safe base64 to standard base64
  const standard = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    // Web/Modern RN
    if (typeof atob !== 'undefined') {
      return decodeURIComponent(
        atob(standard)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    }
    // Fallback or other environments could go here
    return standard; 
  } catch (e) {
    console.error('Base64 decode error:', e);
    return str;
  }
};

const base64Encode = (str: string) => {
  try {
    if (typeof btoa !== 'undefined') {
      return btoa(
        encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) =>
          String.fromCharCode(parseInt(p1, 16))
        )
      );
    }
    return str;
  } catch (e) {
    console.error('Base64 encode error:', e);
    return str;
  }
};

/**
 * Gmail API Service
 * Handles fetching emails and attachments
 */
class GmailService {
  /**
   * Fetch emails using Gmail History API (Incremental Sync)
   */
  async fetchIncrementalChanges(startHistoryId: string): Promise<EmailAttachment[]> {
    try {
      const accessToken = await authService.getValidAccessToken();
      if (!accessToken) throw new Error('No valid token');

      const response = await api.get(
        `${GMAIL_API_BASE}/users/me/history`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: {
            startHistoryId,
            historyTypes: ['messageAdded'],
          },
        }
      );

      const history = response.data.history || [];
      const messageIds = new Set<string>();

      for (const record of history) {
        if (record.messagesAdded) {
          for (const added of record.messagesAdded) {
            messageIds.add(added.message.id);
          }
        }
      }

      const attachments: EmailAttachment[] = [];
      for (const id of messageIds) {
        const details = await this.getMessageDetails(id, accessToken);
        // Only include if unread (since we want to process new ones)
        attachments.push(...details);
      }

      return attachments;
    } catch (error: any) {
      if (error.response?.status === 404) {
        console.warn('History ID expired, triggering fallback sync.');
        return null as any; // Signal fallback
      }
      console.error('Error in incremental sync:', error);
      return [];
    }
  }

  /**
   * Fetch unread emails with attachments
   */
  async fetchUnreadEmailsWithAttachments(options?: { customQuery?: string; historyId?: string }): Promise<{ attachments: EmailAttachment[], historyId: string }> {
    try {
      const accessToken = await authService.getValidAccessToken();
      
      if (!accessToken) {
        throw new Error('No valid access token');
      }

      let attachments: EmailAttachment[] = [];
      let latestHistoryId = '';

      if (options?.historyId) {
        const incremental = await this.fetchIncrementalChanges(options.historyId);
        if (incremental === null) {
          // Fallback to query if history ID expired
          attachments = await this.fetchUnreadWithQuery(accessToken, options?.customQuery);
        } else {
          attachments = incremental;
        }
      } else {
        attachments = await this.fetchUnreadWithQuery(accessToken, options?.customQuery);
      }

      // Get current profile to update historyId for next time
      const profile = await api.get(`${GMAIL_API_BASE}/users/me/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      latestHistoryId = profile.data.historyId;

      return { attachments, historyId: latestHistoryId };
    } catch (error) {
      console.error('Error fetching emails:', error);
      throw error;
    }
  }

  /**
   * Helper to fetch unread emails via query
   */
  private async fetchUnreadWithQuery(accessToken: string, customQuery?: string): Promise<EmailAttachment[]> {
    let q = 'has:attachment';
    if (customQuery) {
      q = `${q} ${customQuery}`;
    }

    const searchResponse = await api.get(
      `${GMAIL_API_BASE}/users/me/messages`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { q, maxResults: MAX_EMAILS_PER_SYNC },
      }
    );

    const messages = searchResponse.data.messages || [];
    const attachments: EmailAttachment[] = [];
    for (const message of messages) {
      const messageDetails = await this.getMessageDetails(message.id, accessToken);
      attachments.push(...messageDetails);
    }
    return attachments;
  }

  /**
   * Fetch recent unread emails (even without attachments) for AI summary/replies
   */
  async fetchRecentUnreadEmails(): Promise<UnreadEmail[]> {
    try {
      const accessToken = await authService.getValidAccessToken();
      if (!accessToken) throw new Error('No valid access token');

      const response = await api.get(
        `${GMAIL_API_BASE}/users/me/messages`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { q: 'is:unread', maxResults: 10 },
        }
      );

      const messages = response.data.messages || [];
      const unreadEmails: UnreadEmail[] = [];

      for (const msg of messages) {
        const detailResp = await api.get(
          `${GMAIL_API_BASE}/users/me/messages/${msg.id}`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );
        const data = detailResp.data;
        const headers = data.payload.headers;

        unreadEmails.push({
          id: data.id,
          threadId: data.threadId,
          from: headers.find((h: any) => h.name === 'From')?.value || '',
          subject: headers.find((h: any) => h.name === 'Subject')?.value || '',
          snippet: data.snippet || '',
          date: headers.find((h: any) => h.name === 'Date')?.value || '',
          isRead: false,
        });
      }

      // Cache the results for fast access later
      await appStorage.setCachedEmails(unreadEmails);

      return unreadEmails;
    } catch (error) {
      console.error('Error fetching unread emails:', error);
      return [];
    }
  }

  /**
   * Get message details including attachments
   */
  public async getMessageDetails(
    messageId: string,
    accessToken: string
  ): Promise<EmailAttachment[]> {
    try {
      const response = await api.get(
        `${GMAIL_API_BASE}/users/me/messages/${messageId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      const message = response.data;
      const headers = message.payload.headers;
      
      // Extract email metadata
      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const date = headers.find((h: any) => h.name === 'Date')?.value || '';
      const snippet = message.snippet || '';

      // Extract attachments
      const attachments: EmailAttachment[] = [];
      
      const parts = message.payload.parts || [];
      for (const part of parts) {
        if (part.filename && part.body.attachmentId) {
          attachments.push({
            messageId: messageId,
            attachmentId: part.body.attachmentId,
            filename: part.filename,
            mimeType: part.mimeType,
            size: part.body.size,
            emailSubject: subject,
            emailFrom: from,
            emailDate: date,
            emailSnippet: snippet,
            threadId: message.threadId,
          });
        }
      }

      return attachments;
    } catch (error) {
      console.error('Error getting message details:', error);
      return [];
    }
  }

  /**
   * Download attachment data
   */
  async downloadAttachment(
    messageId: string,
    attachmentId: string
  ): Promise<string> {
    try {
      const accessToken = await authService.getValidAccessToken();
      
      if (!accessToken) {
        throw new Error('No valid access token');
      }

      const response = await api.get(
        `${GMAIL_API_BASE}/users/me/messages/${messageId}/attachments/${attachmentId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      // Return base64 encoded data
      return response.data.data;
    } catch (error) {
      console.error('Error downloading attachment:', error);
      throw error;
    }
  }

  /**
   * Get full email body for AI processing
   */
  async getMessageBody(messageId: string): Promise<string> {
    try {
      const accessToken = await authService.getValidAccessToken();
      if (!accessToken) throw new Error('No valid token');

      const response = await api.get(
        `${GMAIL_API_BASE}/users/me/messages/${messageId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      const payload = response.data.payload;
      let body = '';

      const getBody = (part: any) => {
        if (part.body.data) {
          const decoded = base64Decode(part.body.data);
          body += decoded;
        }
        if (part.parts) {
          part.parts.forEach(getBody);
        }
      };

      getBody(payload);
      return body || response.data.snippet;
    } catch (error) {
      console.error('Error getting message body:', error);
      return '';
    }
  }

  /**
   * Create a draft response in Gmail
   */
  async createDraft(threadId: string, to: string, subject: string, body: string): Promise<void> {
    try {
      const accessToken = await authService.getValidAccessToken();
      if (!accessToken) throw new Error('No valid access token');

      // Simple RFC 2822 message format
      const rawMessage = [
        `To: ${to}`,
        `Subject: Re: ${subject}`,
        `In-Reply-To: ${threadId}`,
        `References: ${threadId}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        body,
      ].join('\n');

      // Base64URL encode the message
      const encodedMessage = base64Encode(rawMessage)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await api.post(
        `${GMAIL_API_BASE}/users/me/drafts`,
        {
          message: {
            threadId: threadId,
            raw: encodedMessage,
          },
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error) {
      console.error('Error creating draft:', error);
      throw error;
    }
  }

  /**
   * Send an email immediately
   */
  async sendEmail(threadId: string, to: string, subject: string, body: string): Promise<void> {
    try {
      const accessToken = await authService.getValidAccessToken();
      if (!accessToken) throw new Error('No valid access token');

      // Simple RFC 2822 message format
      const rawMessage = [
        `To: ${to}`,
        `Subject: Re: ${subject}`,
        `In-Reply-To: ${threadId}`,
        `References: ${threadId}`,
        'Content-Type: text/plain; charset="UTF-8"',
        '',
        body,
      ].join('\n');

      // Base64URL encode the message
      const encodedMessage = base64Encode(rawMessage)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await api.post(
        `${GMAIL_API_BASE}/users/me/messages/send`,
        {
          raw: encodedMessage,
          threadId: threadId
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Mark email as read
   */
  async markAsRead(messageId: string): Promise<void> {
    try {
      const accessToken = await authService.getValidAccessToken();
      
      if (!accessToken) {
        throw new Error('No valid access token');
      }

      await api.post(
        `${GMAIL_API_BASE}/users/me/messages/${messageId}/modify`,
        {
          removeLabelIds: ['UNREAD'],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  }
}

export default new GmailService();
