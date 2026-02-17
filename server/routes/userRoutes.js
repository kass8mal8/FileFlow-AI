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
  try {
    const { email, name, googleId, picture } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await userService.getUserByEmail(email, {
      name,
      googleId,
      picture,
    });

    // Return a minimal public representation
    res.json({
      email: user.email,
      name: user.name,
      subscription: user.subscription,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Error syncing user profile:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
