/**
 * Coupon Validator
 * Validates coupon codes
 */

/**
 * Validate if a coupon code appears valid
 *
 * Rules:
 * - Must be between 3 and 20 characters
 * - Must be alphanumeric (letters + numbers)
 * - Cannot be only numbers (e.g., "123" is probably not a coupon)
 *
 * @param code - Coupon code to validate
 * @returns true if code appears valid, false otherwise
 *
 * @example
 * isValidCouponCode("HARDMOB8") // => true
 * isValidCouponCode("VGA11") // => true
 * isValidCouponCode("123") // => false (only numbers)
 * isValidCouponCode("AB") // => false (too short)
 */
export function isValidCouponCode(code: string): boolean {
  if (code.length < 3 || code.length > 20) return false;
  if (!/^[A-Z0-9]+$/.test(code)) return false;
  if (/^\d+$/.test(code)) return false;
  return true;
}
