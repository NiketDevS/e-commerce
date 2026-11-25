import type { AgentIntent, ToolResult } from './agent.types';

/**
 * ResponseGenerator — produces customer-facing responses grounded strictly in tool results.
 * Never fabricates refund approvals, order details, or policy rules.
 */
export class MockResponseGenerator {
  generate(intent: AgentIntent, toolResults: ToolResult[], missingField?: string): string {
    if (missingField === 'orderNumber') {
      return 'Please share your order ID (for example, `ORD-1001`) so I can check the order details and refund eligibility.';
    }

    const orderResult = toolResults.find((t) => t.tool === 'get_order_details');
    const policyResult = toolResults.find((t) => t.tool === 'search_return_policy');
    const refundResult = toolResults.find((t) => t.tool === 'process_refund');
    const escalationResult = toolResults.find((t) => t.tool === 'escalate_to_human');

    // Order lookup failed
    if (orderResult && !orderResult.success) {
      return `${orderResult.error} Please double-check the order number and try again.`;
    }

    // Refund attempt result
    if (refundResult) {
      if (refundResult.success && refundResult.data) {
        const status = refundResult.data.status as string;
        const amount = refundResult.data.amount as string;
        const escalationId = refundResult.data.escalationId as string | null;

        if (status === 'SUCCEEDED') {
          return `Your refund of ₹${amount} has been approved and processed (Refund ID: ${refundResult.data.refundId}). The amount will be credited to your original payment method within 3–7 business days.`;
        }
        if (status === 'PENDING_REVIEW' || escalationId) {
          return `Your refund request of ₹${amount} exceeds our ₹5,000 automatic approval limit, so I have escalated it to our human support team for review (Escalation ID: ${escalationId}). You will receive an update once a support agent reviews your request.`;
        }
        return `Your refund request of ₹${amount} has been recorded with status: ${status}.`;
      }

      // Refund failed (e.g., expired return window, amount exceeded, etc.)
      return `I checked your order, but your refund could not be processed: ${refundResult.error}`;
    }

    // Human escalation requested
    if (escalationResult) {
      if (escalationResult.success && escalationResult.data) {
        return `I have escalated this ticket to our human support team (Escalation ID: ${escalationResult.data.escalationId}). A support specialist will review your conversation and respond shortly.`;
      }
      return `I tried to escalate your ticket, but encountered an error: ${escalationResult.error}`;
    }

    // Order inquiry with order details
    if (intent === 'ORDER_INQUIRY' && orderResult?.success && orderResult.data) {
      const d = orderResult.data;
      const deliveredStr = d.deliveryDate
        ? `Delivered on ${new Date(d.deliveryDate as string).toLocaleDateString()}`
        : 'Not yet delivered';
      return `Here are the details for order **${d.orderNumber}** (${d.productName}):\n- Status: ${d.status}\n- ${deliveredStr}\n- Total Amount: ₹${d.totalAmount}`;
    }

    // Policy inquiry
    if (intent === 'POLICY_INQUIRY' && policyResult?.success && policyResult.data) {
      const sections = (policyResult.data.sections as Array<{ title: string; content: string }>) ?? [];
      if (sections.length > 0) {
        const summary = sections.map((s) => `**${s.title}**\n${s.content}`).join('\n\n');
        return `Here is what our return policy states:\n\n${summary}`;
      }
    }

    return 'How can I help you today? You can ask me about your order status, our return policy, or request a refund by sharing your order ID (e.g., ORD-1001).';
  }
}

export const mockResponseGenerator = new MockResponseGenerator();
