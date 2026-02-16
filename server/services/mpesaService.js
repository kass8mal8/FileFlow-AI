const axios = require('axios');
require('dotenv').config();

class MpesaService {
  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    this.passkey = process.env.MPESA_PASSKEY;
    this.shortcode = process.env.MPESA_SHORTCODE;
    this.env = process.env.MPESA_ENV || 'sandbox'; // sandbox or production
    this.baseUrl = this.env === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';
  }

  async getAccessToken() {
    const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
    try {
      const response = await axios.get(`${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });
      return response.data.access_token;
    } catch (error) {
      console.error('Error generating access token:', error.response?.data || error.message);
      throw new Error('Failed to generate M-Pesa access token');
    }
  }

  async initiateSTKPush(phoneNumber, amount, accountReference = 'FileFlow Pro') {
    try {
      console.log('Generating Auth Token...');
      const token = await this.getAccessToken();
      console.log('Auth Token Generated');
      
      const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
      const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');
  
      // Format phone number to 254...
      let formattedPhone = phoneNumber.replace(/^\+/, '').replace(/^0/, '254');
      
      const transactionType = process.env.MPESA_TRANSACTION_TYPE || 'CustomerPayBillOnline';
      
      const payload = {
        BusinessShortCode: this.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: transactionType,
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: this.shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: `${process.env.APP_URL}/api/payments/callback`,
        AccountReference: transactionType === 'CustomerBuyGoodsOnline' ? formattedPhone : accountReference,
        TransactionDesc: 'Pro Subscription Payment',
      };
  
      console.log('Sending STK Push Payload:', JSON.stringify(payload, null, 2));

      const response = await axios.post(`${this.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('STK Push Response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error initiating STK push:', error.response?.data || error.message);
      throw new Error('Failed to initiate STK push');
    }
  }
}


module.exports = new MpesaService();
