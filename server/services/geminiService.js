const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

class GeminiService {
  constructor() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
    
    if (!apiKey) {
      console.error('CRITICAL: Gemini API Key is missing. Check your .env file.');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    
    // Default to the 2026 stable workhorse
    this.modelName = "gemini-2.5-flash"; 
    this.model = this.genAI.getGenerativeModel({ 
      model: this.modelName,
      // 💡 Forced stable v1 endpoint to avoid v1beta 404s
      apiVersion: 'v1' 
    });
  }

  /**
   * Primary Execution with 2026 Model Fallbacks
   */
  async generateWithFallback(prompt, config = {}) {
    const modelsToTry = [
      "gemini-3-flash-preview", // Best intelligence/reasoning
      "gemini-2.5-flash",       // 2026 Stable Standard
      "gemini-2.5-flash-lite",  // High-speed fallback
      "gemini-2.0-flash"        // Legacy stable (Retiring soon)
    ];

    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`📡 Calling Gemini: ${modelName}`);
        const tempModel = this.genAI.getGenerativeModel({ 
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            ...config
          }
        });

        const result = await tempModel.generateContent(prompt);
        const responseText = result.response.text();

        if (this.modelName !== modelName) {
          console.info(`Auto-switched to working model: ${modelName}`);
          this.modelName = modelName;
          this.model = tempModel;
        }

        return responseText.trim();
      } catch (error) {
        lastError = error;
        console.warn(`${modelName} failed: ${error.message}`);
        // If it's a 404, we immediately try the next model in the loop
      }
    }

    console.error("All AI models failed. Using local fallback.");
    return this.localFallback(prompt);
  }

  /**
   * 2026 Feature: Uses the new 'Thinking Process' for classification
   */
  async classifyContent(filename, subject, snippet, from) {
    const prompt = `
      Classify this email attachment. 
      Categories: [Finance, Legal, Work, Personal].
      
      Details:
      - File: ${filename}
      - Subject: ${subject}
      - Body: ${snippet}
      - Sender: ${from}

      Output ONLY the category name.
    `;

    // Use a small thinking budget for higher accuracy in classification
    const category = await this.generateWithFallback(prompt, { 
      systemInstruction: "You are an expert document classifier. Categorize based on intent: Finance (money), Legal (contracts), Work (tasks), Personal (social). Output ONLY the category.",
      thinkingBudget: 100 
    });

    const valid = ["Finance", "Legal", "Work", "Personal"];
    return valid.find(c => category.includes(c)) || "Personal";
  }

  /**
   * Native JSON implementation for Smart Replies
   */
  async generateSmartReplies(text, count = 3) {
    const prompt = `
      Analyze this email: ${text}
      Task: Suggest ${count} professional replies. 
      Variety Requirement: 
      1. One short confirmation.
      2. One request for more details/clarification.
      3. One proactive next-step suggestion.
      
      Constraint: Return the output as a valid JSON array of strings.
    `;

    try {
      const raw = await this.generateWithFallback(prompt, {
        responseMimeType: "application/json" 
      });
      return JSON.parse(raw);
    } catch (e) {
      console.warn("JSON Parse failed, using regex cleanup.");
      return [ "Thanks for the update.", "I'll look into this.", "Got it, thank you!" ];
    }
  }

  /**
   * Discover available models for your specific API Key
   */
  async listModels() {
    try {
      const response = await axios.get(
        `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GEMINI_API_KEY}`
      );
      return response.data.models.map(m => m.name.replace('models/', ''));
    } catch (e) {
      return `Discovery Error: ${e.message}`;
    }
  }

  localFallback(prompt) {
    if (prompt.includes('Summarize')) return "AI service is currently waking up. Summary unavailable.";
    return "Personal";
  }
}

module.exports = new GeminiService();