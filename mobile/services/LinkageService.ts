import { appStorage } from '../utils/storage';
import { ProcessedFile, UnreadEmail } from '../types';
import gmailService from './gmail';

interface RelatedThread {
  id: string;
  messageId: string;
  subject: string;
  snippet: string;
  date: string;
  from: string;
}

class LinkageService {
  /**
   * Find documents related to a specific sender/contact
   */
  async getRelatedKnowledge(fromEmail: string, currentEmailId?: string): Promise<{ files: ProcessedFile[], threads: RelatedThread[] }> {
    try {
      // 1. Get all processed files
      const allFiles = await appStorage.getProcessedFiles();
      
      // 2. Filter files sent by this contact
      const relatedFiles = allFiles.filter(file => 
        file.emailFrom?.toLowerCase().includes(fromEmail.toLowerCase())
      );

      // 3. Fetch real email threads from Gmail (Pre-filter from cache if possible)
      let relatedThreads: RelatedThread[] = [];
      try {
        // Optimization: Try to use cached emails first to avoid hitting rate limits
        let allEmails = await appStorage.getCachedEmails();
        
        if (!allEmails || allEmails.length === 0) {
          allEmails = await gmailService.fetchRecentUnreadEmails();
        }
        
        // Filter emails from the same sender, excluding current email
        relatedThreads = (allEmails || [])
          .filter(email => 
            email.from.toLowerCase().includes(fromEmail.toLowerCase()) && 
            email.id !== currentEmailId
          )
          .slice(0, 3)
          .map(email => ({
            id: email.id,
            messageId: email.id,
            subject: email.subject,
            snippet: email.snippet,
            date: email.date,
            from: email.from
          }));
      } catch (error) {
        console.warn('Could not fetch related threads:', error);
      }

      return {
        files: relatedFiles.slice(0, 5),
        threads: relatedThreads
      };
    } catch (error) {
      console.error('Error fetching linkage:', error);
      return { files: [], threads: [] };
    }
  }
}

export default new LinkageService();
