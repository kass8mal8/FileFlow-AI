const aiService = require('../services/aiService');

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
   * Handle summary generation request
   */
  async summary(req, res) {
    try {
      const { text, prompt, stream } = req.body;
      if (!text) {
        return res.status(400).json({ error: 'Text is required' });
      }

      if (stream) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        for await (const chunk of aiService.generateSummaryStream(text, prompt)) {
          res.write(chunk);
        }
        return res.end();
      }

      const summary = await aiService.generateSummary(text, prompt);
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
      const { text, count, userName } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required for replies' });
      }

      const replies = await aiService.generateSmartReplies(text, count, userName);
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

      const todoList = await aiService.extractActionItems(text, userName);
      res.json({ todoList });
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
}

module.exports = new AIController();
