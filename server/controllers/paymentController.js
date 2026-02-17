const mpesaService = require('../services/mpesaService');
const Transaction = require('../models/Transaction');
const userService = require('../services/userService');

class PaymentController {
  async stkPush(req, res) {
    try {
      const { phoneNumber, amount, email } = req.body;

      if (!phoneNumber || !amount || !email) {
        return res.status(400).json({ error: 'Phone number, amount, and email are required' });
      }

      const result = await mpesaService.initiateSTKPush(phoneNumber, amount);
      
      // Persist transaction to DB
      if (result.CheckoutRequestID) {
        await Transaction.create({
          checkoutRequestId: result.CheckoutRequestID,
          merchantRequestId: result.MerchantRequestID,
          phoneNumber,
          email,
          amount,
          status: 'PENDING'
        });
        console.log(`Transaction created: ${result.CheckoutRequestID} for ${email}`);
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
        const { CheckoutRequestID, ResultCode, ResultDesc, CallbackMetadata } = Body.stkCallback;
        
        console.log(`Processing callback for ${CheckoutRequestID}: ${ResultCode} - ${ResultDesc}`);

        const status = ResultCode === 0 ? 'COMPLETED' : 'FAILED';
        
        // Find and update transaction
        const transaction = await Transaction.findOne({ checkoutRequestId: CheckoutRequestID });

        if (transaction) {
          let mpesaReceiptNumber = null;
          
          // Extract receipt number if successful
          if (CallbackMetadata && CallbackMetadata.Item) {
             const receiptItem = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber');
             if (receiptItem) mpesaReceiptNumber = receiptItem.Value;
          }

          transaction.status = status;
          transaction.resultDesc = ResultDesc;
          transaction.resultCode = ResultCode;
          if (mpesaReceiptNumber) transaction.mpesaReceiptNumber = mpesaReceiptNumber;
          
          await transaction.save();
          console.log(`Transaction ${CheckoutRequestID} updated to ${status}`);
            
            // If successful, update User Subscription
            if (status === 'COMPLETED' && transaction.email) {
               const associatedUser = await userService.updateSubscription(transaction.email, 'PRO', 'active');
               console.log(`✅ Subscription activated for ${transaction.email}`);
            }

        } else {
            console.warn(`Transaction not found for ID: ${CheckoutRequestID}`);
            // Optionally create a detached record for audit
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
      
      const transaction = await Transaction.findOne({ checkoutRequestId });
      
      if (!transaction) {
        return res.status(404).json({ status: 'NOT_FOUND' });
      }

      res.json({ status: transaction.status, data: transaction });
    } catch (error) {
        console.error('Check Status Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

module.exports = new PaymentController();
