const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/stk-push', paymentController.stkPush);
router.post('/callback', paymentController.callback);
router.get('/status/:checkoutRequestId', paymentController.checkStatus);

module.exports = router;
