/**
 * Unified AI service: tries Gemini first, then HuggingFace.
 * Ensures summary and reply generation never leave the client without a valid response.
 */
const geminiService = require('./geminiService');
const huggingFaceService = require('./huggingFaceService');

const hasGemini = !!process.env.GEMINI_API_KEY;
const hasHuggingFace = !!process.env.HUGGINGFACE_API_KEY;

const DEFAULT_SUMMARY = "This message contains information that may need your attention. Review the content for key points and any requested actions.";
const DEFAULT_REPLIES = ["Thanks for reaching out!", "Acknowledged, I'm on it.", "Will review and reply by EOD."];

function ensureString(value) {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return DEFAULT_SUMMARY;
}

function ensureRepliesArray(value, count = 3) {
  if (Array.isArray(value) && value.length > 0) {
    const filtered = value.filter(r => typeof r === 'string' && r.trim()).slice(0, count);
    if (filtered.length > 0) return filtered;
  }
  return DEFAULT_REPLIES.slice(0, count);
}

class UnifiedAIService {
  async generateSummary(text, customPrompt) {
    if (hasGemini) {
      try {
        const summary = await geminiService.generateSummary(text, customPrompt);
        return ensureString(summary);
      } catch (err) {
        console.warn('Gemini summary failed, trying HuggingFace:', err.message);
      }
    }
    if (hasHuggingFace) {
      try {
        const summary = await huggingFaceService.generateSummary(text, customPrompt);
        return ensureString(summary);
      } catch (err) {
        console.warn('HuggingFace summary failed:', err.message);
      }
    }
    return DEFAULT_SUMMARY;
  }

  async generateSmartReplies(text, count = 3, userName = 'the user') {
    if (hasGemini) {
      try {
        const replies = await geminiService.generateSmartReplies(text, count, userName);
        return ensureRepliesArray(replies, count);
      } catch (err) {
        console.warn('Gemini replies failed, trying HuggingFace:', err.message);
      }
    }
    if (hasHuggingFace) {
      try {
        const replies = await huggingFaceService.generateSmartReplies(text, count, userName);
        return ensureRepliesArray(replies, count);
      } catch (err) {
        console.warn('HuggingFace replies failed:', err.message);
      }
    }
    return DEFAULT_REPLIES.slice(0, count);
  }

  async classifyContent(filename, subject, snippet, from) {
    if (hasGemini) {
      try {
        return await geminiService.classifyContent(filename, subject, snippet, from);
      } catch (err) {
        console.warn('Gemini classify failed, trying HuggingFace:', err.message);
      }
    }
    if (hasHuggingFace) {
      try {
        return await huggingFaceService.classifyContent(filename, subject, snippet, from);
      } catch (err) {
        console.warn('HuggingFace classify failed:', err.message);
      }
    }
    return 'Personal';
  }

  async extractActionItems(text, userName = 'the user') {
    if (hasGemini) {
      try {
        return await geminiService.extractActionItems(text, userName);
      } catch (err) {
        console.warn('Gemini extraction failed, trying HuggingFace:', err.message);
      }
    }
    if (hasHuggingFace) {
      try {
        return await huggingFaceService.extractActionItems(text, userName);
      } catch (err) {
        console.warn('HuggingFace extraction failed:', err.message);
      }
    }
    return "No specific action items detected.";
  }

  async *generateSummaryStream(text, customPrompt) {
    if (hasGemini) {
      try {
        const prompt = customPrompt || "Summarize this email in a professional, concise tone (max 2 sentences). Focus on the core intent, requested actions, and any mentioned deadlines.";
        const combinedPrompt = `${prompt}\n\nEmail Content:\n${text}`;
        yield* geminiService.generateWithFallbackStream(combinedPrompt);
        return;
      } catch (err) {
        console.warn('Gemini stream failed, falling back to static summary:', err.message);
      }
    }
    yield await this.generateSummary(text, customPrompt);
  }

  async *extractActionItemsStream(text, userName = 'the user') {
    if (hasGemini) {
      try {
        const prompt = `
          Analyze the following email and extract a "To-Do" list of action items. 
          Rules for extraction:
          1. Only include items that require a specific action from the recipient (Personalization: The recipient is ${userName}).
          2. Assign a priority: [High], [Medium], [Low].
          3. Identify any mentioned deadlines and format them as (Due: Date/Time).
          4. Output the result as a clean Markdown checklist.
          Email Content: """${text}"""
        `;
        yield* geminiService.generateWithFallbackStream(prompt);
        return;
      } catch (err) {
        console.warn('Gemini extraction stream failed:', err.message);
      }
    }
    yield await this.extractActionItems(text, userName);
  }

  /**
   * Foundation for Semantic Search
   */
  async getEmbeddings(text) {
    if (hasGemini) {
      return await geminiService.generateEmbeddings(text);
    }
    return [];
  }

  async generateSearchTerms(query) {
    if (hasGemini) {
      const prompt = `Analyze this natural language search query: "${query}". 
      Extract key search entities, keywords, and dates. 
      Output exactly one comma-separated string of terms for a search engine.`;
      const response = await geminiService.generateWithFallback(prompt);
      return response;
    }
    return query;
  }
}

module.exports = new UnifiedAIService();
