const express = require('express');
const router = express.Router();
const userService = require('../services/userService');

// Get User Status (Subscription & Usage)
router.get('/status', async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const subscription = await userService.getSubscriptionInfo(email);
    res.json(subscription);
  } catch (error) {
    console.error('Error fetching user status:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Sync user profile on authentication
router.post('/sync', async (req, res) => {
  // ... existing code ...
});

// Cancel Subscription
router.post('/cancel-subscription', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    await userService.updateSubscription(email, 'FREE', 'active');
    res.json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
