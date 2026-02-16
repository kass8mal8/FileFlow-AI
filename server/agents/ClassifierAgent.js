const BaseAgent = require('./BaseAgent');
const geminiService = require('../services/geminiService');
const huggingFaceService = require('../services/huggingFaceService');

class ClassifierAgent extends BaseAgent {
  constructor() {
    super('ClassifierAgent');
  }

  async execute(input, context = {}) {
    this.log(`Analyzing content for intent...`);
    
    // Step 1: Try Fast Classification with Mistral (via Hugging Face)
    try {
      const hfResult = await huggingFaceService.classifyContent(
        context.filename || 'unknown',
        context.subject || 'unknown',
        input.substring(0, 1000), // snippet
        context.from || 'unknown'
      );
      
      this.log(`Mistral Classification: ${hfResult}`);
      
      // If HF gives a solid result, use it.
      if (hfResult !== 'Personal') {
          return { intent: hfResult.toUpperCase(), confidence: 0.8, source: 'Mistral' };
      }
    } catch (e) {
      this.log(`Mistral failed: ${e.message}`);
    }

    // Step 2: Fallback/Verify with Gemini Flash (The Manager)
    this.log(`Falling back to Gemini Flash...`);
    const geminiResult = await geminiService.detectIntent(input);
    return { ...geminiResult, source: 'Gemini' };
  }
}

module.exports = new ClassifierAgent();
