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

  async generateSmartReplies(text, count = 3) {
    if (hasGemini) {
      try {
        const replies = await geminiService.generateSmartReplies(text, count);
        return ensureRepliesArray(replies, count);
      } catch (err) {
        console.warn('Gemini replies failed, trying HuggingFace:', err.message);
      }
    }
    if (hasHuggingFace) {
      try {
        const replies = await huggingFaceService.generateSmartReplies(text, count);
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
}

module.exports = new UnifiedAIService();
