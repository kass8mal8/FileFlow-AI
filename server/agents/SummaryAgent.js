const BaseAgent = require('./BaseAgent');
const geminiService = require('../services/geminiService');
const huggingFaceService = require('../services/huggingFaceService');

class SummaryAgent extends BaseAgent {
  constructor() {
    super('SummaryAgent');
  }

  async execute(input, context = {}) {
    this.log(`Generating summary...`);

    // Step 1: Try Specialized Summarization with Bart-Large (via Hugging Face)
    try {
        const summary = await huggingFaceService.generateSummary(input);
        if (summary && !summary.includes("unavailable")) {
            this.log(`Generated summary via Hugging Face.`);
            return summary;
        }
    } catch (e) {
        this.log(`Hugging Face summary failed: ${e.message}`);
    }

    // Step 2: Fallback to Gemini
    this.log(`Falling back to Gemini for summary. Tier: ${context.tier || 'free'}`);
    return await geminiService.generateSummary(input);
  }
}

module.exports = new SummaryAgent();
