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
      general: "meta-llama/Meta-Llama-3.1-8B-Instruct", // Fixed ID
      logic: "Qwen/Qwen2.5-7B-Instruct",
      summary: "facebook/bart-large-cnn", // More stable specialized summary model
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
   * Extract Action Items (Provider Parity with Gemini)
   */
  async extractActionItems(text, userName = 'the user') {
    const prompt = `Extract action items from this email for ${userName}.

Email:
${text}

Return a JSON object with this exact structure:
{
  "tasks": [
    {
      "task": "Brief description",
      "priority": "High|Medium|Low",
      "due_date": "YYYY-MM-DD or null"
    }
  ],
  "confidence": 0.0-1.0
}

Rules:
- Only extract explicit tasks/action items
- Infer priority from urgency words (ASAP=High, soon=Medium, etc.)
- Extract dates if mentioned, otherwise null
- Return empty array if no tasks found
- Confidence based on clarity of tasks`;

    try {
      const response = await this.askAI(
        [
          { role: 'system', content: 'You are a task extraction assistant. Always respond with valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        {
          model: this.models.logic,
          max_tokens: 800,
          temperature: 0.3,
          response_format: { type: 'json_object' }
        }
      );

      const parsed = JSON.parse(response);
      
      // Validate structure
      if (!parsed.tasks || !Array.isArray(parsed.tasks)) {
        return { tasks: [], confidence: 0 };
      }

      // Ensure confidence is present
      const confidence = parsed.confidence || 0.7;

      console.log(`✅ HuggingFace extracted ${parsed.tasks.length} tasks (confidence: ${confidence})`);
      
      return {
        tasks: parsed.tasks,
        confidence: confidence
      };
    } catch (error) {
      console.error('HuggingFace extractActionItems error:', error.message);
      return { tasks: [], confidence: 0 };
    }
  }
}

module.exports = new HuggingFaceService();
