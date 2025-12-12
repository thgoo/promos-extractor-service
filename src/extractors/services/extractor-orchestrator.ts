/**
 * Extractor Orchestrator
 * Coordinates AI extraction with regex fallback
 */

import type { LLMProvider } from '../ai/types';
import type RegexExtractorService from '../regex/services/regex-extractor';
import type { Logger } from '~/logger';
import type { ExtractRequest, ExtractResponse } from '~/types';
import { AIExtractionError } from '../ai/types';

/**
 * Orchestrates extraction using AI with automatic fallback to regex
 */
export default class ExtractorOrchestrator {
  constructor(
    private readonly aiProvider: LLMProvider | null,
    private readonly regexExtractor: RegexExtractorService,
    private readonly logger: Logger,
  ) {}

  /**
   * Extract data using AI with automatic fallback to regex on failure
   */
  async extract(input: ExtractRequest): Promise<ExtractResponse> {
    const { messageId, chat, text } = input;

    this.logger.info('Extract request received', {
      messageId,
      chat,
      textLength: text.length,
    });

    // Try AI extraction first if provider is available and configured
    if (this.aiProvider?.isConfigured()) {
      try {
        const result = await this.aiProvider.extract(input);

        this.logger.info('AI extraction successful', {
          messageId,
          provider: this.aiProvider.name,
        });

        this.logExtractionResult(messageId, this.aiProvider.name, result);
        return result;
      } catch (error) {
        this.logger.warn('AI extraction failed, falling back to regex', {
          messageId,
          provider: this.aiProvider.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorType: error instanceof AIExtractionError ? error.name : 'UnknownError',
        });
      }
    }

    // Fallback to regex extraction
    const result = this.regexExtractor.extract(input);
    this.logExtractionResult(messageId, 'regex', result);
    return result;
  }

  /**
   * Log extraction result details
   */
  private logExtractionResult(
    messageId: number,
    extractor: string,
    result: ExtractResponse,
  ): void {
    this.logger.info('Extract completed', {
      messageId,
      extractor,
      couponsCount: result.coupons.length,
      hasPrice: result.price !== null,
      hasProduct: result.product !== null,
      hasStore: result.store !== null,
      hasProductKey: result.productKey !== null,
    });
  }

  /**
   * Get current extraction strategy info
   */
  getStrategy(): { primary: string; fallback: string } {
    const primary = this.aiProvider?.isConfigured()
      ? `ai-${this.aiProvider.name}`
      : 'regex';

    return {
      primary,
      fallback: 'regex',
    };
  }
}
