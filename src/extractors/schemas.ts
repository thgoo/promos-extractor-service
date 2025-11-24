/**
 * Extractor schemas
 * Zod schemas for request/response validation
 * Aligned with backend (hono-boilerplate) format
 */

import { z } from 'zod';

export const extractRequestSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  chat: z.string().min(1, 'Chat is required'),
  messageId: z.number().int().positive(),
  links: z.array(z.string().url()).default([]),
});

export const couponSchema = z.object({
  code: z.string(),
  discount: z.string().optional(),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
  url: z.string().optional(),
});

export const extractResponseSchema = z.object({
  text: z.string(),
  description: z.string().nullable(),
  product: z.string().nullable(),
  store: z.string().nullable(),
  price: z.number().nullable(),
  coupons: z.array(couponSchema),
});

export type ExtractRequestInput = z.infer<typeof extractRequestSchema>;
export type ExtractResponseOutput = z.infer<typeof extractResponseSchema>;
