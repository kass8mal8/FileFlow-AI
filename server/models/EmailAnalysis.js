const mongoose = require('mongoose');

const EmailAnalysisSchema = new mongoose.Schema({
  emailId: {
    type: String,
    required: true,
    index: true,
    description: "Gmail message ID or file hash"
  },
  userId: {
    type: String,
    required: true,
    index: true,
    description: "User's email address"
  },
  
  // AI Generated Content
  summary: {
    text: { type: String },
    confidence: { type: Number, min: 0, max: 1 }
  },
  
  replies: [{
    type: String
  }],
  
  actionItems: [{
    task: { type: String, required: true },
    priority: { 
      type: String, 
      enum: ['High', 'Medium', 'Low'],
      default: 'Medium'
    },
    due_date: { type: String }
  }],
  
  intent: {
    type: { 
      type: String, 
      enum: ['INVOICE', 'MEETING', 'CONTRACT', 'INFO'],
      default: 'INFO'
    },
    confidence: { type: Number, min: 0, max: 1 },
    details: { type: mongoose.Schema.Types.Mixed }
  },
  
  // Metadata
  analyzedAt: {
    type: Date,
    default: Date.now
  },
  lastAccessed: {
    type: Date,
    default: Date.now
  },
  accessCount: {
    type: Number,
    default: 1
  }
}, {
  timestamps: true
});

// Compound index for fast user-specific lookups
EmailAnalysisSchema.index({ userId: 1, emailId: 1 }, { unique: true });

// Index for analytics queries
EmailAnalysisSchema.index({ analyzedAt: -1 });

module.exports = mongoose.model('EmailAnalysis', EmailAnalysisSchema);
