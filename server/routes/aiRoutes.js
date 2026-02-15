const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

router.post('/classify', aiController.classify);
router.post('/summary', aiController.summary);
router.post('/replies', aiController.replies);
router.get('/models', aiController.getModels);

module.exports = router;
