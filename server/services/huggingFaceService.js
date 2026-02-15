const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || process.env.EXPO_PUBLIC_HF_API_KEY || '';
    this.baseUrl = "https://router.huggingface.co/models";
    
    this.models = [
      "mistralai/Mistral-Small-Instruct-2409",
      "mistralai/Mistral-Nemo-Instruct-2407",
      "Qwen/Qwen2.5-7B-Instruct",
      "microsoft/Phi-3.5-mini-instruct"
    ];
  }

  /**
   * Universal AI Request Handler using REST
   */
  async askAI(prompt, systemMessage = "You are a helpful assistant.") {
    if (!this.apiKey) {
      throw new Error("HUGGINGFACE_API_KEY is missing in backend .env");
    }

    let lastError = null;

    for (const model of this.models) {
      try {
        console.log(`📡 Querying HF REST Provider: ${model}`);
        const response = await axios.post(`${this.baseUrl}/${model}/v1/chat/completions`, {
          model: model,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt }
          ],
          max_tokens: 500,
          temperature: 0.7,
        }, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
            "x-wait-for-model": "true"
          },
          timeout: 40000,
        });

        return response.data.choices[0].message.content.trim();
      } catch (error) {
        lastError = error;
        const msg = error.response?.data?.error || error.message;
        console.warn(`Model ${model} failed: ${JSON.stringify(msg)}`);
      }
    }

    throw lastError || new Error("All HF models failed.");
  }

  /**
   * Optimized Classification
   */
  async classifyContent(filename, subject, snippet, from) {
    const prompt = `Classify this email attachment. 
    Subject: ${subject}
    File: ${filename}
    Body: ${snippet}
    From: ${from}
    
    Valid Categories: [Finance, Legal, Work, Personal].
    Output exactly one word. Use Finance for money/invoices, Legal for contracts/law, Work for tasks/projects, and Personal for everything else.`;

    try {
      const response = await this.askAI(prompt, "You are an expert document classifier. Be precise.");
      const valid = ["Finance", "Legal", "Work", "Personal"];
      return valid.find(v => response.includes(v)) || "Personal";
    } catch (e) {
      return "Personal";
    }
  }

  /**
   * Concise Summary
   */
  async generateSummary(text) {
    const cleanText = text.replace(/<[^>]*>?/gm, ' ').substring(0, 4000);
    const prompt = `Act as a high-level executive assistant. Analyze this email and provide a "Bottom Line Up Front" (BLUF) summary in 2 sentences. 
    1. First sentence: Clear statement of the core purpose/intent.
    2. Second sentence: Specific names, dates, or amounts involved and the required next step.
    
    Email: ${cleanText}`;
    try {
      return await this.askAI(prompt, "You are a strategic executive assistant who values time and precision.");
    } catch (e) {
      return "Summary unavailable. Please review the email manually.";
    }
  }

  /**
   * Smart Replies
   */
  async generateSmartReplies(text, count = 3, userName = 'the user') {
    const cleanText = text.replace(/<[^>]*>?/gm, ' ').substring(0, 3000);
    const prompt = `Analyze the tone and intent of this email. Suggest ${count} distinct, professional one-sentence replies.
    Personalization: The recipient is ${userName}.
    Include one "Confirmation/Acceptance" reply, one "Review/Information Request" reply, and one "Scheduling/Follow-up" reply.
    Avoid generic 'Acknowledged'. Be specific to the email content.
    Format: A simple list with no numbers, just the reply text on new lines.
    
    Email: ${cleanText}`;

    try {
      const response = await this.askAI(prompt, "You are a professional communicator.");
      return response.split('\n')
        .map(s => s.replace(/^\d+\.\s*/, '').trim())
        .filter(s => s.length > 5)
        .slice(0, count);
    } catch (e) {
      return ["Thanks for reaching out!", "Acknowledged.", "Will get back to you."];
    }
  }

  /**
   * Action Item Extraction (To-Do List)
   */
  async extractActionItems(text, userName = 'the user') {
    const cleanText = text.replace(/<[^>]*>?/gm, ' ').substring(0, 4000);
    const prompt = `
      Analyze the following email for ${userName} and extract a "To-Do" list of action items. 

      Rules for extraction:
      1. Only include items that require a specific action from the recipient (${userName}).
      2. Assign a priority: [High] for deadlines/urgent requests, [Medium] for standard tasks, [Low] for "fyi" or follow-ups.
      3. Identify any mentioned deadlines and format them as (Due: Date/Time).
      4. Ignore social pleasantries or general statements.
      5. Output the result as a clean Markdown checklist.

      If no actionable items are found, reply with: "No specific action items detected."

      Email Content:
      """
      ${cleanText}
      """
    `;

    try {
      return await this.askAI(prompt, "You are an efficient project manager assistant.");
    } catch (e) {
      return "No specific action items detected.";
    }
  }
}

module.exports = new HuggingFaceService();