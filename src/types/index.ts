/**
 * Type definitions for the extractor service
 * Aligned with backend (hono-boilerplate) format
 */

export interface ExtractRequest {
  text: string;
  chat: string;
  messageId: number;
  links: string[];
}

export interface Coupon {
  code: string;
  discount?: string;
  description?: string;
  expiresAt?: string;
  url?: string;
}

export interface ExtractResponse {
  text: string;                // Cleaned text (without promotional footers)
  description: string | null;  // Channel owner's comment (e.g., "OLHA O COMBOOO!")
  product: string | null;      // Product name
  store: string | null;        // Store/brand name
  price: number | null;        // Price in cents
  coupons: Coupon[];           // Array of coupons
  productKey: string | null;   // Unique identifier for the product
  category: string | null;     // Product category
}

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
  llmProvider: string;
}
