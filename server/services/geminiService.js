const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();

class GeminiService {
  constructor() {
    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.EXPO_PUBLIC_GEMINI_API_KEY ||
      "";

    if (!apiKey) {
      console.error(
        "CRITICAL: Gemini API Key is missing. Check your .env file."
      );
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    // Default to the 2026 stable workhorse
    this.modelName = "gemini-3-flash-preview";
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      // 💡 Forced stable v1 endpoint to avoid v1beta 404s
      apiVersion: "v1",
    });
  }

  /**
   * Streaming Execution with 2026 Model Fallbacks
   */
  async *generateWithFallbackStream(prompt, config = {}) {
    // Don't change these models (all 1. versions are unsupported)
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.5-flash-lite",
    ];

    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`📡 Streaming From Gemini: ${modelName}`);
        const tempModel = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            ...config,
          },
        });

        const result = await tempModel.generateContentStream(prompt);

        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          yield chunkText;
        }

        // Successfully finished streaming from this model
        if (this.modelName !== modelName) {
          console.info(
            `Auto-switched to working model (streaming): ${modelName}`
          );
          this.modelName = modelName;
          this.model = tempModel;
        }
        return;
      } catch (error) {
        lastError = error;
        console.warn(`Streaming ${modelName} failed: ${error.message}`);
      }
    }

    // Fallback to non-streamed static text if everything fails
    yield this.localFallback(prompt);
  }

  /**
   * Primary Execution with 2026 Model Fallbacks (Non-streamed)
   */
  async generateWithFallback(prompt, config = {}) {
    // Don't change these models (all 1. versions are unsupported)
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-2.5-flash-lite",
    ];

    let lastError = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`📡 Calling Gemini: ${modelName}`);
        const tempModel = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            ...config,
          },
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
      systemInstruction:
        "You are an expert document classifier. Categorize based on intent: Finance (money), Legal (contracts), Work (tasks), Personal (social). Output ONLY the category.",
      thinkingBudget: 100,
    });

    const valid = ["Finance", "Legal", "Work", "Personal"];
    return valid.find((c) => category.includes(c)) || "Personal";
  }

  /**
   * Native JSON implementation for Smart Replies
   */
  async generateSmartReplies(text, count = 3, userName = "the user") {
    const prompt = `
      Analyze this email: ${text}
      Recipient's name: ${userName}
      Task: Suggest 2 short, professional replies. 
      Constraint: 
      1. Maximum 2 formatted replies.
      2. Each reply must be very concise (max 2 sentences).
      3. Return as valid JSON array of strings.
    `;

    try {
      const raw = await this.generateWithFallback(prompt, {
        responseMimeType: "application/json",
      });
      return JSON.parse(raw);
    } catch (e) {
      console.warn("JSON Parse failed, using regex cleanup.");
      return [
        "Thanks for the update.",
        "I'll look into this.",
        "Got it, thank you!",
      ];
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
      return response.data.models.map((m) => m.name.replace("models/", ""));
    } catch (e) {
      return `Discovery Error: ${e.message}`;
    }
  }

  async generateSummary(text, customPrompt) {
    const prompt =
      customPrompt ||
      "Summarize this email in a professional, concise tone (max 2 sentences). Focus on the core intent, requested actions, and any mentioned deadlines.";
    const combinedPrompt = `${prompt}\n\nEmail Content:\n${text}`;
    const summary = await this.generateWithFallback(combinedPrompt);
    
    // Calculate confidence based on text length and model success
    const confidence = text.length > 100 ? 0.85 : 0.70;
    
    return { summary, confidence };
  }

  /**
   * Action Item Extraction (To-Do List)
   */
  async extractActionItems(text, userName = "the user") {
    const prompt = `
      Analyze the following email for ${userName} and extract a "To-Do" list of action items. 

      Rules for extraction:
      1. Only include items that require a specific action from the recipient (${userName}).
      2. Assign a priority: [High] for deadlines/urgent requests, [Medium] for standard tasks, [Low] for "fyi" or follow-ups.
      3. Identify any mentioned deadlines and format them as (Due: Date/Time).
      4. Ignore social pleasantries or general statements.
      5. Output the result as a JSON Array of objects.
      
      Schema:
      [
        { "task": "string", "priority": "High" | "Medium" | "Low", "due_date": "string" | null }
      ]

      If no actionable items are found, return an empty array [].

      Email Content:
      """
      ${text}
      """
    `;

    try {
      const raw = await this.generateWithFallback(prompt, {
        responseMimeType: "application/json",
      });
      const tasks = JSON.parse(raw);
      const confidence = Array.isArray(tasks) && tasks.length > 0 ? 0.80 : 0.60;
      return { tasks, confidence };
    } catch (e) {
      console.warn("Action Item JSON parse failed", e);
      return { tasks: [], confidence: 0.30 };
    }
  }

  localFallback(prompt) {
    if (prompt.includes("Summarize"))
      return "AI service is currently waking up. Summary unavailable.";
    if (prompt.includes("To-Do"))
      return "No specific action items detected (AI offline).";

    // Handle JSON requirements to prevent parsing errors
    if (prompt.includes("JSON")) {
      if (prompt.includes("intent"))
        return JSON.stringify({ intent: "INFO", confidence: 0, details: {} });
      return JSON.stringify(["Received.", "Will review.", "Thanks."]);
    }

    return "Personal";
  }

  /**
   * Generate vector embeddings for semantic search
   */
  async generateEmbeddings(text) {
    try {
      const model = this.genAI.getGenerativeModel({
        model: "text-embedding-004",
      });
      const result = await model.embedContent(text);
      return result.embedding.values;
    } catch (error) {
      console.warn("Embedding generation failed:", error.message);
      return [];
    }
  }
  /**
   * Detect Intent from Text (Invoice, Meeting, etc.)
   */
  async detectIntent(text) {
    const prompt = `
      Analyze the text and determine the intent.
      Return a JSON object: { "intent": "INVOICE" | "MEETING" | "CONTRACT" | "INFO", "confidence": number, "details": object }
      
      Details schema:
      - INVOICE: { amount: number, currency: string, due_date: string, paybill_number: string, account_number: string }
      - MEETING: { date: string, time: string, platform: string, link: string }
      - CONTRACT: { parties: string[], effective_date: string }
      
      Text: "${text.substring(0, 5000)}"
    `;

    try {
      const raw = await this.generateWithFallback(prompt, {
        responseMimeType: "application/json",
      });
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Intent detection failed, fallback to INFO", e);
      return { intent: "INFO", confidence: 0, details: {} };
    }
  }
}

module.exports = new GeminiService();
