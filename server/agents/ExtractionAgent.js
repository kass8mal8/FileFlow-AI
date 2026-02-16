const BaseAgent = require('./BaseAgent');
const geminiService = require('../services/geminiService');

class ExtractionAgent extends BaseAgent {
  constructor() {
    super('ExtractionAgent');
  }

  async execute(input, context = {}) {
    this.log(`Extracting structured data (Intent: ${context.intent})...`);

    // Use Gemini Pro (via generateWithFallback logic in service) for high precision
    // We construct a specific prompt based on the intent
    let prompt = "";
    
    if (context.intent === 'INVOICE') {
        prompt = `Extract invoice details from this text. Return JSON: { amount: number, currency: string, due_date: string, paybill: string, account: string }. Text: ${input.substring(0, 3000)}`;
    } else if (context.intent === 'MEETING') {
        prompt = `Extract meeting details. Return JSON: { date: string, time: string, platform: string, link: string }. Text: ${input.substring(0, 3000)}`;
    } else {
        return {}; 
    }

    try {
        const raw = await geminiService.generateWithFallback(prompt, { responseMimeType: "application/json" });
        return JSON.parse(raw);
    } catch (e) {
        this.log(`Extraction failed: ${e.message}`);
        return {};
    }
  }
}

module.exports = new ExtractionAgent();
