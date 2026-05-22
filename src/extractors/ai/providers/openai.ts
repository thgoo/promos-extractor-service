import type { ChatCompletionRequest, ChatCompletionResponse, LLMProvider } from '../types';
import type { Logger } from '~/logger';
import type { ExtractRequest, ExtractResponse } from '~/types';
import { extractionSchema } from '~/extractors/schemas';
import { EXTRACTION_SYSTEM_PROMPT } from '../prompts/system-prompt';
import { AIAPIError, AIParsingError } from '../types';
import { withRetry, RETRY_PRESETS } from '../utils/retry';

export interface OpenAIProviderConfig {
  apiKey: string;
  model: string;
  timeoutMs: number;
  baseUrl?: string;
  logger?: Logger;
}

const BASE_URL = 'https://api.openai.com/v1/chat/completions';

export default class OpenAIProvider implements LLMProvider {
  readonly name = 'openai';
  readonly model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly logger?: Logger;

  constructor(config: OpenAIProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.baseUrl = config.baseUrl ?? BASE_URL;
    this.timeoutMs = config.timeoutMs;
    this.logger = config.logger;
  }

  async extract(input: ExtractRequest): Promise<ExtractResponse> {
    const { text, links } = input;
    return withRetry(async () => {
      const payload = this.buildPayload(text, links);
      const rawResponse = await this.callAPI(payload);
      return this.parseResponse(rawResponse, text);
    }, RETRY_PRESETS.AGGRESSIVE);
  }

  private buildPayload(text: string, links: string[]): ChatCompletionRequest {
    const linksContext = links.length > 0
      ? `\n\n[Links expandidos: ${links.join(', ')}]`
      : '';

    return {
      model: this.model,
      messages: [
        { role: 'system', content: EXTRACTION_SYSTEM_PROMPT },
        { role: 'user', content: text + linksContext },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 1024,
    };
  }

  private async callAPI(payload: ChatCompletionRequest): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new AIAPIError(
          `OpenAI API error (${response.status}): ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
          response.status,
        );
      }

      const data = await response.json() as ChatCompletionResponse;
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new AIAPIError('Empty response from OpenAI API', 500);
      }

      if (data.usage) {
        this.logger?.debug('OpenAI token usage', {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
          cachedTokens: data.usage.prompt_tokens_details?.cached_tokens ?? 0,
        });
      }

      return content;
    } catch (error) {
      if (error instanceof AIAPIError) throw error;
      if ((error as Error).name === 'AbortError') {
        throw new AIAPIError(`Request timed out after ${this.timeoutMs}ms`, 408);
      }
      throw new AIAPIError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        0,
        error instanceof Error ? error : undefined,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private parseResponse(content: string, fallbackText: string): ExtractResponse {
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;

      // LLM occasionally omits the text field despite prompt instructions
      if (!parsed['text']) parsed['text'] = fallbackText;

      const result = extractionSchema.safeParse(parsed);
      if (!result.success) {
        throw new AIParsingError(
          `Invalid AI response structure: ${JSON.stringify(result.error.issues)}`,
        );
      }

      return result.data;
    } catch (error) {
      if (error instanceof AIParsingError) throw error;
      throw new AIParsingError(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }
}
