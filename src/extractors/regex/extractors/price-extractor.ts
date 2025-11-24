/**
 * Price Extractor
 * Extracts price from text and returns in cents (integer)
 */

/**
 * Extract price from text and return in cents (integer)
 *
 * Priority 1: Prices with "por" keyword (final price)
 * Priority 2: Generic R$ prices (ignoring discounts)
 *
 * @param text - Message text to extract price from
 * @returns Price in cents, or null if no price found
 *
 * @example
 * extractPrice("por 818,10 no pix") // => 81810
 * extractPrice("R$ 25,73") // => 2573
 * extractPrice("cupom de R$80 OFF") // => null (ignores discount)
 */
export function extractPrice(text: string): number | null {
  const prices: number[] = [];

  // Priority 1: Price with "por" keyword (final price)
  const porPattern = /por\s+(?:R\$\s*)?(\d+(?:[.,]\d+)*)/gi;
  const porMatches = text.matchAll(porPattern);

  for (const match of porMatches) {
    if (match[1]) {
      const priceStr = match[1].replace(/\./g, '').replace(',', '.');
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        prices.push(Math.round(price * 100));
      }
    }
  }

  if (prices.length > 0) {
    return Math.min(...prices);
  }

  // Priority 2: Generic R$ prices (ignore discounts)
  const pricePattern = /(?<!cupom de\s)(?<!desconto de\s)R\$\s*(\d+(?:[.,]\d+)*)(?!\s*OFF)/gi;
  const priceMatches = text.matchAll(pricePattern);

  for (const match of priceMatches) {
    if (match[1]) {
      const priceStr = match[1].replace(/\./g, '').replace(',', '.');
      const price = parseFloat(priceStr);
      if (!isNaN(price) && price > 0) {
        prices.push(Math.round(price * 100));
      }
    }
  }

  return prices.length > 0 ? Math.min(...prices) : null;
}
