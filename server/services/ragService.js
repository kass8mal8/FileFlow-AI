const fs = require('fs');
const pdf = require('pdf-parse');
const geminiService = require('./geminiService');
require('dotenv').config();

class RAGService {
  
  /**
   * Extracts text from a file based on its path and type.
   * @param {string} filePath - Absolute path to the file.
   * @param {string} mimeType - Mime type (application/pdf, text/plain, etc.)
   */
  async extractText(filePath, mimeType) {
    try {
      if (mimeType === 'application/pdf') {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        return data.text;
      } else if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType.includes('plain')) {
        return fs.readFileSync(filePath, 'utf8');
      } else {
        // Fallback for others - inspect header or just try reading as text
        console.warn(`Attempting to read unsupported type ${mimeType} as text`);
        return fs.readFileSync(filePath, 'utf8');
      }
    } catch (error) {
      console.error('Text extraction failed:', error);
      return " [Error extracting text from file] ";
    }
  }

  /**
   * Generates a response from Gemini based on the document context.
   * @param {string} query - User's question.
   * @param {string} context - content of the document(s).
   */
  async chatWithDocument(query, context) {
    try {
      const prompt = `
You are FileFlow AI, a helpful assistant.
Answer the user's question based ONLY on the following document content.
If the answer is not in the document, say "I couldn't find that information in the document."

DOCUMENT CONTENT:
${context.substring(0, 50000)}

USER QUESTION:
${query}
`;
      // Use the robust service with fallbacks
      return await geminiService.generateWithFallback(prompt);
    } catch (error) {
      console.error('Gemini chat failed in RAG service:', error.message, error.stack);
      // Return a friendly error instead of crashing
      return "I'm having trouble analyzing this document right now. Please try again in a moment.";
    }
  }
}

module.exports = new RAGService();
