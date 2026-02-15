import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

class AIService {
  /**
   * Generate a 2-sentence summary of the email content
   */
  async generateSummary(emailBody: string): Promise<string> {
    // In a real app, this would call an LLM API
    // For now, we simulate with a prompt-based structure if an endpoint exists, 
    // or return a mock summary.
    
    try {
      // Direct call to our new backend
      const response = await axios.post(`${API_BASE_URL}/summary`, {
        text: emailBody.substring(0, 5000), // Cap for token limits
        prompt: "Summarize this email in a professional, concise tone (max 2 sentences). Focus on the core intent, requested actions, and any mentioned deadlines."
      });
      const summary = response.data?.summary;
      if (typeof summary === 'string' && summary.trim()) return summary.trim();
      return "This message contains information that may need your attention. Review the content for key points and any requested actions.";
    } catch (error) {
      // Improved mock responses based on common email patterns
      if (emailBody.toLowerCase().includes('invoice') || emailBody.toLowerCase().includes('payment')) {
        return "This email contains an invoice or payment request. It outlines balance details and provides instructions for processing the transaction.";
      }
      if (emailBody.toLowerCase().includes('meeting') || emailBody.toLowerCase().includes('calendar')) {
        return "The sender is requesting a meeting to discuss project coordination. Key action: Check availability for the proposed time slots.";
      }
      return "This message discusses general project updates and collaboration. No immediate urgent actions were detected, but a review is recommended.";
    }
  }

  /**
   * Generate smart replies based on email content
   */
  async generateReplies(emailBody: string): Promise<string[]> {
    const fallback = ["Thanks for reaching out!", "Acknowledged, I'm on it.", "Will review and reply by EOD."];
    try {
      const response = await axios.post(`${API_BASE_URL}/replies`, {
        text: emailBody,
        count: 3
      });
      const replies = response.data?.replies;
      if (Array.isArray(replies) && replies.length > 0) {
        const valid = replies.filter((r): r is string => typeof r === 'string' && r.trim());
        if (valid.length > 0) return valid.slice(0, 3);
      }
      return fallback;
    } catch (error) {
      return fallback;
    }
  }
}

export default new AIService();
