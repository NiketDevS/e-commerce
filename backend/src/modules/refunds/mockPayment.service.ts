/**
 * MockPaymentService — simulates a payment gateway.
 *
 * In production, this would be replaced by a real payment API (Razorpay, Stripe, etc.)
 * The interface contract is what matters for the application to function.
 *
 * NEVER connects to real payment rails.
 */

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  failureReason?: string;
}

export class MockPaymentService {
  /**
   * Simulates refund execution.
   * Always succeeds in this mock — a real implementation would call the payment gateway.
   * Returns a fake transaction ID for audit purposes.
   */
  async executeRefund(params: {
    refundId: string;
    orderId: string;
    amount: string;
    reason: string;
  }): Promise<PaymentResult> {
    // Simulate processing delay (10ms in mock)
    await new Promise((resolve) => setTimeout(resolve, 10));

    // Mock always succeeds. In tests, this can be spied on and made to throw.
    return {
      success: true,
      transactionId: `mock-txn-${params.refundId.slice(-8)}-${Date.now()}`,
    };
  }
}

export const mockPaymentService = new MockPaymentService();
