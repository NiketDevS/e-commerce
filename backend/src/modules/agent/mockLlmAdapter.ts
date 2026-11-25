import type {
  AgentContextState,
  AgentIntent,
  ILLMAdapter,
  IntentResult,
  ToolResult,
} from './agent.types';
import { mockIntentClassifier } from './intentClassifier';
import { mockResponseGenerator } from './responseGenerator';

/**
 * Deterministic MockLLMAdapter — default provider (no paid API key required).
 * Can be swapped for an OpenAI or Gemini adapter implementing ILLMAdapter.
 */
export class MockLLMAdapter implements ILLMAdapter {
  async classifyIntent(latestMessage: string, context: AgentContextState): Promise<IntentResult> {
    return mockIntentClassifier.classify(latestMessage, context);
  }

  async generateResponse(
    intent: AgentIntent,
    toolResults: ToolResult[],
    missingField?: string,
  ): Promise<string> {
    return mockResponseGenerator.generate(intent, toolResults, missingField);
  }
}
