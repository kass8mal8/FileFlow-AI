const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

/**
 * FileFlow AI - Hugging Face Service (2026 Robust Version)
 * Fixes "model_not_supported" by targeting specific providers and handling fallbacks.
 */
class HuggingFaceService {
  constructor() {
    this.apiKey = process.env.HUGGINGFACE_API_KEY || "";

    // Standard Inference API endpoint (OpenAI Compatible)
    this.baseUrl = "https://router.huggingface.co/hf-inference/models";

    // Most stable 2026 Model IDs for Kenyan Infrastructure
    this.models = {
      general: "meta-llama/Llama-3.1-8B-Instruct", // Highest availability in 2026
      logic: "Qwen/Qwen2.5-7B-Instruct",
      summary: "mistralai/Mistral-Nemo-Instruct-2407",
    };
  }

  /**
   * Primary Request Handler with Auto-Fallback
   */
  async askAI(messages, options = {}) {
    if (!this.apiKey) throw new Error("HUGGINGFACE_API_KEY is missing.");

    const model = options.model || this.models.general;
    // Construct URL: https://router.huggingface.co/hf-inference/models/{model}/v1/chat/completions
    const url = `${this.baseUrl}/${model}/v1/chat/completions`;

    try {
      console.log(`📡 Querying: ${model} via HF Router`);

      const response = await axios.post(
        url,
        {
          model: model,
          messages: messages,
          max_tokens: options.max_tokens || 500,
          temperature: options.temperature || 0.7,
          response_format: options.response_format || { type: "text" },
        },
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          timeout: 45000, // Extended for international routing
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || "";

      // Final Fallback: Swap to the ultra-stable Llama 3.1
      if (!options.isFinalFallback && model !== this.models.general) {
        console.warn(
          `🚨 Critical failure. Falling back to stable anchor: Llama 3.1`
        );
        return this.askAI(messages, {
          ...options,
          model: this.models.general,
          isFinalFallback: true,
        });
      }

      throw error;
    }
  }

  async classifyContent(filename, subject, snippet, from) {
    const messages = [
      {
        role: "system",
        content:
          "Categorize document into exactly one word: Finance, Legal, Work, Personal.",
      },
      {
        role: "user",
        content: `File: ${filename}, Subject: ${subject}, Text: ${snippet}`,
      },
    ];
    // Classification is best on Serverless HF-Inference
    return await this.askAI(messages, {
      useServerless: true,
      temperature: 0.1,
    });
  }

  async generateSummary(text) {
    const messages = [
      {
        role: "system",
        content:
          "Summarize in 2 sentences. Start with the 'Bottom Line Up Front'.",
      },
      { role: "user", content: text.substring(0, 4000) },
    ];
    return await this.askAI(messages, { model: this.models.summary });
  }

  async generateSmartReplies(text, count = 3) {
    const messages = [
      {
        role: "system",
        content: `Output a JSON array of ${count} professional replies.`,
      },
      { role: "user", content: `Email context: ${text.substring(0, 2000)}` },
    ];

    try {
      const response = await this.askAI(messages, {
        model: this.models.general,
        response_format: { type: "json_object" },
      });
      const parsed = JSON.parse(response);
      return Array.isArray(parsed)
        ? parsed
        : parsed.replies || Object.values(parsed)[0];
    } catch (e) {
      return ["Understood.", "I'll check this.", "Thanks for the email."];
    }
  }

  /**
   * Extract Action Items (Fallback Implementation)
   */
  async extractActionItems(text, userName = 'the user') {
    const messages = [
      {
        role: "system",
        content: `Extract action items for ${userName} into a JSON array: [{ "task": string, "priority": "High"|"Medium"|"Low" }]. Return ONLY JSON.`,
      },
      { role: "user", content: text.substring(0, 4000) },
    ];

    try {
      const response = await this.askAI(messages, { model: this.models.logic, response_format: { type: "json_object" } });
      const tasks = JSON.parse(response);
      const confidence = Array.isArray(tasks) && tasks.length > 0 ? 0.75 : 0.55;
      return { tasks, confidence };
    } catch (e) {
      return { tasks: [], confidence: 0.25 };
    }
  }
}

module.exports = new HuggingFaceService();
