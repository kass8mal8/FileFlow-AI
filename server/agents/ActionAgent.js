const BaseAgent = require('./BaseAgent');
const geminiService = require('../services/geminiService');
const huggingFaceService = require('../services/huggingFaceService');

class ActionAgent extends BaseAgent {
  constructor() {
    super('ActionAgent');
  }

  async execute(input, context = {}) {
    this.log(`Determining next actions for intent: ${context.intent} (Tier: ${context.tier || 'free'})`);
    const limit = context.tier === 'pro' ? 3 : 2;
    
    // For specific intents, provide structured "Sentient" actions
    if (context.intent === 'INVOICE') {
        return [
            { 
                id: 'pay_mpesa', 
                label: 'Pay via M-Pesa', 
                type: 'payment', 
                priority: 'high',
                payload: context.data 
            },
            { 
                id: 'view_details', 
                label: 'Extract Data', 
                type: 'view', 
                priority: 'medium' 
            }
        ];
    }

    if (context.intent === 'MEETING') {
        return [
            { 
                id: 'add_calendar', 
                label: 'Add to Calendar', 
                type: 'calendar', 
                priority: 'high',
                payload: context.data 
            },
            { 
                id: 'summarize', 
                label: 'Get Briefing', 
                type: 'action', 
                priority: 'medium' 
            }
        ];
    }

    // Default: Delegate to LLM for Smart Replies/Suggested Responses
    try {
        const prompt = `
          Context: User received a ${context.intent || 'Message'}.
          Summary: ${context.summary || 'N/A'}
          Extracted Data: ${JSON.stringify(context.data || {})}
          
          Suggest exactly ${limit} quick one-tap actions or replies the user can take.
          Return a JSON array of objects with fields: { id, label, type: 'reply'|'action', priority: 'high'|'medium'|'low' }
        `;
        
        const response = await geminiService.generateWithFallback(prompt, { tier: context.tier });
        // Attempt to parse if string, or return as is if service already parsed
        const cleaned = typeof response === 'string' ? geminiService._cleanJson(response) : response;
        return typeof cleaned === 'string' ? JSON.parse(cleaned) : cleaned;
    } catch (e) {
        this.log(`LLM Suggestion failed: ${e.message}`);
        return [
            { id: 'reply_ok', label: 'Acknowledged', type: 'reply', priority: 'medium' },
            { id: 'view_more', label: 'View Details', type: 'view', priority: 'low' }
        ];
    }
  }
}

module.exports = new ActionAgent();
