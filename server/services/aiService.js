/**
 * Unified AI service: tries Gemini first, then HuggingFace.
 * Ensures summary and reply generation never leave the client without a valid response.
 */
const geminiService = require('./geminiService');
const huggingFaceService = require('./huggingFaceService');

// Agents
const classifierAgent = require('../agents/ClassifierAgent');
const summaryAgent = require('../agents/SummaryAgent');
const extractionAgent = require('../agents/ExtractionAgent');
// const actionAgent = require('../agents/ActionAgent'); // Future use

const hasGemini = !!process.env.GEMINI_API_KEY;
const hasHuggingFace = !!process.env.HUGGINGFACE_API_KEY;

const AICache = require('../models/AICache');
const EmailAnalysis = require('../models/EmailAnalysis');

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
  /**
   * Helper: Check Cache or Execute & Save
   */
  async getCachedResult(resourceId, type, params, generatorFn) {
    try {
      if (!resourceId) return await generatorFn(); // Can't cache without ID

      // 1. Check Cache
      const cached = await AICache.findOne({ resourceId, type, params: JSON.stringify(params) });
      if (cached) {
        console.log(`⚡ Serving ${type} from Cache for ${resourceId}`);
        return cached.result;
      }

      // 2. Generate
      const result = await generatorFn();

      // 3. Save to Cache (Fire & Forget)
      if (result) {
        AICache.create({
          resourceId, 
          type, 
          params: JSON.stringify(params), 
          result,
          modelUsed: hasHuggingFace ? 'HuggingFace' : 'Gemini'
        }).catch(e => console.error("Cache save failed:", e.message));
      }

      return result;
    } catch (e) {
      console.error(`Cache Error (${type}):`, e.message);
      return await generatorFn(); // Fallback to fresh generation
    }
  }

  /**
   * NEW: Check EmailAnalysis (permanent storage) or generate and save
   */
  async getOrCreateAnalysis(emailId, userId, text, userName) {
    try {
      if (!emailId || !userId) {
        console.warn('Missing emailId or userId, skipping permanent storage');
        return null;
      }

      // 1. Check if analysis exists
      let analysis = await EmailAnalysis.findOne({ emailId, userId });
      
      if (analysis) {
        // Update access tracking
        analysis.lastAccessed = new Date();
        analysis.accessCount += 1;
        await analysis.save();
        
        console.log(`📦 Retrieved analysis for ${emailId} (accessed ${analysis.accessCount} times)`);
        return analysis;
      }

      // 2. Generate all AI content
      console.log(`🤖 Generating new analysis for ${emailId}`);
      
      const [summaryResult, replies, actionItemsResult, intent] = await Promise.all([
        summaryAgent.execute(text, {}).catch(() => ({ summary: DEFAULT_SUMMARY, confidence: 0.5 })),
        this.generateSmartReplies(text, 3, userName).catch(() => DEFAULT_REPLIES),
        this.extractActionItems(text, userName).catch(() => ({ tasks: [], confidence: 0 })),
        this.detectIntent(text, emailId).catch(() => ({ intent: 'INFO', confidence: 0, details: {} }))
      ]);

      // 3. Save to EmailAnalysis (permanent)
      analysis = await EmailAnalysis.create({
        emailId,
        userId,
        summary: {
          text: typeof summaryResult === 'string' ? summaryResult : (summaryResult.summary || DEFAULT_SUMMARY),
          confidence: summaryResult.confidence || 0.85 // Default high confidence if not provided
        },
        replies: Array.isArray(replies) ? replies : DEFAULT_REPLIES,
        actionItems: actionItemsResult.tasks || [],
        intent: {
          type: intent.intent || 'INFO',
          confidence: intent.confidence || 0,
          details: intent.details || {}
        }
      });

      console.log(`✅ Saved analysis for ${emailId} with confidence: ${analysis.summary.confidence}`);
      return analysis;
    } catch (error) {
      console.error('EmailAnalysis error:', error.message);
      return null;
    }
  }

  async generateSummary(text, customPrompt, resourceId) {
    return await this.getCachedResult(resourceId, 'SUMMARY', { prompt: customPrompt || 'default' }, async () => {
       return await summaryAgent.execute(text, { prompt: customPrompt });
    });
  }

  async generateSmartReplies(text, count = 3, userName = 'the user', resourceId) {
    return await this.getCachedResult(resourceId, 'REPLIES', { count, userName }, async () => {
      // Logic copied from previous implementation
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
    });
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
    return { tasks: [], confidence: 0 };
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
  async detectIntent(text, resourceId) {
    return await this.getCachedResult(resourceId, 'INTENT', { len: text.length }, async () => {
        try {
            // Step 1: Classification (Mistral -> Gemini)
            const classification = await classifierAgent.execute(text, {});
            const intent = classification.intent;
    
            // Step 2: Extraction based on Intent (Gemini Pro)
            let details = {};
            if (['INVOICE', 'MEETING', 'CONTRACT'].includes(intent)) {
                details = await extractionAgent.execute(text, { intent });
            }
    
            return {
                intent,
                confidence: classification.confidence,
                details,
                source: classification.source
            };
        } catch (e) {
            console.error("Agent orchestration failed:", e);
            return { intent: "INFO", confidence: 0, details: {} };
        }
    });
  }
}

module.exports = new UnifiedAIService();
