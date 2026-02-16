const AIFeedback = require('../models/AIFeedback');

class FeedbackController {
  /**
   * Submit AI feedback (thumbs up/down)
   */
  async submitFeedback(req, res) {
    try {
      const { userId, emailId, feedbackType, rating, content, modelUsed, confidence } = req.body;

      if (!userId || !emailId || !feedbackType || !rating) {
        return res.status(400).json({ 
          error: 'userId, emailId, feedbackType, and rating are required' 
        });
      }

      // Upsert: update if exists, create if not
      const feedback = await AIFeedback.findOneAndUpdate(
        { userId, emailId, feedbackType },
        {
          rating,
          content,
          modelUsed,
          confidence,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );

      console.log(`📊 Feedback recorded: ${feedbackType} - ${rating} by ${userId}`);

      res.json({ 
        success: true, 
        message: 'Feedback recorded',
        feedbackId: feedback._id
      });
    } catch (error) {
      console.error('Feedback submission error:', error);
      res.status(500).json({ error: 'Failed to record feedback' });
    }
  }

  /**
   * Get feedback analytics (optional - for admin dashboard)
   */
  async getAnalytics(req, res) {
    try {
      const { feedbackType } = req.query;

      const match = feedbackType ? { feedbackType } : {};

      const stats = await AIFeedback.aggregate([
        { $match: match },
        {
          $group: {
            _id: { type: '$feedbackType', rating: '$rating' },
            count: { $sum: 1 },
            avgConfidence: { $avg: '$confidence' }
          }
        }
      ]);

      res.json({ stats });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
}

module.exports = new FeedbackController();
