import { contextManager } from './contextManager';
import { MockLLMAdapter } from './mockLlmAdapter';
import { toolRouter } from './toolRouter';
import type { AgentContextState, ILLMAdapter, ToolResult } from './agent.types';

export class SupportAgentService {
  private llm: ILLMAdapter;

  constructor(llmAdapter?: ILLMAdapter) {
    this.llm = llmAdapter ?? new MockLLMAdapter();
  }

  /**
   * Processes a customer message for a ticket:
   * 1. Load conversation context
   * 2. Classify intent & extract entities
   * 3. Check for missing required entities (e.g., orderNumber) -> ask clarification, NO premature tool calls
   * 4. Execute allowlisted backend tools
   * 5. Persist updated context & return grounded AI response
   */
  async processMessage(
    ticketId: string,
    authenticatedUserId: string,
    latestMessage: string,
  ): Promise<string> {
    const loaded = await contextManager.loadContext(ticketId);
    if (!loaded) {
      return 'I could not find this support ticket. Please try again.';
    }

    const { ticket, state } = loaded;

    // 1. Classify intent & extract entities
    const classification = await this.llm.classifyIntent(latestMessage, state);
    const intent = classification.intent;

    // Merge newly extracted entities with persisted conversation context
    const mergedOrderNumber = classification.entities.orderNumber ?? state.orderNumber;
    const mergedAmount = classification.entities.amount ?? state.amount;
    const mergedReason = classification.entities.reason ?? state.reason ?? ticket.description;

    const updatedState: AgentContextState = {
      ...state,
      pendingIntent: intent,
      orderNumber: mergedOrderNumber,
      amount: mergedAmount,
      reason: mergedReason,
    };

    const toolResults: ToolResult[] = [];

    // 2. Route by intent
    if (intent === 'REFUND_REQUEST') {
      // Critical invariant: if orderNumber is missing, ask clarification and DO NOT call order/refund tools
      if (!mergedOrderNumber) {
        await contextManager.saveContext(ticketId, updatedState);
        return this.llm.generateResponse(intent, [], 'orderNumber');
      }

      // Fetch order details (ownership enforced inside ToolRouter)
      const orderResult = await toolRouter.getOrderDetails(mergedOrderNumber, authenticatedUserId);
      toolResults.push(orderResult);

      if (orderResult.success && orderResult.data) {
        // Also retrieve return policy for context
        const category = (orderResult.data.category as string) ?? 'return';
        const policyResult = await toolRouter.searchReturnPolicy(category);
        toolResults.push(policyResult);

        // Determine refund amount: use requested amount if provided, else full order total
        const amountToRefund = mergedAmount ?? (orderResult.data.totalAmount as string);
        const refundResult = await toolRouter.processRefund({
          authenticatedUserId,
          orderId: orderResult.data.id as string,
          ticketId,
          amount: amountToRefund,
          reason: mergedReason || 'Customer requested refund via support chat',
        });
        toolResults.push(refundResult);
        updatedState.lastToolUsed = 'process_refund';
        // Clear pending intent once refund attempt completes
        updatedState.pendingIntent = undefined;
      }
    } else if (intent === 'ORDER_INQUIRY') {
      if (!mergedOrderNumber) {
        await contextManager.saveContext(ticketId, updatedState);
        return this.llm.generateResponse(intent, [], 'orderNumber');
      }
      const orderResult = await toolRouter.getOrderDetails(mergedOrderNumber, authenticatedUserId);
      toolResults.push(orderResult);
      updatedState.lastToolUsed = 'get_order_details';
    } else if (intent === 'POLICY_INQUIRY') {
      const query = classification.entities.category ?? latestMessage;
      const policyResult = await toolRouter.searchReturnPolicy(query);
      toolResults.push(policyResult);
      updatedState.lastToolUsed = 'search_return_policy';
    } else if (intent === 'ESCALATION_REQUEST') {
      const escalationResult = await toolRouter.escalateToHuman({
        ticketId,
        summary: `Customer requested human support: "${latestMessage.slice(0, 200)}"`,
        priority: 'MEDIUM',
        actorId: authenticatedUserId,
      });
      toolResults.push(escalationResult);
      updatedState.lastToolUsed = 'escalate_to_human';
      updatedState.pendingIntent = undefined;
    }

    await contextManager.saveContext(ticketId, updatedState);

    return this.llm.generateResponse(intent, toolResults);
  }
}

export const supportAgentService = new SupportAgentService();
