const mpesaService = require('../services/mpesaService');

// Simple in-memory store for transaction statuses
// In production, use a database (Redis/Postgres/Mongo)
const transactions = new Map();

class PaymentController {
  async stkPush(req, res) {
    try {
      const { phoneNumber, amount } = req.body;

      if (!phoneNumber || !amount) {
        return res.status(400).json({ error: 'Phone number and amount are required' });
      }

      const result = await mpesaService.initiateSTKPush(phoneNumber, amount);
      
      // Store the checkout request ID with pending status
      if (result.CheckoutRequestID) {
        transactions.set(result.CheckoutRequestID, {
          status: 'PENDING',
          phoneNumber,
          amount,
          timestamp: new Date()
        });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('STK Push Error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async callback(req, res) {
    try {
      console.log('M-Pesa Callback received');
      const { Body } = req.body;

      if (Body && Body.stkCallback) {
        const { CheckoutRequestID, ResultCode, ResultDesc } = Body.stkCallback;
        
        console.log(`Processing callback for ${CheckoutRequestID}: ${ResultCode} - ${ResultDesc}`);

        const status = ResultCode === 0 ? 'COMPLETED' : 'FAILED';
        
        // Update transaction status
        if (transactions.has(CheckoutRequestID)) {
            const transaction = transactions.get(CheckoutRequestID);
            transactions.set(CheckoutRequestID, {
                ...transaction,
                status,
                resultDesc: ResultDesc,
                updatedAt: new Date()
            });
            console.log(`Transaction ${CheckoutRequestID} updated to ${status}`);
        } else {
            // Store it anyway if we missed the init (unlikely but possible)
            transactions.set(CheckoutRequestID, {
                status,
                resultDesc: ResultDesc,
                timestamp: new Date()
            });
        }
      }

      res.json({ result: 'ok' });
    } catch (error) {
      console.error('Callback Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  async checkStatus(req, res) {
    try {
      const { checkoutRequestId } = req.params;
      
      if (!transactions.has(checkoutRequestId)) {
        return res.status(404).json({ status: 'NOT_FOUND' });
      }

      const transaction = transactions.get(checkoutRequestId);
      res.json({ status: transaction.status, data: transaction });
    } catch (error) {
        console.error('Check Status Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = new PaymentController();
