import axios from 'axios';
import { FileCategory, ClassificationRequest, ClassificationResponse } from '../types';
import { AI_CLASSIFICATION_ENDPOINT } from '../utils/constants';

/**
 * AI Classification Service
 * Classifies files into categories using backend AI endpoint
 */
class ClassifierService {
  /**
   * Classify file based on email context
   */
  async classifyFile(request: ClassificationRequest): Promise<FileCategory> {
    try {
      // Try backend AI classification first
      const category = await this.classifyWithBackend(request);
      if (category) {
        return category;
      }
    } catch (error) {
      console.log('Backend classification failed, falling back to rule-based');
    }

    // Fallback to rule-based classification
    return this.classifyWithRules(request);
  }

  /**
   * Classify using backend AI endpoint
   */
  private async classifyWithBackend(
    request: ClassificationRequest
  ): Promise<FileCategory | null> {
    try {
      // Early exit for placeholder URL to avoid CORS/Network errors in dev
      if (AI_CLASSIFICATION_ENDPOINT.includes('your-backend-api.com')) {
        return null;
      }

      const response = await axios.post<ClassificationResponse>(
        AI_CLASSIFICATION_ENDPOINT,
        request,
        {
          timeout: 10000, // 10 second timeout
        }
      );

      if (response.data && response.data.category) {
        return response.data.category;
      }

      return null;
    } catch (error) {
      // Silent fallback for network/CORS errors which are expected during local dev
      if (axios.isAxiosError(error) && (error.code === 'ERR_NETWORK' || !error.response)) {
        // Only log if it's NOT the placeholder
        if (!AI_CLASSIFICATION_ENDPOINT.includes('your-backend-api.com')) {
          console.log('Classifier backend unavailable, using rule-based fallback');
        }
      } else {
        console.warn('Backend classification failed:', error instanceof Error ? error.message : 'Unknown error');
      }
      return null;
    }
  }

  /**
   * Rule-based classification using keywords
   */
  private classifyWithRules(request: ClassificationRequest): FileCategory {
    const { filename, emailSubject, emailSnippet, emailFrom } = request;
    
    // Combine all text for analysis
    const text = `${filename} ${emailSubject} ${emailSnippet} ${emailFrom}`.toLowerCase();

    // Finance keywords
    const financeKeywords = [
      'invoice',
      'receipt',
      'payment',
      'bill',
      'statement',
      'tax',
      'finance',
      'bank',
      'transaction',
      'paypal',
      'stripe',
      'purchase',
      'order',
      'refund',
      'expense',
      'revenue',
      'accounting',
    ];

    // Legal keywords
    const legalKeywords = [
      'contract',
      'agreement',
      'nda',
      'legal',
      'terms',
      'policy',
      'compliance',
      'regulation',
      'law',
      'attorney',
      'lawyer',
      'court',
      'lawsuit',
      'settlement',
    ];

    // Work keywords
    const workKeywords = [
      'report',
      'presentation',
      'meeting',
      'project',
      'proposal',
      'memo',
      'minutes',
      'agenda',
      'deadline',
      'deliverable',
      'milestone',
      'sprint',
      'roadmap',
      'quarterly',
      'annual',
      'review',
    ];

    // Personal keywords
    const personalKeywords = [
      'photo',
      'picture',
      'vacation',
      'family',
      'personal',
      'birthday',
      'wedding',
      'travel',
      'ticket',
      'reservation',
      'booking',
    ];

    // Count keyword matches
    const financeScore = this.countKeywords(text, financeKeywords);
    const legalScore = this.countKeywords(text, legalKeywords);
    const workScore = this.countKeywords(text, workKeywords);
    const personalScore = this.countKeywords(text, personalKeywords);

    // Determine category based on highest score
    const scores = [
      { category: FileCategory.Finance, score: financeScore },
      { category: FileCategory.Legal, score: legalScore },
      { category: FileCategory.Work, score: workScore },
      { category: FileCategory.Personal, score: personalScore },
    ];

    scores.sort((a, b) => b.score - a.score);

    // Return highest scoring category, default to Personal if no matches
    return scores[0].score > 0 ? scores[0].category : FileCategory.Personal;
  }

  /**
   * Count keyword occurrences in text
   */
  private countKeywords(text: string, keywords: string[]): number {
    let count = 0;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        count++;
      }
    }
    return count;
  }
}

export default new ClassifierService();
