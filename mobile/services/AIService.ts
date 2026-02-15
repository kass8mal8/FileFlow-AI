import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

class AIService {
  /**
   * Universal streaming text utility
   */
  async streamText(endpoint: string, text: string, onUpdate: (chunk: string) => void, userName?: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, stream: true, userName })
      });

      if (!response.body) throw new Error('ReadableStream not supported');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        onUpdate(fullText);
      }
      return fullText;
    } catch (error) {
      console.error(`Streaming error at ${endpoint}:`, error);
      return "";
    }
  }

  /**
   * Generate a 2-sentence summary of the email content
   */
  async generateSummary(emailBody: string, onUpdate?: (text: string) => void, userName?: string): Promise<string> {
    if (onUpdate) {
      return await this.streamText('summary', emailBody, onUpdate, userName);
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/summary`, {
        text: emailBody.substring(0, 5000)
      });
      return response.data?.summary || "";
    } catch (error) {
      return "Summary unavailable.";
    }
  }

  /**
   * Generate smart replies based on email content
   */
  async generateReplies(emailBody: string, userName?: string): Promise<string[]> {
    const fallback = ["Thanks for reaching out!", "Acknowledged, I'm on it.", "Will review and reply by EOD."];
    try {
      const response = await axios.post(`${API_BASE_URL}/replies`, {
        text: emailBody,
        userName,
        count: 3
      });
      const replies = response.data?.replies;
      if (Array.isArray(replies) && replies.length > 0) {
        const valid = replies.filter((r): r is string => typeof r === 'string' && !!r.trim());
        if (valid.length > 0) return valid.slice(0, 3);
      }
      return fallback;
    } catch (error) {
      return fallback;
    }
  }

  /**
   * Extract action items (To-Do list)
   */
  async extractTodo(emailBody: string, onUpdate?: (text: string) => void, userName?: string): Promise<string> {
    if (onUpdate) {
      return await this.streamText('todo', emailBody, onUpdate, userName);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/todo`, {
        text: emailBody,
        userName
      });
      return response.data?.todoList || "No specific action items detected.";
    } catch (error) {
      return "No specific action items detected.";
    }
  }
}

export default new AIService();
