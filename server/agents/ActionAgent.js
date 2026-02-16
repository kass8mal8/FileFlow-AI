const BaseAgent = require('./BaseAgent');
const geminiService = require('../services/geminiService');
const huggingFaceService = require('../services/huggingFaceService');

class ActionAgent extends BaseAgent {
  constructor() {
    super('ActionAgent');
  }

  async execute(input, context = {}) {
    this.log(`Determining next actions...`);
    
    // If it's an email/message, we want Smart Replies using Qwen/Llama (HF)
    if (context.intent === 'INFO' || context.intent === 'PERSONAL' || !context.intent) {
        this.log(`Delegating to Qwen/Llama for Smart Replies...`);
        return await huggingFaceService.generateSmartReplies(input, 3);
    }

    // For other intents (Invoice, etc.), use Gemini to plan
    const prompt = `
      Context: User received a ${context.intent} document.
      Summary: ${context.summary || 'N/A'}
      Extracted Data: ${JSON.stringify(context.data || {})}
      
      Suggest 3 immediate actions the user can take in the app.
      Return JSON array of strings.
    `;

    return await geminiService.generateSmartReplies(prompt, 3);
  }
}

module.exports = new ActionAgent();
