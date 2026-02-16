const mongoose = require('mongoose');

/**
 * AIFeedback Model
 * Stores user feedback (thumbs up/down) on AI-generated content
 * for future fine-tuning and quality improvement
 */
const AIFeedbackSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
    description: "User's email address"
  },
  emailId: {
    type: String,
    required: true,
    index: true,
    description: "Gmail message ID or resource ID"
  },
  feedbackType: {
    type: String,
    required: true,
    enum: ['SUMMARY', 'REPLIES', 'TODO', 'INTENT'],
    index: true,
    description: "Which AI feature the feedback is for"
  },
  rating: {
    type: String,
    required: true,
    enum: ['positive', 'negative'],
    description: "Thumbs up or thumbs down"
  },
  // Store the AI output that was rated
  content: {
    type: mongoose.Schema.Types.Mixed,
    description: "The AI-generated content that was rated"
  },
  // Optional: Store the original input for retraining
  inputText: {
    type: String,
    description: "Original email text (for retraining purposes)"
  },
  modelUsed: {
    type: String,
    description: "Which AI model generated this (Gemini/HuggingFace)"
  },
  confidence: {
    type: Number,
    description: "AI's confidence score when this was generated"
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound index for analytics
AIFeedbackSchema.index({ feedbackType: 1, rating: 1, createdAt: -1 });

// Prevent duplicate feedback for same content
AIFeedbackSchema.index({ userId: 1, emailId: 1, feedbackType: 1 }, { unique: true });

module.exports = mongoose.model('AIFeedback', AIFeedbackSchema);
