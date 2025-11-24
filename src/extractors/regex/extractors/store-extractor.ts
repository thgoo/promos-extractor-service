/**
 * Store Extractor
 * Extracts store/retailer name from text
 */

/**
 * Extract store name from text
 *
 * Matches against common store patterns and names
 *
 * @param text - Message text to extract store from
 * @returns Store name or null
 *
 * @example
 * extractStore("Amazon - Só no app\n30% off") // => "Amazon"
 * extractStore("🏪 Mercado Livre") // => "Mercado Livre"
 */
export function extractStore(text: string): string | null {
  const storePatterns = [
    /(?:^|\n)\s*(Amazon|Mercado Livre|Magalu|Magazine Luiza|Americanas|Shopee|AliExpress|Kabum|Pichau|Nike|Adidas|Netshoes)/i,
    /🏪\s*([^\n]+)/,
  ];

  for (const pattern of storePatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return null;
}
