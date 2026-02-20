/**
 * Extractor Orchestrator
 * Coordinates AI extraction with retry logic
 */

import type { LLMProvider } from '../ai/types';
import type { Logger } from '~/logger';
import type { ExtractRequest, ExtractResponse } from '~/types';
import { AIExtractionError } from '../ai/types';

/**
 * Orchestrates extraction using AI with automatic retry on failure
 */
export default class ExtractorOrchestrator {
  constructor(
    private readonly aiProvider: LLMProvider,
    private readonly logger: Logger,
  ) { }

  /**
   * Extract data using AI with automatic retry on failure
   */
  async extract(input: ExtractRequest): Promise<ExtractResponse> {
    const { messageId, chat, text } = input;

    this.logger.info('Extract request received', {
      messageId,
      chat,
      textLength: text.length,
    });

    if (!this.aiProvider.isConfigured()) {
      throw new Error('AI provider is not configured');
    }

    try {
      const result = await this.aiProvider.extract(input);

      this.logger.info('AI extraction successful', {
        messageId,
        provider: this.aiProvider.name,
      });

      this.logExtractionResult(messageId, this.aiProvider.name, result);
      return result;
    } catch (error) {
      this.logger.error('AI extraction failed', {
        messageId,
        provider: this.aiProvider.name,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof AIExtractionError ? error.name : 'UnknownError',
      });

      // Re-throw the error to be handled by the caller
      throw error;
    }
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
  getStrategy(): { primary: string } {
    return {
      primary: `ai-${this.aiProvider.name}`,
    };
  }
}
