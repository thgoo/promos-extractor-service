export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  llmProvider: string;
}

export type { Category, Coupon, ExtractRequest, ExtractResponse } from '~/extractors/schemas';
