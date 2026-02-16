const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/classify', aiController.classify);
router.post('/summary', aiController.summary);
router.post('/replies', aiController.replies);
router.post('/todo', aiController.extractTodo);
router.post('/search', aiController.search);
router.get('/models', aiController.getModels);

// File Upload Configuration
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

router.post('/chat', upload.single('file'), aiController.chat);
router.post('/intent', aiController.detectIntent);

module.exports = router;
