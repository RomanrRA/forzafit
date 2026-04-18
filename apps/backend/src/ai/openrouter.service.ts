import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface OpenRouterTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
}

// Events yielded by streamCompletion
export type OpenRouterEvent =
  | { type: 'token'; content: string }
  | { type: 'tool_call'; toolCall: ToolCall }
  | { type: 'done' };

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
}

@Injectable()
export class OpenRouterService {
  private readonly logger = new Logger(OpenRouterService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('OPENROUTER_API_KEY') ?? '';
    this.baseUrl = this.config.get<string>('OPENROUTER_BASE_URL') ?? 'https://openrouter.ai/api/v1';
    this.model = this.config.get<string>('AI_MODEL') ?? 'openai/gpt-5.4-nano';
  }

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'HTTP-Referer': 'https://forzafit.ru',
      'X-Title': 'FitLog',
      'Content-Type': 'application/json',
    };
  }

  async *streamCompletion(params: {
    messages: ChatMessage[];
    tools?: OpenRouterTool[];
  }): AsyncIterable<OpenRouterEvent> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: params.messages,
      stream: true,
    };
    if (params.tools?.length) {
      body.tools = params.tools;
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${text}`);
    }

    if (!response.body) {
      throw new Error('No response body from OpenRouter');
    }

    // Accumulate tool_call fragments by index
    const toolCallAccumulator: Record<number, {
      id: string;
      type: 'function';
      function: { name: string; arguments: string };
    }> = {};

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last (potentially incomplete) line in buffer
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') {
            if (trimmed === 'data: [DONE]') {
              // Emit any accumulated tool calls before done
              for (const tc of Object.values(toolCallAccumulator)) {
                yield { type: 'tool_call', toolCall: tc as ToolCall };
              }
              yield { type: 'done' };
              return;
            }
            continue;
          }
          if (!trimmed.startsWith('data: ')) continue;

          const jsonStr = trimmed.slice(6);
          let parsed: any;
          try {
            parsed = JSON.parse(jsonStr);
          } catch {
            this.logger.warn(`Failed to parse SSE chunk: ${jsonStr}`);
            continue;
          }

          const delta = parsed?.choices?.[0]?.delta;
          if (!delta) continue;

          // Text token
          if (delta.content) {
            yield { type: 'token', content: delta.content };
          }

          // Tool call fragments
          if (delta.tool_calls) {
            for (const fragment of delta.tool_calls) {
              const idx: number = fragment.index ?? 0;
              if (!toolCallAccumulator[idx]) {
                toolCallAccumulator[idx] = {
                  id: fragment.id ?? '',
                  type: 'function',
                  function: { name: '', arguments: '' },
                };
              }
              const acc = toolCallAccumulator[idx];
              if (fragment.id) acc.id = fragment.id;
              if (fragment.function?.name) acc.function.name += fragment.function.name;
              if (fragment.function?.arguments) acc.function.arguments += fragment.function.arguments;
            }
          }

          const finishReason = parsed?.choices?.[0]?.finish_reason;
          if (finishReason === 'tool_calls' || finishReason === 'stop') {
            for (const tc of Object.values(toolCallAccumulator)) {
              yield { type: 'tool_call', toolCall: tc as ToolCall };
            }
            yield { type: 'done' };
            return;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Flush any remaining tool calls if stream ended without explicit finish_reason
    for (const tc of Object.values(toolCallAccumulator)) {
      yield { type: 'tool_call', toolCall: tc as ToolCall };
    }
    yield { type: 'done' };
  }

  async completion(params: {
    messages: ChatMessage[];
    tools?: OpenRouterTool[];
  }): Promise<OpenRouterResponse> {
    const body: Record<string, unknown> = {
      model: this.model,
      messages: params.messages,
      stream: false,
    };
    if (params.tools?.length) {
      body.tools = params.tools;
      body.tool_choice = 'auto';
    }

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${text}`);
    }

    return response.json() as Promise<OpenRouterResponse>;
  }
}
