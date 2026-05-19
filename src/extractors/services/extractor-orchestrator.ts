import type { LLMProvider } from '../ai/types';
import type { Logger } from '~/logger';
import type { ExtractRequest, ExtractResponse } from '~/types';

export default class ExtractorOrchestrator {
  constructor(
    private readonly aiProvider: LLMProvider,
    private readonly logger: Logger,
  ) {}

  async extract(input: ExtractRequest): Promise<ExtractResponse> {
    const { messageId, chat, text } = input;
    const start = Date.now();

    this.logger.info('Extraction started', {
      messageId,
      chat,
      textLength: text.length,
      provider: this.aiProvider.name,
    });

    const result = await this.aiProvider.extract(input);

    this.logger.info('Extraction completed', {
      messageId,
      provider: this.aiProvider.name,
      durationMs: Date.now() - start,
      hasProduct: result.product !== null,
      hasStore: result.store !== null,
      hasPrice: result.price !== null,
      hasProductKey: result.productKey !== null,
      couponsCount: result.coupons.length,
      category: result.category,
    });

    return result;
  }

  getStrategy(): { primary: string } {
    return { primary: `ai-${this.aiProvider.name}` };
  }
}
