import type { AbacusRequest, AbacusResponse, LLMProvider } from '../types';
import type { ExtractRequest, ExtractResponse } from '~/types';
import { config } from '~/config';
import { extractionSchema } from '~/extractors/schemas';
import { EXTRACTION_SYSTEM_PROMPT } from '../prompts/system-prompt';
import { AIAPIError, AIParsingError } from '../types';
import { withRetry, RETRY_PRESETS } from '../utils/retry';

export default class AIExtractorService implements LLMProvider {
  readonly name = 'abacus';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    if (!config.ABACUS_API_KEY) {
      throw new Error('ABACUS_API_KEY is required');
    }
    this.apiKey = config.ABACUS_API_KEY;
    this.model = config.ABACUS_MODEL;
    this.baseUrl = config.ABACUS_BASE_URL;
    this.timeoutMs = config.ABACUS_TIMEOUT_MS;
  }

  async extract(input: ExtractRequest): Promise<ExtractResponse> {
    const { text, links } = input;
    return withRetry(async () => {
      const payload = this.buildPayload(text, links);
      const rawResponse = await this.callAPI(payload);
      return this.parseResponse(rawResponse, text);
    }, RETRY_PRESETS.AGGRESSIVE);
  }

  private buildPayload(text: string, links: string[]): AbacusRequest {
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

  private async callAPI(payload: AbacusRequest): Promise<string> {
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
          `Abacus API error (${response.status}): ${response.statusText}${errorBody ? ` - ${errorBody}` : ''}`,
          response.status,
        );
      }

      const data = await response.json() as AbacusResponse;
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new AIAPIError('Empty response from Abacus API', 500);
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
