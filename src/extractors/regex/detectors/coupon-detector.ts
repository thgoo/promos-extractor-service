/**
 * Coupon Detector
 * Detects and extracts coupon codes from text
 */

import { isValidCouponCode } from '../validators/coupon-validator';

export interface Coupon {
  code: string;
  discount?: string;
  description?: string;
  expiresAt?: string;
  url?: string;
}

export interface CouponDetectionResult {
  isCoupon: boolean;
  coupons: Coupon[];
}

/**
 * Detect if a message contains coupons and extract them
 *
 * Supports two patterns:
 * 1. Explicit: "cupom: CODE" or "cupom CODE"
 * 2. Standalone: "🎫 CODE" (emoji + code)
 *
 * @param text - Message text to analyze
 * @returns Detection result with found coupons
 *
 * @example
 * detectCoupons("cupom: HARDMOB8") // => { isCoupon: true, coupons: [{ code: "HARDMOB8", ... }] }
 * detectCoupons("🎫 VGA11") // => { isCoupon: true, coupons: [{ code: "VGA11", ... }] }
 */
export function detectCoupons(text: string): CouponDetectionResult {
  const result: CouponDetectionResult = {
    isCoupon: false,
    coupons: [],
  };

  // Normalize text (remove multiple spaces, line breaks, etc)
  const normalizedText = text.replace(/\s+/g, ' ').trim();

  // Pattern 1: "cupom: CODE" or "cupom CODE"
  // Accepts multiple coupons separated by /, , or "ou"
  // "cupom" is case-insensitive (i flag), but codes must be uppercase [A-Z0-9]
  // Uses word boundary (\b) to ensure "cupom" is a complete word
  // Two sub-patterns:
  //   1. "cupom:" (with colon) - capture code after colon
  //   2. "cupom CODE" (no colon) - only if CODE is at end of line/followed by non-word chars
  const couponPattern = /\bcupom\s*:?\s*([A-Z0-9]{3,}(?:\s*(?:[/,]|ou)\s*[A-Z0-9]{3,})*)/gi;

  const matches = normalizedText.matchAll(couponPattern);

  for (const match of matches) {
    const codesString = match[1];
    if (!codesString) continue;

    // Split multiple coupons (ex: "HARDMOB8 / PROMOBR08" or "CUPOM1 ou CUPOM2")
    const codes = codesString.split(/[/,]|\s+ou\s+/i).map(c => c.trim()).filter(c => c.length > 0);

    for (const code of codes) {
      // Validate if code appears valid (3-20 characters, alphanumeric)
      if (isValidCouponCode(code)) {
        // Avoid duplicates
        if (!result.coupons.some(c => c.code === code)) {
          result.coupons.push({
            code,
          });
        }
      }
    }
  }

  // Pattern 2: Standalone coupon with emoji (ex: "🎫 VGA11" or "🎟 CUPOM: CODE")
  // Detects lines starting with coupon/ticket emoji followed by code
  // Also handles "emoji CUPOM: CODE" format
  const standalonePattern = /(?:^|\n)\s*(?:🎫|🎟️|🎟|💳)\s*(?:cupom\s*:?\s*)?([A-Z0-9]{3,20})(?:\s|$)/gmui;
  const standaloneMatches = text.matchAll(standalonePattern);

  for (const match of standaloneMatches) {
    const code = match[1];
    if (code && isValidCouponCode(code)) {
      // Avoid duplicates
      if (!result.coupons.some(c => c.code === code)) {
        result.coupons.push({
          code,
        });
      }
    }
  }

  result.isCoupon = result.coupons.length > 0;
  return result;
}
