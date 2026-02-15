import axios from 'axios';
import { AI_CLASSIFICATION_ENDPOINT } from '../utils/constants';

class AIService {
  /**
   * Generate a 2-sentence summary of the email content
   */
  async generateSummary(emailBody: string): Promise<string> {
    // In a real app, this would call an LLM API
    // For now, we simulate with a prompt-based structure if an endpoint exists, 
    // or return a mock summary.
    
    try {
      if (AI_CLASSIFICATION_ENDPOINT.includes('your-backend-api.com')) {
        return "This email discusses project updates and upcoming deadlines. The sender is requesting a follow-up on the latest file shared.";
      }

      // Mock LLM call logic
      const response = await axios.post(`${AI_CLASSIFICATION_ENDPOINT}/summary`, {
        text: emailBody.substring(0, 1000), // Cap for token limits
        prompt: "Summarize this email in a professional, concise tone (max 2 sentences). Focus on the core intent, requested actions, and any mentioned deadlines. Do not use generic phrases."
      });
      return response.data.summary;
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
    try {
      if (AI_CLASSIFICATION_ENDPOINT.includes('your-backend-api.com')) {
        // Dynamic mock replies based on context
        if (emailBody.toLowerCase().includes('?')) {
          return [
            "Yes, that works for me. Let's proceed.",
            "I'll need to double-check and get back to you.",
            "Could you provide more details on this?"
          ];
        }
        return [
          "Confirmed. Thank you for the update!",
          "I've received the files, will review shortly.",
          "Perfect, let's touch base later this week."
        ];
      }

      const response = await axios.post(`${AI_CLASSIFICATION_ENDPOINT}/replies`, {
        text: emailBody,
        count: 3
      });
      return response.data.replies;
    } catch (error) {
      return ["Thanks for reaching out!", "Acknowledged, I'm on it.", "Will review and reply by EOD."];
    }
  }
}

export default new AIService();
