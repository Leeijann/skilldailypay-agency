/**
 * Jake — Brain (Core Agent Loop)
 * The think -> decide -> act -> reflect loop.
 *
 * Uses AISA API (OpenAI-compatible) with gpt-4.1-mini.
 * Maintains conversation history, calls tools, and returns structured logs.
 */

import { env } from "../../config/env";
import { buildSystemPrompt } from "./soul";
import { TOOL_DEFINITIONS, executeTool, type ToolDefinition } from "./tools";
import { loadState, updateState, type ToolCallLog } from "./state";

// ═══════════════════════════════════════
//  Types
// ═══════════════════════════════════════

interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

interface AISAResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface CycleResult {
  response: string;
  toolCalls: ToolCallLog[];
  iterations: number;
  totalTokens: number;
}

// ═══════════════════════════════════════
//  Brain — Agent Loop
// ═══════════════════════════════════════

const MAX_ITERATIONS = 10;
const MODEL = "gpt-4.1-mini";

export class JakeBrain {
  private messages: ChatMessage[] = [];
  private systemPrompt: string;

  constructor() {
    this.systemPrompt = buildSystemPrompt();
    this.messages = [
      { role: "system", content: this.systemPrompt },
    ];
  }

  /**
   * Refresh the system prompt (e.g. after memory updates).
   */
  refreshSystemPrompt(): void {
    this.systemPrompt = buildSystemPrompt();
    if (this.messages.length > 0 && this.messages[0].role === "system") {
      this.messages[0].content = this.systemPrompt;
    }
  }

  /**
   * Get current conversation history (for session logging).
   */
  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  /**
   * Clear conversation history (keep system prompt).
   */
  reset(): void {
    this.systemPrompt = buildSystemPrompt();
    this.messages = [
      { role: "system", content: this.systemPrompt },
    ];
  }

  /**
   * Main agent loop: think -> decide -> act -> reflect.
   * Sends a user message (or autonomous prompt) and iterates until
   * the model responds without tool calls or hits the iteration budget.
   */
  async run(userMessage: string): Promise<CycleResult> {
    this.messages.push({ role: "user", content: userMessage });

    const toolCallLogs: ToolCallLog[] = [];
    let iterations = 0;
    let totalTokens = 0;
    let finalResponse = "";

    while (iterations < MAX_ITERATIONS) {
      iterations++;

      // ── Call AISA API ──
      const response = await this.callAISA();

      if (response.usage) {
        totalTokens += response.usage.total_tokens;
      }

      const choice = response.choices?.[0];
      if (!choice) {
        finalResponse = "(No response from model)";
        break;
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: choice.message.content,
      };

      // ── If the model wants to call tools ──
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        assistantMessage.tool_calls = choice.message.tool_calls;
        this.messages.push(assistantMessage);

        // Execute each tool call
        for (const toolCall of choice.message.tool_calls) {
          const fnName = toolCall.function.name;
          let fnArgs: Record<string, any> = {};
          try {
            fnArgs = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            fnArgs = {};
          }

          console.log(`  [brain] Calling tool: ${fnName}(${JSON.stringify(fnArgs).slice(0, 100)})`);

          const start = Date.now();
          const result = await executeTool(fnName, fnArgs);
          const durationMs = Date.now() - start;

          toolCallLogs.push({
            tool: fnName,
            args: fnArgs,
            result: result.slice(0, 500),
            timestamp: new Date().toISOString(),
            durationMs,
          });

          // Add tool result to conversation
          this.messages.push({
            role: "tool",
            content: result,
            tool_call_id: toolCall.id,
            name: fnName,
          });
        }

        // Continue the loop — model will see tool results and decide next
        continue;
      }

      // ── No tool calls — model is done thinking ──
      finalResponse = choice.message.content || "";
      this.messages.push(assistantMessage);
      break;
    }

    // If we exhausted iterations, the last message is a tool result.
    // Ask the model to summarize.
    if (iterations >= MAX_ITERATIONS && !finalResponse) {
      this.messages.push({
        role: "user",
        content: "You've reached the maximum number of tool calls for this cycle. Please summarize what you accomplished and what still needs to be done.",
      });
      const summaryResponse = await this.callAISA();
      finalResponse = summaryResponse.choices?.[0]?.message?.content || "(Max iterations reached — no summary)";
      this.messages.push({ role: "assistant", content: finalResponse });
      if (summaryResponse.usage) totalTokens += summaryResponse.usage.total_tokens;
    }

    // Update state
    const state = loadState();
    updateState({
      lastRun: new Date().toISOString(),
      lastCycleResult: finalResponse.slice(0, 500),
      totalCyclesRun: state.totalCyclesRun + 1,
      totalToolCalls: state.totalToolCalls + toolCallLogs.length,
    });

    return {
      response: finalResponse,
      toolCalls: toolCallLogs,
      iterations,
      totalTokens,
    };
  }

  /**
   * Call the AISA API with current conversation + tools.
   */
  private async callAISA(): Promise<AISAResponse> {
    const body: any = {
      model: MODEL,
      messages: this.messages.map(m => {
        const msg: any = { role: m.role, content: m.content };
        if (m.tool_calls) msg.tool_calls = m.tool_calls;
        if (m.tool_call_id) msg.tool_call_id = m.tool_call_id;
        if (m.name) msg.name = m.name;
        return msg;
      }),
      tools: TOOL_DEFINITIONS,
      tool_choice: "auto",
      temperature: 0.7,
      max_tokens: 1000,
    };

    const res = await fetch(`${env.aisa.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.aisa.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`AISA API ${res.status}: ${errText.slice(0, 300)}`);
    }

    return res.json() as Promise<AISAResponse>;
  }
}
