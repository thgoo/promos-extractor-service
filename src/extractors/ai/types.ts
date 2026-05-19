import type { ExtractRequest, ExtractResponse } from '~/types';

export interface LLMProvider {
  readonly name: string;
  extract(input: ExtractRequest): Promise<ExtractResponse>;
}

export interface AbacusMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AbacusRequest {
  model: string;
  messages: AbacusMessage[];
  response_format: { type: 'json_object' };
  temperature?: number;
  max_tokens?: number;
}

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
