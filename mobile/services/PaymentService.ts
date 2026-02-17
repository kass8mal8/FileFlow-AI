import { API_BASE_URL } from '../utils/constants';
import { Alert } from 'react-native';

class PaymentService {
  private BASE_URL = API_BASE_URL;

  /**
   * Simulate STK Push for M-Pesa payment
   * @param phoneNumber The phone number to bill
   * @param amount The amount to charge (default 50 KES)
   * @param email User's email to link payment to account
   */
  async initiateSTKPush(phoneNumber: string, amount: number = 50, email?: string): Promise<any> {
    try {
      console.log(`Initiating STK Push to ${phoneNumber} for KES ${amount}`);
      
      const response = await fetch(`${this.BASE_URL}/payments/stk-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          phoneNumber,
          amount,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment request failed');
      }

      console.log("STK Push initiated successfully", data);
      return data.data?.CheckoutRequestID || data.data; 
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
      if (!checkoutRequestId || typeof checkoutRequestId !== 'string') {
        return { status: 'INVALID_ID' };
      }
      const response = await fetch(`${this.BASE_URL}/payments/status/${checkoutRequestId}`, {
        headers: {
          'ngrok-skip-browser-warning': 'true',
        }
      });
      
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        return await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON response received:", text.substring(0, 100));
        return { status: 'ERROR', data: 'Server returned non-JSON response' };
      }
    } catch (error) {
      console.error("Polling failed", error);
      return { status: 'ERROR' };
    }
  }
}

export default new PaymentService();
