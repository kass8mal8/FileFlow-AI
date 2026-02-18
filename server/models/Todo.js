const mongoose = require('mongoose');

const TodoSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true
  },
  text: {
    type: String,
    required: true,
    trim: true
  },
  sourceId: {
    type: String,
    required: true,
    index: true
  },
  sourceTitle: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Composite index to ensure we don't duplicate the same task from the same email
TodoSchema.index({ userEmail: 1, sourceId: 1, text: 1 }, { unique: true });

module.exports = mongoose.model('Todo', TodoSchema);
