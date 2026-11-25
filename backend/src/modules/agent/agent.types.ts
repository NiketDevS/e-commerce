export type AgentIntent =
  | 'REFUND_REQUEST'
  | 'ORDER_INQUIRY'
  | 'POLICY_INQUIRY'
  | 'ESCALATION_REQUEST'
  | 'GENERAL';

export interface ExtractedEntities {
  orderNumber?: string;
  amount?: string;
  reason?: string;
  category?: string;
}

export interface IntentResult {
  intent: AgentIntent;
  entities: ExtractedEntities;
  confidence: number;
}

export interface AgentContextState {
  pendingIntent?: AgentIntent;
  orderNumber?: string;
  amount?: string;
  reason?: string;
  lastToolUsed?: string;
}

export interface ToolResult {
  tool: 'get_order_details' | 'search_return_policy' | 'process_refund' | 'escalate_to_human';
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  errorCode?: string;
}

export interface ILLMAdapter {
  classifyIntent(latestMessage: string, context: AgentContextState): Promise<IntentResult>;
  generateResponse(
    intent: AgentIntent,
    toolResults: ToolResult[],
    missingField?: string,
  ): Promise<string>;
}
