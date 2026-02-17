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
        prompt = `Extract invoice details from this text. Return JSON: { amount: number, currency: string, due_date: string, vendor: string, invoice_link: string }. Text: ${input.substring(0, 3000)}`;
    } else if (context.intent === 'MEETING') {
        prompt = `Extract meeting details. Return JSON: { title: string, date: string, time: string, platform: string, meeting_link: string, participants: string, agenda: string }. Text: ${input.substring(0, 3000)}`;
    } else if (context.intent === 'CONTRACT') {
        prompt = `Extract contract details. Return JSON: { document_type: string, parties: string, effective_date: string, expiration_date: string, key_terms: string[] }. Text: ${input.substring(0, 3000)}`;
    } else if (context.intent === 'INFO') {
        prompt = `Extract key information points. Return JSON: { title: string, key_points: string[], category: string, reading_time_minutes: number }. Text: ${input.substring(0, 3000)}`;
    } else {
        return {}; 
    }

    try {
        const raw = await geminiService.generateWithFallback(prompt, { responseMimeType: "application/json", tier: context.tier });
        return JSON.parse(geminiService._cleanJson(raw));
    } catch (e) {
        this.log(`Extraction failed: ${e.message}`);
        return {};
    }
  }
}

module.exports = new ExtractionAgent();
