const aiService = require('../services/aiService');
const ragService = require('../services/ragService');
const userService = require('../services/userService');

class AIController {
  /**
   * Handle file classification request
   */
  async classify(req, res) {
    try {
      const { filename, emailSubject, emailSnippet, emailFrom } = req.body;
      
      if (!filename) {
        return res.status(400).json({ error: 'Filename is required' });
      }

      const category = await aiService.classifyContent(
        filename,
        emailSubject,
        emailSnippet,
        emailFrom
      );

      res.json({ category, confidence: 0.9 });
    } catch (error) {
      console.error('Controller Classification Error:', error);
      res.status(500).json({ error: 'Failed to process classification' });
    }
  }

  /**
   * NEW: Comprehensive Email Analysis (uses EmailAnalysis model)
   */
  async analyzeEmail(req, res) {
    try {
      const { text, emailId, userId, userName, tier, from } = req.body;
      
      if (!text || !emailId || !userId) {
        return res.status(400).json({ error: 'text, emailId, and userId are required' });
      }

      // Get or create comprehensive analysis
      const analysis = await aiService.getOrCreateAnalysis(emailId, userId, text, userName || 'User', tier || 'free', from);
      
      if (analysis) {
        return res.json({
          summary: analysis.summary.text,
          summaryConfidence: analysis.summary.confidence,
          replies: analysis.replies,
          actionItems: analysis.actionItems,
          intent: analysis.intent.type,
          intentConfidence: analysis.intent.confidence,
          intentDetails: analysis.intent.details,
          intentActions: analysis.intent.actions,
          cached: analysis.accessCount > 1 // If accessed before, it was cached
        });
      } else {
        return res.status(500).json({ error: 'Failed to generate analysis' });
      }
    } catch (error) {
      console.error('Email Analysis Error:', error);
      res.status(500).json({ error: 'Failed to analyze email' });
    }
  }

  /**
   * NEW: Progressive Email Analysis with Server-Sent Events
   * Streams results as they complete for faster perceived performance
   */
  async analyzeEmailProgressive(req, res) {
    try {
      const { text, emailId, userId, userName, tier, from } = req.body;
      
      if (!text || !emailId || !userId) {
        return res.status(400).json({ error: 'text, emailId, and userId are required' });
      }

      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const sendEvent = (type, data) => {
        res.write(`data: ${JSON.stringify({ type, data })}\n\n`);
      };

      // Check cache first
      const EmailAnalysis = require('../models/EmailAnalysis');
      let analysis = await EmailAnalysis.findOne({ emailId, userId });
      
      if (analysis) {
        // Send all cached data immediately
        sendEvent('summary', { 
          text: analysis.summary.text, 
          confidence: analysis.summary.confidence 
        });
        sendEvent('replies', analysis.replies);
        sendEvent('actionItems', analysis.actionItems);
        sendEvent('intent', {
          type: analysis.intent.type,
          confidence: analysis.intent.confidence,
          details: analysis.intent.details,
          actions: analysis.intent.actions
        });
        sendEvent('complete', { cached: true });
        
        // Update access tracking
        analysis.lastAccessed = new Date();
        analysis.accessCount += 1;
        await analysis.save();
        
        return res.end();
      }

      // Generate progressively
      const replyCount = tier === 'pro' ? 3 : 1;
      const isNoReply = from && from.toLowerCase().includes('noreply');
      const summaryAgent = require('../agents/SummaryAgent');

      // 1. Summary (fastest, ~2s)
      sendEvent('progress', { step: 1, total: 4, message: 'Generating summary...' });
      const summaryResult = await summaryAgent.execute(text, { tier })
        .catch(() => ({ summary: 'Unable to generate summary', confidence: 0.5 }));
      
      let finalSummary = typeof summaryResult === 'string' ? summaryResult : (summaryResult.summary || 'Unable to generate summary');
      if (isNoReply && !finalSummary.startsWith('[System Notice]')) {
        finalSummary = `[System Notice] ${finalSummary}`;
      }
      
      sendEvent('summary', { 
        text: finalSummary, 
        confidence: summaryResult.confidence || 0.85 
      });

      // 2. Replies (fast, ~3s)
      sendEvent('progress', { step: 2, total: 4, message: 'Generating smart replies...' });
      const replies = isNoReply ? [] : await aiService.generateSmartReplies(text, replyCount, userName || 'User', emailId, tier)
        .catch(() => ['Thanks for reaching out!', 'Acknowledged, I\'m on it.', 'Will review and reply by EOD.']);
      
      sendEvent('replies', replies);

      // 3. Action Items (medium, ~4s)
      sendEvent('progress', { step: 3, total: 4, message: 'Extracting action items...' });
      const actionItemsResult = isNoReply ? { tasks: [], confidence: 1 } : await aiService.extractActionItems(text, userName || 'User', tier, emailId)
        .catch(() => ({ tasks: [], confidence: 0 }));
      
      sendEvent('actionItems', actionItemsResult.tasks || []);

      // 4. Intent Detection (slowest, ~5s)
      sendEvent('progress', { step: 4, total: 4, message: 'Detecting intent...' });
      const intentResult = await aiService.detectIntent(text, emailId, tier)
        .catch(() => ({ intent: 'INFO', confidence: 0, details: {}, actions: [] }));
      
      sendEvent('intent', {
        type: intentResult.intent || 'INFO',
        confidence: intentResult.confidence || 0,
        details: intentResult.details || {},
        actions: intentResult.actions || []
      });

      // Save to database for future requests
      await EmailAnalysis.create({
        emailId,
        userId,
        summary: {
          text: finalSummary,
          confidence: summaryResult.confidence || 0.85
        },
        replies: Array.isArray(replies) ? replies : [],
        actionItems: actionItemsResult.tasks || [],
        intent: {
          type: intentResult.intent || 'INFO',
          confidence: intentResult.confidence || 0,
          details: intentResult.details || {},
          actions: intentResult.actions || []
        }
      }).catch(e => console.error('Failed to save analysis:', e.message));

      sendEvent('complete', { cached: false });
      res.end();
    } catch (error) {
      console.error('Progressive Analysis Error:', error);
      res.write(`data: ${JSON.stringify({ type: 'error', data: { message: error.message } })}\n\n`);
      res.end();
    }
  }

  /**
   * Handle summary generation request
   */
  async summary(req, res) {
    try {
      const { text, prompt, stream, resourceId } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      if (stream) {
        // Stream doesn't use cache yet for MVP simplicity
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        for await (const chunk of aiService.generateSummaryStream(text, prompt)) {
          res.write(chunk);
        }
        return res.end();
      }

      const summary = await aiService.generateSummary(text, prompt, resourceId);
      res.json({ summary });
    } catch (error) {
      console.error('Error in summary:', error);
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * Handle smart replies generation request
   */
  async replies(req, res) {
    try {
      const { text, count, userName, resourceId } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required for replies' });
      }

      const replies = await aiService.generateSmartReplies(text, count, userName, resourceId);
      res.json({ replies });
    } catch (error) {
      console.error('Controller Replies Error:', error);
      res.status(500).json({ error: 'Failed to generate replies' });
    }
  }

  /**
   * List available models (debug)
   */
  async getModels(req, res) {
    res.json({ 
      status: "Reliable Local Intelligence active", 
      engine: "Rule-Based Pattern Matching (v1.0)",
      external_ai: "Falling back from Gemini/Hugging Face"
    });
  }

  /**
   * Extract action items (To-Do list)
   */
  async extractTodo(req, res) {
    try {
      const { text, stream, userName } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        for await (const chunk of aiService.extractActionItemsStream(text, userName)) {
          res.write(chunk);
        }
        return res.end();
      }

      const result = await aiService.extractActionItems(text, userName);
      res.json({ todoList: result.tasks || result, confidence: result.confidence || 0.5 });
    } catch (error) {
      console.error('Error in extractTodo:', error);
      res.status(500).json({ error: 'Failed' });
    }
  }

  /**
   * Semantic Search Endpoint
   */
  async search(req, res) {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: 'Query is required' });

      // Generate context for search
      const embeddings = await aiService.getEmbeddings(query);
      const searchTerms = await aiService.generateSearchTerms(query);

      // Return search metadata (MOCK results for phase 1)
      res.json({ 
        query, 
        suggestedTerms: searchTerms,
        vectorSize: embeddings.length,
        results: [
          { id: '1', type: 'email', title: 'Mobile App Budget Discussion', snippet: 'Following up on the budget we talked about...' },
          { id: '2', type: 'file', title: 'Budget_Draft_v1.pdf', snippet: 'Projected costs for mobile development phase.' }
        ]
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }

  /**
   * Chat with a specific file (RAG)
   */
  /**
   * Chat with a specific file (RAG) or context
   */
  async chat(req, res) {
    try {
      const { query, context } = req.body;
      const file = req.file;

      if (!query) return res.status(400).json({ error: 'Query is required' });
      if (!file && !context) return res.status(400).json({ error: 'File or Context is required' });

      let textToAnalyze = context || '';

      if (file) {
        console.log(`Processing chat for file: ${file.originalname} (${file.mimetype})`);
        textToAnalyze = await ragService.extractText(file.path, file.mimetype);
      }

      // Chat with Document/Context
      const answer = await ragService.chatWithDocument(query, textToAnalyze);

      res.json({ answer });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process chat request' });
    }
  }
  /**
   * Detect User Intent
   */
  async detectIntent(req, res) {
    try {
      const { text, filename, subject, from } = req.body;
      
      // Construct a meaningful context string
      const context = text || `File: ${filename}\nSubject: ${subject}\nSender: ${from}`;
      
      if (!context) return res.status(400).json({ error: 'Context is required' });

      // Use the service to classify intent
      const resourceId = filename ? `${filename}_${subject}` : (req.body.resourceId || 'unknown');
      const intentData = await aiService.detectIntent(context, resourceId);
      
      res.json(intentData);
    } catch (error) {
       console.error('Intent detection error:', error);
       res.status(500).json({ error: 'Intent detection failed' });
    }
  }

  /**
   * Generate holistic user recap
   */
  async getRecap(req, res) {
    try {
      const { userId, items } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId is required' });
      
      const recap = await aiService.generateUserRecap(userId, items || []);
      res.json({ recap });
    } catch (error) {
      console.error('Recap Controller Error:', error);
      res.status(500).json({ error: 'Failed to generate recap' });
    }
  }
}

module.exports = new AIController();
