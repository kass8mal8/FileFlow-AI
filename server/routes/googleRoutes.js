const express = require('express');
const axios = require('axios');
const router = express.Router();

// Changed base to allow constructing full paths
const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1';

// Helper to forward requests
const forwardRequest = async (req, res, method, endpoint, data = null, params = {}) => {
  try {
    const accessToken = req.headers.authorization;
    if (!accessToken) {
      return res.status(401).json({ error: 'No authorization header provided' });
    }

    const config = {
      method,
      url: `${GMAIL_API_BASE}${endpoint}`, // endpoint should start with /users/me/...
      headers: {
        Authorization: accessToken,
        'Content-Type': 'application/json',
      },
      params,
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    res.json(response.data);
  } catch (error) {
    console.error(`Error forwarding to ${endpoint}:`, error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: 'Internal Server Error' });
  }
};

// Get Profile
router.get('/users/me/profile', (req, res) => {
  forwardRequest(req, res, 'GET', '/users/me/profile');
});

// Get History
router.get('/users/me/history', (req, res) => {
  forwardRequest(req, res, 'GET', '/users/me/history', null, req.query);
});

// Get Messages List
router.get('/users/me/messages', (req, res) => {
  forwardRequest(req, res, 'GET', '/users/me/messages', null, req.query);
});

// Get Message Details
router.get('/users/me/messages/:id', (req, res) => {
  forwardRequest(req, res, 'GET', `/users/me/messages/${req.params.id}`);
});

// Get Attachment
router.get('/users/me/messages/:messageId/attachments/:attachmentId', (req, res) => {
  forwardRequest(req, res, 'GET', `/users/me/messages/${req.params.messageId}/attachments/${req.params.attachmentId}`);
});

// Modify Message (Mark as read, etc.)
router.post('/users/me/messages/:id/modify', (req, res) => {
  forwardRequest(req, res, 'POST', `/users/me/messages/${req.params.id}/modify`, req.body);
});

// Create Draft
router.post('/users/me/drafts', (req, res) => {
  forwardRequest(req, res, 'POST', '/users/me/drafts', req.body);
});

// Send Email
router.post('/users/me/messages/send', (req, res) => {
  forwardRequest(req, res, 'POST', '/users/me/messages/send', req.body);
});

module.exports = router;
