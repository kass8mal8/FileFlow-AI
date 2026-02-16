const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || process.env.EXPO_PUBLIC_HF_API_KEY || '';
    this.baseUrl = "https://api-inference.huggingface.co/models";
    
    this.models = [
      "mistralai/Mistral-Nemo-Instruct-2407",
      "Qwen/Qwen2.5-7B-Instruct",
      "microsoft/Phi-3.5-mini-instruct"
    ];
  }

  /**
   * Universal AI Request Handler using Standard HF Inference API
   */
  async askAI(prompt, systemMessage = "You are a helpful assistant.", specificModel = null) {
    if (!this.apiKey) {
      throw new Error("HUGGINGFACE_API_KEY is missing in backend .env");
    }

    let lastError = null;
    const targetModels = specificModel ? [specificModel] : this.models;

    for (const model of targetModels) {
      try {
        console.log(`📡 Querying HF Inference API: ${model}`);
        
        // Construct prompt based on model family to ensure best results
        const formattedPrompt = this.formatPrompt(model, systemMessage, prompt);

        const response = await axios.post(`${this.baseUrl}/${model}`, {
          inputs: formattedPrompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.7,
            return_full_text: false,
            wait_for_model: true
          }
        }, {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json"
          },
          timeout: 40000,
        });

        // HF returns array [{ generated_text: "..." }]
        let output = response.data[0]?.generated_text || "";
        return output.trim();

      } catch (error) {
        lastError = error;
        const msg = error.response?.data?.error || error.message;
        console.warn(`Model ${model} failed: ${JSON.stringify(msg)}`);
      }
    }

    throw lastError || new Error("All HF models failed.");
  }

  /**
   * Helper to format prompts for specific instruction-tuned models
   */
  formatPrompt(model, system, user) {
      if (model.includes("Mistral")) {
          // Mistral format: <s>[INST] System + User [/INST]
          return `<s>[INST] ${system}\n\n${user} [/INST]`;
      } else if (model.includes("Qwen")) {
          // ChatML format
          return `<|im_start|>system\n${system}<|im_end|>\n<|im_start|>user\n${user}<|im_end|>\n<|im_start|>assistant\n`;
      } else if (model.includes("Phi")) {
          // Phi-3 format
          return `<|user|>\n${system}\n\n${user}<|end|>\n<|assistant|>\n`;
      } else if (model.includes("Llama")) {
          // Llama 3 format
          return `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${system}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${user}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n`;
      }
      // Default fallback
      return `${system}\n\nUser: ${user}\n\nAssistant:`;
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
   * Concise Summary using Mistral-Nemo or Phi-3.5 (User Recommended)
   */
  async generateSummary(text) {
    const cleanText = text.replace(/<[^>]*>?/gm, ' ').substring(0, 8000); // 128k context support allows larger chunks
    const prompt = `Act as a high-level executive assistant. Analyze this email and provide a "Bottom Line Up Front" (BLUF) summary in 2 sentences. 
    1. First sentence: Clear statement of the core purpose/intent.
    2. Second sentence: Specific names, dates, or amounts involved and the required next step.
    
    Email: ${cleanText}`;
    
    // Prefer Mistral-Nemo (12B) or Phi-3.5-mini for summarization
    const summaryModels = [
        "mistralai/Mistral-Nemo-Instruct-2407", 
        "microsoft/Phi-3.5-mini-instruct"
    ];

    return await this.askAIWithModelFallback(prompt, "You are a strategic executive assistant.", summaryModels);
  }

  /**
   * Smart Replies using Qwen 2.5 or Llama 3.1 (User Recommended)
   */
  async generateSmartReplies(text, count = 3, userName = 'the user') {
    const cleanText = text.replace(/<[^>]*>?/gm, ' ').substring(0, 3000);
    const prompt = `Analyze the email below. 
    Task: Draft ${count} short, professional replies for ${userName}.
    
    Replies should be:
    1. "Confirmation" (Quick accept)
    2. "Clarification" (Ask for details)
    3. "Proactive" (Suggest next step)
    
    Constraint: Output ONLY the 3 replies in a JSON array format (e.g., ["Reply 1", "Reply 2", "Reply 3"]).
    
    Email: ${cleanText}`;

    // Prefer Qwen 2.5 (7B) or Llama 3.1 (8B) for agentic/instruct tasks
    const replyModels = [
        "Qwen/Qwen2.5-7B-Instruct",
        "meta-llama/Meta-Llama-3.1-8B-Instruct"
    ];

    try {
      const response = await this.askAIWithModelFallback(prompt, "You are a helpful assistant who outputs JSON.", replyModels);
      
      // Parse JSON or cleanup list
      if (response.includes('[')) {
          const jsonStr = response.substring(response.indexOf('['));
          return JSON.parse(jsonStr.replace(/```json/g, '').replace(/```/g, ''));
      } else {
          return response.split('\n').filter(l => l.length > 5).slice(0, count);
      }
    } catch (e) {
      console.warn("HF Reply Generation Failed:", e);
      return ["Received, thanks.", "Can you provide more details?", "I'll review this shortly."];
    }
  }

  /**
   * Helper to try specific models first
   */
  async askAIWithModelFallback(prompt, system, preferredModels) {
      for (const model of preferredModels) {
          try {
              return await this.askAI(prompt, system, model);
          } catch (e) {
              console.warn(`Preferred model ${model} failed, trying next...`);
          }
      }
      // Fallback to general pool
      return await this.askAI(prompt, system);
  }
}

module.exports = new HuggingFaceService();