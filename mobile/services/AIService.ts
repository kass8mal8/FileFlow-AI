import api from './api';
import { API_BASE_URL } from '../utils/constants';

class AIService {
  /**
   * Universal streaming text utility
   */
  async streamText(endpoint: string, text: string, onUpdate: (chunk: string) => void, userName?: string): Promise<string> {
    try {
      const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
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
      const response = await api.post(`${API_BASE_URL}/summary`, {
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
      const response = await api.post(`${API_BASE_URL}/replies`, {
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
   * Extract action items (To-Do list) - Returns structured JSON
   */
  async extractTodo(emailBody: string, onUpdate?: (tasks: any[]) => void, userName?: string): Promise<any[]> {
    const fallback: any[] = [];
    
    try {
      const response = await api.post(`${API_BASE_URL}/todo`, {
        text: emailBody,
        userName
      });
      
      const todoList = response.data?.todoList;
      
      // Handle both JSON array and legacy string responses
      if (Array.isArray(todoList)) {
        return todoList;
      } else if (typeof todoList === 'string') {
        // Legacy fallback: parse string as single task
        return todoList.trim() ? [{ task: todoList, priority: 'Medium', due_date: null }] : fallback;
      }
      
      return fallback;
    } catch (error) {
      console.error('Extract todo error:', error);
      return fallback;
    }
  }
  /**
   * Comprehensive Email Analysis with Persistence
   */
  async analyzeEmail(data: { 
    text: string; 
    emailId: string; 
    userId: string; 
    userName?: string; 
    tier?: 'free' | 'pro'; 
    from?: string; 
  }): Promise<any> {
    try {
      const response = await api.post(`${API_BASE_URL}/analyze`, data);
      return response.data;
    } catch (error) {
      console.error('Analysis error:', error);
      return null;
    }
  }

  /**
   * Progressive Email Analysis with Server-Sent Events
   * Calls callbacks as each result arrives for faster perceived performance
   */
  async analyzeEmailProgressive(
    data: { 
      text: string; 
      emailId: string; 
      userId: string; 
      userName?: string; 
      tier?: 'free' | 'pro'; 
      from?: string; 
    },
    callbacks: {
      onProgress?: (step: number, total: number, message: string) => void;
      onSummary?: (summary: string, confidence: number) => void;
      onReplies?: (replies: string[]) => void;
      onActionItems?: (items: any[]) => void;
      onIntent?: (intent: any) => void;
      onComplete?: (cached: boolean) => void;
      onError?: (error: string) => void;
    }
  ): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/analyze-progressive`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(data)
      });

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              
              switch (event.type) {
                case 'progress':
                  callbacks.onProgress?.(event.data.step, event.data.total, event.data.message);
                  break;
                case 'summary':
                  callbacks.onSummary?.(event.data.text, event.data.confidence);
                  break;
                case 'replies':
                  callbacks.onReplies?.(event.data);
                  break;
                case 'actionItems':
                  callbacks.onActionItems?.(event.data);
                  break;
                case 'intent':
                  callbacks.onIntent?.(event.data);
                  break;
                case 'complete':
                  callbacks.onComplete?.(event.data.cached);
                  break;
                case 'error':
                  callbacks.onError?.(event.data.message);
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Progressive analysis error:', error);
      callbacks.onError?.('Failed to analyze email');
    }
  }
}

export default new AIService();
