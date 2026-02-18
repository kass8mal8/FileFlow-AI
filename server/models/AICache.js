const mongoose = require('mongoose');

const AICacheSchema = new mongoose.Schema({
  resourceId: {
    type: String, 
    required: true, 
    index: true,
    description: "Unique ID of the email or file (e.g. Gmail ID or File Hash)"
  },
  params: {
    type: String,
    description: "JSON string of parameters (e.g. { count: 3, prompt: '...' }) to differentiate requests"
  },
  type: {
    type: String,
    required: true,
    enum: ['SUMMARY', 'REPLIES', 'TODO', 'INTENT', 'CLASSIFICATION', 'CHAT', 'USER_REPLY'],
    index: true
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    description: "The AI generated output (String, Array, or Object)"
  },
  modelUsed: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 604800 // Auto-delete after 7 days (TTL index)
  }
});

// Compound index for fast lookups
AICacheSchema.index({ resourceId: 1, type: 1, params: 1 });

module.exports = mongoose.model('AICache', AICacheSchema);
