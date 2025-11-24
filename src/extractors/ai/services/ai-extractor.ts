import type {
  AbacusRequest,
  AbacusResponse,
  AIExtractedData,
  LLMProvider,
} from '../types';
import type { ExtractRequest, ExtractResponse } from '~/types';
import { config } from '~/config';
import { EXTRACTION_SYSTEM_PROMPT } from '../prompts/system-prompt';
import {
  AIAPIError,
  AIParsingError,
} from '../types';
import { withRetry, RETRY_PRESETS } from '../utils/retry';

/**
 * Abacus AI Extractor Service
 * Implements LLMProvider interface using Abacus API (RouteLL M)
 */

export default class AIExtractorService implements LLMProvider {
  readonly name = 'abacus';

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;

  constructor() {
    if (!config.ABACUS_API_KEY) {
      throw new Error('ABACUS_API_KEY is required for AI extractor');
    }
    this.apiKey = config.ABACUS_API_KEY;
    this.model = config.ABACUS_MODEL;
    this.baseUrl = config.ABACUS_BASE_URL;
    this.timeoutMs = config.ABACUS_TIMEOUT_MS;
  }

  /**
   * Check if Abacus provider is properly configured
   */
  isConfigured(): boolean {
    return Boolean(
      this.apiKey &&
      this.model &&
      this.baseUrl &&
      config.LLM_PROVIDER === 'abacus',
    );
  }

  async extract(input: ExtractRequest): Promise<ExtractResponse> {
    const { text } = input;

    // Wrap the entire extraction in retry logic
    return withRetry(
      async () => {
        const payload = this.buildPayload(text);
        const rawResponse = await this.callAPI(payload);
        const extractedData = this.parseResponse(rawResponse);
        const result = this.transformToResponse(extractedData, text);
        return result;
      },
      RETRY_PRESETS.STANDARD, // 3 attempts: 1s, 2s, 4s
    );
  }

  /**
   * Build the API request payload
   */
  private buildPayload(text: string): AbacusRequest {
    return {
      model: this.model,
      messages: [
        {
          role: 'system',
          content: EXTRACTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      response_format: { type: 'json_object' },
    };
  }

  /**
   * Call Abacus API with timeout
   */
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
        throw new AIAPIError('No content in Abacus response', 500);
      }

      return content;
    } catch (error) {
      if (error instanceof AIAPIError) {
        throw error;
      }
      if ((error as Error).name === 'AbortError') {
        throw new AIAPIError(`Request timeout after ${this.timeoutMs}ms`, 408);
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

  /**
   * Parse JSON response from LLM
   * Handles responses wrapped in ```json blocks
   */
  private parseResponse(content: string): AIExtractedData {
    try {
      // Try to extract JSON from markdown code blocks first
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;

      const parsed = JSON.parse(jsonStr) as AIExtractedData;

      // Validate required fields
      if (typeof parsed.text !== 'string') {
        throw new Error('Missing or invalid "text" field');
      }

      return parsed;
    } catch (error) {
      throw new AIParsingError(
        `Failed to parse AI response: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Transform AI extracted data to standard ExtractResponse format
   */
  private transformToResponse(extracted: AIExtractedData, originalText: string): ExtractResponse {
    return {
      text: extracted.text || originalText,
      description: extracted.description || null,
      product: extracted.product || null,
      store: extracted.store || null,
      price: extracted.price,
      coupons: extracted.coupons.map(c => ({
        code: c.code,
        discount: c.discount || undefined,
      })),
    };
  }
}
