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
      const { text, prompt } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required for summary' });
      }

      const summary = await aiService.generateSummary(text, prompt);
      res.json({ summary });
    } catch (error) {
      console.error('Controller Summary Error:', error);
      res.status(500).json({ error: 'Failed to generate summary' });
    }
  }

  /**
   * Handle smart replies generation request
   */
  async replies(req, res) {
    try {
      const { text, count } = req.body;
      
      if (!text) {
        return res.status(400).json({ error: 'Text is required for replies' });
      }

      const replies = await aiService.generateSmartReplies(text, count);
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
}

module.exports = new AIController();

