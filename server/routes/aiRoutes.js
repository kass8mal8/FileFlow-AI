const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const feedbackController = require('../controllers/feedbackController');

router.post('/classify', aiController.classify);
router.post('/summary', aiController.summary);
router.post('/replies', aiController.replies);
router.post('/todo', aiController.extractTodo);
router.post('/search', aiController.search);
router.get('/models', aiController.getModels);

// NEW: Comprehensive Analysis (uses EmailAnalysis model)
router.post('/analyze', aiController.analyzeEmail);

// Feedback routes
router.post('/feedback', feedbackController.submitFeedback);
router.get('/feedback/analytics', feedbackController.getAnalytics);

// File Upload Configuration
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/chat', upload.single('file'), aiController.chat);
router.post('/intent', aiController.detectIntent);
router.post('/recap', aiController.getRecap);

module.exports = router;
