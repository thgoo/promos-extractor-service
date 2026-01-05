/**
 * Type definitions for AI Extractor
 * Includes LLM provider abstraction and implementation-specific types
 */

import type { ExtractRequest, ExtractResponse } from '~/types';

// ============================================================================
// LLM Provider Abstraction
// ============================================================================

/**
 * Generic LLM Provider Interface
 * All LLM providers (Abacus, OpenAI, Anthropic, etc.) must implement this
 */
export interface LLMProvider {
  /**
   * Extract structured data from text using AI
   * @throws {AIExtractionError} When extraction fails
   */
  extract(input: ExtractRequest): Promise<ExtractResponse>;

  /**
   * Provider name for logging/monitoring
   */
  readonly name: string;

  /**
   * Check if provider is properly configured and ready
   */
  isConfigured(): boolean;
}

/**
 * Provider configuration options
 */
export interface LLMProviderConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Supported LLM provider types
 */
export type LLMProviderType = 'abacus' | 'openai' | 'anthropic' | 'ollama';

// ============================================================================
// Abacus-specific Types
// ============================================================================

/**
 * Abacus API Message Format
 * Compatible with OpenAI Chat Completions API
 */
export interface AbacusMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Abacus API Request Payload
 */
export interface AbacusRequest {
  model: string;
  messages: AbacusMessage[];
  response_format: { type: 'json' };
  temperature?: number;
  max_tokens?: number;
}

/**
 * Abacus API Response Format
 */
export interface AbacusResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Internal structure returned by AI extraction
 * This is the raw format from the LLM before transformation
 */
export interface AIExtractedData {
  text: string;
  description: string | null;
  product: string | null;
  store: string | null;
  price: number | null;
  coupons: {
    code: string;
    discount: string | null;
  }[];
  productKey: string | null;
  category: string | null;
}

/**
 * AI Extractor Error Types
 */
export class AIExtractionError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'AIExtractionError';
  }
}

export class AIParsingError extends AIExtractionError {
  constructor(message: string, cause?: Error) {
    super(message, cause);
    this.name = 'AIParsingError';
  }
}

export class AIAPIError extends AIExtractionError {
  constructor(message: string, statusCode: number, cause?: Error) {
    super(message, cause, statusCode);
    this.name = 'AIAPIError';
  }
}
