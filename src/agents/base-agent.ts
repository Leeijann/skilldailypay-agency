/**
 * BaseAgent — abstract class all agency agents extend.
 * Handles Claude API calls, memory injection, WAL logging, and error handling.
 */

import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config/env";
import { getModelForTask, getTokenBudget } from "../config/models";
import { logEntry } from "../memory/wal-logger";
import { getAgentContext, remember } from "../memory/elms-layers";

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({ apiKey: env.anthropic.apiKey });
  }
  return _client;
}

export interface AgentConfig {
  name: string;
  department: string;
  role: string;
  systemPrompt: string;
  defaultTaskKey: string;
}

export interface TaskResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
  tokenCost?: number;
}

export abstract class BaseAgent {
  protected config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  get name() {
    return this.config.name;
  }
  get department() {
    return this.config.department;
  }

  /** Build the full system prompt with memory context injected */
  protected buildSystemPrompt(): string {
    const memoryContext = getAgentContext(this.config.name);
    return `${this.config.systemPrompt}\n\n${memoryContext}`;
  }

  /** Call Claude with the agent's system prompt and a user message */
  async call(
    userMessage: string,
    taskKey?: string
  ): Promise<string> {
    const key = taskKey || this.config.defaultTaskKey;
    const model = getModelForTask(key);
    const maxTokens = getTokenBudget(key);

    const walEntry = logEntry(this.config.name, this.config.department, key, "in_progress", {
      input: { message: userMessage.slice(0, 200) },
    });

    try {
      const response = await getClient().messages.create({
        model,
        max_tokens: maxTokens,
        system: this.buildSystemPrompt(),
        messages: [{ role: "user", content: userMessage }],
      });

      const text =
        response.content[0].type === "text" ? response.content[0].text : "";

      const tokenCost =
        (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

      logEntry(this.config.name, this.config.department, key, "completed", {
        output: { response: text.slice(0, 500) },
        tokenCost,
      });

      return text;
    } catch (err: any) {
      logEntry(this.config.name, this.config.department, key, "failed", {
        error: err.message || String(err),
      });
      throw err;
    }
  }

  /** Execute a structured task — override in subclasses for specific workflows */
  abstract execute(task: string, params?: Record<string, unknown>): Promise<TaskResult>;

  /** Store a learned memory from this agent */
  protected learn(key: string, value: string, tags: string[] = []) {
    remember("learned", this.config.name, key, value, tags);
  }

  /** Store an episodic memory (expires in given hours) */
  protected noteEpisodic(key: string, value: string, ttlHours = 24) {
    remember("episodic", this.config.name, key, value, [], ttlHours);
  }
}
