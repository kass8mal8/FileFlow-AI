
import { Alert } from 'react-native';

class PaymentService {
  /**
   * Simulate STK Push for M-Pesa payment
   * @param phoneNumber The phone number to bill
   * @param amount The amount to charge (default 50 KES)
   */
  // Base URL from environment or default to localhost for development
  // NOTE: For physical devices, use your computer's IP address or ngrok/tunnel URL
  private API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://192.168.100.18:3001/api';

  /**
   * Simulate STK Push for M-Pesa payment
   * @param phoneNumber The phone number to bill
   * @param amount The amount to charge (default 50 KES)
   */
  async initiateSTKPush(phoneNumber: string, amount: number = 50): Promise<any> {
    try {
      console.log(`Initiating STK Push to ${phoneNumber} for KES ${amount}`);
      
      const response = await fetch(`${this.API_BASE_URL}/payments/stk-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment request failed');
      }

      console.log("STK Push initiated successfully", data);
      return data.data; // Should contain CheckoutRequestID
    } catch (error) {
      console.error("Payment failed", error);
      Alert.alert("Payment Failed", (error as Error).message || "Could not initiate M-Pesa payment. Please try again.");
      return false;
    }
  }

  /**
   * Poll for payment status
   * @param checkoutRequestId The ID to check
   */
  async pollPaymentStatus(checkoutRequestId: string): Promise<{ status: string; data?: any }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/payments/status/${checkoutRequestId}`);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error("Polling failed", error);
      return { status: 'ERROR' };
    }
  }
}

export default new PaymentService();
