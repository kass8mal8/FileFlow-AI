const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    trim: true
  },
  googleId: {
    type: String,
    index: true,
  },
  picture: {
    type: String,
  },
  
  // Subscription Management
  subscription: {
    tier: { 
      type: String, 
      enum: ['FREE', 'TRIAL', 'PRO'], 
      default: 'FREE' 
    },
    status: { 
      type: String, 
      enum: ['active', 'expired', 'cancelled'], 
      default: 'active' 
    },
    trialEndsAt: { type: Date },
    proStartedAt: { type: Date }
  },
  
  // Usage Tracking (Daily Limits)
  usage: {
    summaries: {
      count: { type: Number, default: 0 },
      limit: { type: Number, default: 5 }, // Free tier limit
      resetAt: { type: Date }
    },
    replies: {
      count: { type: Number, default: 0 },
      limit: { type: Number, default: 10 },
      resetAt: { type: Date }
    }
  },
  
  preferences: {
    theme: { type: String, default: 'system' },
    notifications: { type: Boolean, default: true }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp on save
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema);
